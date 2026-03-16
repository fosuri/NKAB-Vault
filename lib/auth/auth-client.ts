import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
});

export const signInWithGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/profile",
  });
};

export const signUpWithEmail = async (credentials: { email: string; password: string; name: string }) => {
  return await authClient.signUp.email(credentials);
};

export const signInWithEmail = async (credentials: { email: string; password: string }) => {
  return await authClient.signIn.email(credentials);
};

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
