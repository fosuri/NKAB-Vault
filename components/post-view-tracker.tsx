"use client";

import { useEffect } from "react";
import { incrementPostViewsAction } from "@/lib/actions/post-views";

/**
 * Post View Tracker Component (Headless).
 * 
 * Silently records a view for the post when a registered user visits the page.
 * Uses a useEffect hook to trigger a fire-and-forget server action on mount.
 */
export function PostViewTracker({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId?: string;
}) {
  useEffect(() => {
    // Only track views for authenticated users to maintain data quality
    if (!currentUserId) {
      return;
    }

    void incrementPostViewsAction(postId);
  }, [postId, currentUserId]);

  return null; // Component does not render any UI
}
