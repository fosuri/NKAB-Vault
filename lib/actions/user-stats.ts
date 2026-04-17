"use server";

import { getUserAccountStatistics, getPostsByUserId } from "@/lib/posts";

export async function fetchUserStatsAction(userId: string) {
  const stats = await getUserAccountStatistics(userId);
  const posts = await getPostsByUserId(userId);
  return {
    stats,
    postsCount: posts.length,
  };
}
