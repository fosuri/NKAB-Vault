import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Client-side authentication interface for social and credential-based flows.
 */

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
});

/**
 * Initiates an OAuth2 flow with Google.
 */
export const signInWithGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/profile",
  });
};

/**
 * Registers a new account using email credentials.
 */
export const signUpWithEmail = async (credentials: { email: string; password: string; name: string }) => {
  return await authClient.signUp.email(credentials);
};

/**
 * Authenticates an existing user via email credentials.
 */
export const signInWithEmail = async (credentials: { email: string; password: string }) => {
  return await authClient.signIn.email(credentials);
};

/**
 * Terminates the current session and manages UI redirection.
 */
export const signOut = async (router: ReturnType<typeof useRouter>) => {
  return await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        toast.success("Signed out successfully");
        router.push("/");
      },
      onError: (ctx) => {
        toast.error(ctx.error.message);
      },
    },
  });
};
