"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recoverCommentAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

/**
 * Recover Comment Button (Staff Only).
 * Clears the soft-delete flag on a specific comment to restore it under the post.
 */
export function StaffRecoverCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await recoverCommentAction(commentId);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Comment recovered and restored");
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      className="ml-auto h-7 px-2.5 text-xs border border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <RotateCcw className="size-3" />
      )}
      {confirming && !isPending ? "Confirm" : "Recover"}
    </Button>
  );
}
