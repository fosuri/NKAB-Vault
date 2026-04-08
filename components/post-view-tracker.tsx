"use client";

import { useEffect } from "react";
import { incrementPostViewsAction } from "@/lib/actions/post-views";

export function PostViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const storageKey = `post-viewed:${postId}`;

    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    sessionStorage.setItem(storageKey, "1");
    void incrementPostViewsAction(postId);
  }, [postId]);

  return null;
}
