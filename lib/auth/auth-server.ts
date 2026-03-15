import {betterAuth} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import * as schema from "@/lib/db/auth-schema"
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  socialProviders: {
    google: { 
      clientId: process.env.GOOGLE_CLIENT_ID as string, 
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
    }, 
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()]

});

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
