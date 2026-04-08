"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { toggleReactionAction } from "@/lib/actions/reactions";

type ReactionType = "like" | "dislike";

export function PostReactions({
  postId,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  currentUserId,
}: {
  postId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: ReactionType | null;
  currentUserId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(initialUserReaction);

  const handleReaction = (type: ReactionType) => {
    if (!currentUserId) {
      toast.error("You must be signed in to react");
      return;
    }

    const prevReaction = userReaction;
    const prevLike = likeCount;
    const prevDislike = dislikeCount;

    if (prevReaction === type) {
      setUserReaction(null);
      if (type === "like") setLikeCount((c) => c - 1);
      else setDislikeCount((c) => c - 1);
    } else {
      setUserReaction(type);
      if (type === "like") {
        setLikeCount((c) => c + 1);
        if (prevReaction === "dislike") setDislikeCount((c) => c - 1);
      } else {
        setDislikeCount((c) => c + 1);
        if (prevReaction === "like") setLikeCount((c) => c - 1);
      }
    }

    startTransition(async () => {
      const result = await toggleReactionAction(postId, type);
      if (result.error) {
        setUserReaction(prevReaction);
        setLikeCount(prevLike);
        setDislikeCount(prevDislike);
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleReaction("like")}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          userReaction === "like"
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <ThumbsUp className="size-4" />
        {likeCount}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleReaction("dislike")}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          userReaction === "dislike"
            ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <ThumbsDown className="size-4" />
        {dislikeCount}
      </button>
    </div>
  );
}
