"use client";

import { useEffect } from "react";
import { incrementPostViewsAction } from "@/lib/actions/post-views";

export function PostViewTracker({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId?: string;
}) {
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    void incrementPostViewsAction(postId);
  }, [postId, currentUserId]);

  return null;
}
