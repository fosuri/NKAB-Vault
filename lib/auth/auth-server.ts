import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import * as schema from "@/lib/db/auth-schema";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import { ensureDefaultRoles } from "@/lib/db/ensure-roles";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);
const resendFrom = process.env.RESEND_FROM || "nkab@resend.dev";

await ensureDefaultRoles();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    // disableSessionRefresh: true,
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
      if (ctx.path === "/sign-in/email") {
        const body = ctx.body as { email?: string };
        if (body?.email) {
          const userRecord = await db.query.user.findFirst({
            where: eq(schema.user.email, body.email),
          });

          if (userRecord) {
            // @ts-ignore
            const returned = ctx.context.returned || ctx.returned;
            const isError = returned instanceof APIError || (returned && returned.status && returned.status !== 200) || (returned && returned.error);

            if (isError) {
              const newAttempts = (userRecord.failedLoginAttempts || 0) + 1;
              let newLockedUntil = userRecord.lockedUntil;

              if (newAttempts >= 5) {
                newLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
              }

              await db.update(schema.user).set({ failedLoginAttempts: newAttempts, lockedUntil: newLockedUntil }).where(eq(schema.user.id, userRecord.id));
            } else {
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

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}