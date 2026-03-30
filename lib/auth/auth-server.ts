import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import * as schema from "@/lib/db/auth-schema";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import { ensureDefaultRoles } from "@/lib/db/ensure-roles";

const resend = new Resend(process.env.RESEND_API_KEY);
const resendFrom = process.env.RESEND_FROM || "nkab@resend.dev";

await ensureDefaultRoles();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
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
    },
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
