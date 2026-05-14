"use client";

import { useState } from "react";
import { PostPasswordGate } from "@/components/post-password-gate";

interface PostContentWrapperProps {
  postId: string;
  hasPassword: boolean;
  isOwner: boolean;
  children: React.ReactNode;
}

/**
 * Post Content Wrapper.
 * Acts as a security gateway for password-protected posts.
 * Prevents children (comments, media, text) from rendering until the post is unlocked.
 */
export function PostContentWrapper({
  postId,
  hasPassword,
  isOwner,
  children,
}: PostContentWrapperProps) {
  // Logic: Owners and non-protected posts bypass the gate immediately.
  const [unlocked, setUnlocked] = useState(isOwner || !hasPassword);

  if (!unlocked) {
    return (
      <PostPasswordGate postId={postId} onUnlocked={() => setUnlocked(true)} />
    );
  }

  return <>{children}</>;
}

