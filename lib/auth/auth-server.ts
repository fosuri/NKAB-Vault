import {betterAuth} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import * as schema from "@/lib/db/auth-schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
