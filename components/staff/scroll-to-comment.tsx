"use client";

import { useEffect } from "react";

/**
 * Scrolls to a specific comment element by ID after the page mounts.
 * Used on the staff review page to jump to a targeted deleted comment.
 */
export function ScrollToComment({ commentId }: { commentId: string }) {
  useEffect(() => {
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [commentId]);

  return null;
}
