"use server";

import { getUserAccountStatistics, getPostsByUserId } from "@/lib/posts";

/**
 * Aggregates analytical data for user profiles.
 */

/**
 * Retrieves comprehensive activity metrics and post counts for a specific user.
 */
export async function fetchUserStatsAction(userId: string) {
  // 1. Fetch relational totals (likes, comments, dislikes)
  const stats = await getUserAccountStatistics(userId);
  
  // 2. Fetch full post list to determine total content volume
  const posts = await getPostsByUserId(userId);

  return {
    stats,
    postsCount: posts.length,
  };
}
