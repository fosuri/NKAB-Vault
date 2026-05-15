"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recoverPostAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

/**
 * Recover Post Button (Staff Only).
 * Clears the soft-delete flag on the post to make it publicly visible again.
 */
export function StaffRecoverPostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await recoverPostAction(postId);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Post recovered and restored to public feed");
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      className="border-emerald-500/60 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RotateCcw className="size-4" />
      )}
      {confirming && !isPending ? "Confirm recover" : "Recover post"}
    </Button>
  );
}
