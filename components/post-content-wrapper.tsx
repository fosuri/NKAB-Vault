"use client";

import { useState } from "react";
import { PostPasswordGate } from "@/components/post-password-gate";

interface PostContentWrapperProps {
  postId: string;
  hasPassword: boolean;
  isOwner: boolean;
  children: React.ReactNode;
}

export function PostContentWrapper({
  postId,
  hasPassword,
  isOwner,
  children,
}: PostContentWrapperProps) {
  const [unlocked, setUnlocked] = useState(isOwner || !hasPassword);

  if (!unlocked) {
    return (
      <PostPasswordGate postId={postId} onUnlocked={() => setUnlocked(true)} />
    );
  }

  return <>{children}</>;
}
