"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deletePost } from "@/lib/actions/delete-post";
import { ROLES, type RoleId } from "@/lib/db/auth-schema";
import { Button } from "@/components/ui/button";

/**
 * Delete Post Button.
 * Handles post removal with a two-step confirmation to prevent accidental deletions.
 * Permissions: 
 * - Admins: Unrestricted deletion.
 * - Moderators: Can only delete posts authored by regular users.
 * - Authors: Can delete their own content.
 */
export function DeletePostButton({
  postId,
  redirectTo,
  actorRoleId,
  authorRoleId,
}: {
  postId: string;
  redirectTo?: string;
  actorRoleId?: RoleId;
  authorRoleId?: RoleId;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  // Permission Gating: Enforce moderation hierarchy
  const canDelete =
    actorRoleId !== ROLES.MODERATOR || authorRoleId === ROLES.USER || !authorRoleId;

  if (!canDelete) {
    return null;
  }

  /**
   * Click Handler:
   * First click enters 'confirming' state; second click executes the deletion.
   */
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
      onBlur={() => setConfirming(false)} // Reset confirmation if focus is lost
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

