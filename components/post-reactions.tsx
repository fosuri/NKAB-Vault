"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { toggleReactionAction } from "@/lib/actions/reactions";
import { Button } from "./ui/button";

type ReactionType = "like" | "dislike";

/**
 * Post Reactions Component.
 * 
 * Manages like/dislike interactions for a post using an optimistic UI approach.
 * Changes are reflected immediately in the local state while the server 
 * request is processed in the background.
 */
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
  // UI transitions for non-blocking server interaction
  const [isPending, startTransition] = useTransition();
  
  // State mirroring the server data, updated optimistically
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(initialUserReaction);

  /**
   * Main reaction handler.
   * Orchestrates local state changes before committing to the server.
   */
  const handleReaction = (type: ReactionType) => {
    // Auth check: Reactions require an active session
    if (!currentUserId) {
      toast.error("You must be signed in to react");
      return;
    }

    // Backup state for potential rollback on server failure
    const prevReaction = userReaction;
    const prevLike = likeCount;
    const prevDislike = dislikeCount;

    // Step 1: Optimistic State Transition Logic
    if (prevReaction === type) {
      // Toggle off if clicking the same reaction
      setUserReaction(null);
      if (type === "like") setLikeCount((c) => c - 1);
      else setDislikeCount((c) => c - 1);
    } else {
      // Switch reaction or add new reaction
      setUserReaction(type);
      if (type === "like") {
        setLikeCount((c) => c + 1);
        // Remove existing dislike if switching to like
        if (prevReaction === "dislike") setDislikeCount((c) => c - 1);
      } else {
        setDislikeCount((c) => c + 1);
        // Remove existing like if switching to dislike
        if (prevReaction === "like") setLikeCount((c) => c - 1);
      }
    }

    // Step 2: Server Synchronization
    startTransition(async () => {
      const result = await toggleReactionAction(postId, type);
      if (result.error) {
        // Rollback to previous known good state if server request fails
        setUserReaction(prevReaction);
        setLikeCount(prevLike);
        setDislikeCount(prevDislike);
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => handleReaction("like")}
        className={`flex h-8 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${userReaction === "like"
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-500"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
      >
        <ThumbsUp className="size-4" />
        {likeCount}
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => handleReaction("dislike")}
        className={`flex h-8 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${userReaction === "dislike"
          ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:text-rose-500"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
      >
        <ThumbsDown className="size-4" />
        {dislikeCount}
      </Button>
    </div>
  );
}
