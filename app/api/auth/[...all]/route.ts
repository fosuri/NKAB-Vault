import { auth } from "@/lib/auth/auth-server";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Main authentication route handler.
 * Exports GET and POST handlers to process all auth requests via Better Auth.
 */
export const { GET, POST } = toNextJsHandler(auth);
