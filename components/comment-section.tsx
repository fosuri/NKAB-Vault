"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { createComment, deleteComment } from "@/lib/actions/comments";
import { ROLES } from "@/lib/db/auth-schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    roleId?: number;
  } | null;
};

export function CommentSection({
  postId,
  initialComments,
  currentUserId,
  canModerateComments = false,
  actorRoleId,
}: {
  postId: string;
  initialComments: Comment[];
  currentUserId?: string;
  canModerateComments?: boolean;
  actorRoleId?: number;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createComment(postId, trimmed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setBody("");
      const optimistic: Comment = {
        id: crypto.randomUUID(),
        body: trimmed,
        createdAt: new Date(),
        author: currentUserId
          ? { id: currentUserId, name: "You", email: "", image: null }
          : null,
      };
      setComments((prev) => [optimistic, ...prev]);
    });
  }

  function handleDelete(commentId: string) {
    setPendingDelete(commentId);
    startTransition(async () => {
      const result = await deleteComment(commentId, postId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      setPendingDelete(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Comments{" "}
        <span className="text-sm font-normal text-muted-foreground">
          ({comments.length})
        </span>
      </h2>

      {currentUserId ? (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            required
            placeholder="Write a comment…"
            className="min-h-24 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            showCount
          />
          <Button
            type="submit"
            disabled={isPending || !body.trim()}
            className="w-fit"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Post comment"}
          </Button>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          <a href="/sign-in" className="underline underline-offset-4 hover:text-primary">
            Sign in
          </a>{" "}
          to leave a comment.
        </p>
      )}

      {comments.length ? (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="flex gap-3 rounded-2xl border border-border/50 bg-muted/30 p-4"
            >
              <Avatar className="mt-0.5 shrink-0">
                <AvatarFallback>
                  {comment.author?.name?.charAt(0) ??
                    comment.author?.email?.charAt(0) ??
                    "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {comment.author?.name ??
                        comment.author?.email ??
                        "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {currentUserId && (comment.author?.id === currentUserId || (canModerateComments && (actorRoleId !== ROLES.MODERATOR || comment.author?.roleId === ROLES.USER))) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={pendingDelete === comment.id}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete comment"
                    >
                      {pendingDelete === comment.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first!
        </p>
      )}
    </div>
  );
}
