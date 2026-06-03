import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import * as schema from "@/lib/db/auth-schema";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import { ensureDefaults } from "@/lib/db/ensure-defaults";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { eq } from "drizzle-orm";

import argon2 from "argon2";

/**
 * Server-side authentication engine for secure session and account management.
 */

const resend = new Resend(process.env.RESEND_API_KEY);
const resendFrom = process.env.RESEND_FROM || "nkab@resend.dev";

// Ensure required roles and constants exist in the DB before starting
await ensureDefaults();

export const auth = betterAuth({
  advanced: {
    database: {
      generateId: "uuid", // Use UUIDs for better relational security
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // Session valid for 30 days
    updateAge: 60 * 60 * 24, // Refresh session daily
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      setupCompleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      profileDescription: {
        type: "string",
        required: false,
      },
      // Brute-force protection fields
      failedLoginAttempts: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      lockedUntil: {
        type: "date",
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Automatically generate a random username for new OAuth users
        before: async (user) => {
          return {
            data: {
              ...user,
              name: `user_${Math.random().toString(36).substring(2, 11)}`,
            },
          };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 1. Lockout Enforcement: Prevent sign-in if the account is currently locked
      if (ctx.path === "/sign-in/email") {
        const body = ctx.body as { email?: string };
        if (body?.email) {
          const userRecord = await db.query.user.findFirst({
            where: eq(schema.user.email, body.email),
          });
          if (userRecord && userRecord.lockedUntil && userRecord.lockedUntil > new Date()) {
            const timeRemaining = Math.ceil((userRecord.lockedUntil.getTime() - Date.now()) / 60000);
            throw new APIError("UNAUTHORIZED", {
              message: `Account is temporarily locked. Try again in ${timeRemaining} minutes.`,
            });
          }
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // 2. Security Tracking: Manage failed attempt counters after every sign-in attempt
      if (ctx.path === "/sign-in/email") {
        const body = ctx.body as { email?: string };
        if (body?.email) {
          const userRecord = await db.query.user.findFirst({
            where: eq(schema.user.email, body.email),
          });

          if (userRecord) {
            // Determine if the attempt failed based on response context
            // @ts-expect-error ctx.returned
            const returned = ctx.context.returned || ctx.returned;
            const isError = returned instanceof APIError || (returned && returned.status && returned.status !== 200) || (returned && returned.error);

            if (isError) {
              // Increment failure counter and apply lockout if threshold (5) is met
              const newAttempts = (userRecord.failedLoginAttempts || 0) + 1;
              let newLockedUntil = userRecord.lockedUntil;

              if (newAttempts >= 5) {
                newLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minute lockout
              }

              await db.update(schema.user).set({ failedLoginAttempts: newAttempts, lockedUntil: newLockedUntil }).where(eq(schema.user.id, userRecord.id));
            } else {
              // Reset security counters upon successful login
              if ((userRecord.failedLoginAttempts || 0) > 0 || userRecord.lockedUntil) {
                await db.update(schema.user).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(schema.user.id, userRecord.id));
              }
            }
          }
        }
      }
    }),
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => {
        return await argon2.hash(password);
      },
      verify: async ({ hash, password }) => {
        return await argon2.verify(hash, password);
      },
    },
    // Integration with Resend for transactional emails
    sendResetPassword: async ({ user, url }) => {
      const { error } = await resend.emails.send({
        from: resendFrom,
        to: user.email,
        subject: "Reset your password",
        react: ForgotPasswordEmail({
          username: user.name,
          resetUrl: url,
          userEmail: user.email,
        }),
      });

      if (error) {
        console.error("Resend sendResetPassword error:", error);
        throw new Error(error.message || "Failed to send reset password email");
      }
    },
  },
  plugins: [nextCookies()],
});

/**
 * Retrieves the current authenticated session from request headers.
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}