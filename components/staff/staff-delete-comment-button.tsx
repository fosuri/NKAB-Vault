"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteCommentAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function StaffDeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await adminDeleteCommentAction(commentId);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }

      toast.success("Comment deleted");
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      className="ml-auto size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label={confirming ? "Confirm delete comment" : "Delete comment"}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : confirming ? (
        <Check className="size-3.5" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </Button>
  );
}
