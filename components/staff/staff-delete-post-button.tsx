"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminDeletePostAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function StaffDeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await adminDeletePostAction(postId);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }

      toast.success("Post deleted");
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : confirming ? (
        <Check className="size-4" />
      ) : (
        <Trash2 className="size-4" />
      )}
      {confirming && !isPending ? "Confirm delete" : "Delete post"}
    </Button>
  );
}
