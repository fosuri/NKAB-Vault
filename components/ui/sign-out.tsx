"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Signed out successfully");
          router.push("/");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        }
      }
    });
  };

  return (
    <Button onClick={handleSignOut}>
      Sign out
    </Button>
  );
}