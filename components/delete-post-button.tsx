"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deletePost } from "@/lib/actions/delete-post";
import { Button } from "@/components/ui/button";

export function DeletePostButton({
  postId,
  redirectTo,
  authorRole,
  actorRole,
}: {
  postId: string;
  redirectTo?: string;
  authorRole?: string;
  actorRole?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const canDelete =
    actorRole !== "moderator" || authorRole === "user" || !authorRole;

  if (!canDelete) {
    return null;
  }

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Post deleted");
      if (redirectTo) {
        router.push(redirectTo);
      }
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
      ) : (
        <Trash2 className="size-4" />
      )}
      {confirming && !isPending ? "Confirm delete" : "Delete"}
    </Button>
  );
}
