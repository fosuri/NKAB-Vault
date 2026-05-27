import { and, desc, eq, gte, ilike, inArray, or, count, ne, sql, isNull } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { comments, postMedia, postReactions, posts, postViews, user, subscriptions, ACCESS_TYPES, REACTION_TYPES, RESOURCE_TYPES, MEDIA_FORMATS, SUBSCRIPTION_STATUSES, ROLES } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";

/**
 * Core data fetching layer for post-related entities and social engagement.
 */

export type PostTimeFilter = "all" | "24h" | "7d" | "30d" | "365d";
export type PostContentFilter = "all" | "image" | "gif" | "video";

/**
 * Calculates SQL visibility filters based on viewer identity, subscription status, and staff roles.
 */
async function getViewerAccessFilter(viewerUserId?: string, moderationRole?: number) {
  // 1. Anonymous users only see Public content
  if (!viewerUserId) return eq(posts.accessTypeId, ACCESS_TYPES.PUBLIC);

  // 2. Staff members (Admins/Moderators) bypass all visibility restrictions
  if (moderationRole === ROLES.ADMIN || moderationRole === ROLES.MODERATOR) {
    return undefined;
  }

  let baseFilter: any = eq(posts.accessTypeId, ACCESS_TYPES.PUBLIC);

  // 3. Check for active premium subscription to unlock Paid content
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, viewerUserId),
      inArray(subscriptions.statusId, [SUBSCRIPTION_STATUSES.ACTIVE, SUBSCRIPTION_STATUSES.TRIALING])
    ),
  });

  if (sub) {
    baseFilter = inArray(posts.accessTypeId, [ACCESS_TYPES.PUBLIC, ACCESS_TYPES.PAID]);
  }

  // 4. Authors always see their own posts, regardless of visibility settings
  return or(eq(posts.userId, viewerUserId), baseFilter);
}

/**
 * Internal helper to calculate date boundaries for temporal filtering.
 */
function getCreatedAfterDate(time: PostTimeFilter): Date | undefined {
  const now = new Date();

  switch (time) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "365d":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return undefined;
  }
}

/**
 * Retrieves a unique list of Post IDs matching specific media categories.
 */
async function getPostIdsByContentType(contentType: PostContentFilter): Promise<string[] | undefined> {
  if (contentType === "all") return undefined;

  const mediaWhere =
    contentType === "gif"
      ? and(eq(postMedia.resourceTypeId, RESOURCE_TYPES.IMAGE), eq(postMedia.formatId, MEDIA_FORMATS.GIF))
      : eq(postMedia.resourceTypeId, contentType === "video" ? RESOURCE_TYPES.VIDEO : RESOURCE_TYPES.IMAGE);

  const mediaRows = await db
    .select({ postId: postMedia.postId })
    .from(postMedia)
    .where(mediaWhere);

  return Array.from(new Set(mediaRows.map((row) => row.postId)));
}

/**
 * Fetches the main content feed with integrated authorization, temporal, and categorical filtering.
 */
export async function getFeedPosts(
  viewerUserId?: string,
  options: PostFilterOptions = {}
) {
  let moderationState = null;
  if (viewerUserId) {
    moderationState = await getUserModerationState(viewerUserId);
    // Security: Banned users are served an empty feed
    if (moderationState?.activeBan) return [];
  }

  const accessFilter = await getViewerAccessFilter(viewerUserId, moderationState?.roleId);

  const time = options.time ?? "all";
  const contentType = options.contentType ?? "all";
  const createdAfter = getCreatedAfterDate(time);
  const postIdsByType = await getPostIdsByContentType(contentType);

  if (postIdsByType && postIdsByType.length === 0) return [];

  const feedWhere = and(
    accessFilter,
    isNull(posts.deletedByStaffAt),
    createdAfter ? gte(posts.createdAt, createdAfter) : undefined,
    postIdsByType ? inArray(posts.id, postIdsByType) : undefined,
  );

  return await db.query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
    where: feedWhere,
    with: {
      author: {
        columns: { id: true, name: true, image: true, email: true },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
    extras: {
      // Aggregates total view metrics via subquery for performance
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
  });
}

/**
 * Performs a deep text search across post titles, descriptions, and author names.
 */
export async function searchPosts({
  viewerUserId,
  query,
  time = "all",
  contentType = "all",
  limit = 24,
}: PostSearchOptions) {
  let moderationState = null;
  if (viewerUserId) {
    moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) return [];
  }

  const accessFilter = await getViewerAccessFilter(viewerUserId, moderationState?.roleId);

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const createdAfter = getCreatedAfterDate(time);
  const postIdsByType = await getPostIdsByContentType(contentType);

  if (postIdsByType && postIdsByType.length === 0) return [];

  const whereClause = and(
    accessFilter,
    isNull(posts.deletedByStaffAt),
    or(
      ilike(posts.title, `%${trimmedQuery}%`),
      ilike(posts.description, `%${trimmedQuery}%`),
      ilike(user.name, `%${trimmedQuery}%`)
    ),
    createdAfter ? gte(posts.createdAt, createdAfter) : undefined,
    postIdsByType ? inArray(posts.id, postIdsByType) : undefined,
  );

  // 1. Identify matching post IDs first to avoid expensive relational joins on full table
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .leftJoin(user, eq(posts.userId, user.id))
    .where(whereClause)
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const postIds = rows.map((row) => row.id);
  if (!postIds.length) return [];

  // 2. Fetch full post details and media for the identified subset
  return db.query.posts.findMany({
    where: inArray(posts.id, postIds),
    with: {
      author: {
        columns: { id: true, name: true, image: true, email: true, roleId: true },
      },
      media: { orderBy: [postMedia.sortOrder] },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
    orderBy: [desc(posts.createdAt)],
  });
}

/**
 * Retrieves a lightweight set of post previews for real-time search suggestions.
 */
export async function getSearchSuggestions({
  viewerUserId,
  query,
  time = "all",
  contentType = "all",
  limit = 6,
}: PostSearchOptions) {
  const rows = await searchPosts({
    viewerUserId,
    query,
    time,
    contentType,
    limit,
  });

  return rows.map((post) => ({
    id: post.id,
    title: post.title,
    description: post.description,
    createdAt: post.createdAt,
    authorName: post.author?.name ?? post.author?.email ?? "Unknown user",
    previewUrl: post.media[0]
      ? post.media[0].resourceTypeId === RESOURCE_TYPES.VIDEO
        ? post.media[0].secureUrl.replace(/\.[^/.?]+(?=(\?|$))/, ".jpg")
        : post.media[0].secureUrl
      : null,
  }));
}

/**
 * Retrieves all posts authored by a specific user, subject to viewer authorization.
 */
export async function getPostsByUserId(userId: string, viewerUserId?: string) {
  const targetModerationState = await getUserModerationState(userId);
  if (targetModerationState?.activeBan) return [];

  let viewerModerationState = null;
  if (viewerUserId) {
    viewerModerationState = await getUserModerationState(viewerUserId);
    if (viewerModerationState?.activeBan) return [];
  }

  const accessFilter = await getViewerAccessFilter(viewerUserId, viewerModerationState?.roleId);

  return db.query.posts.findMany({
    where: and(eq(posts.userId, userId), accessFilter, isNull(posts.deletedByStaffAt)),
    orderBy: [desc(posts.createdAt)],
    with: {
      media: { orderBy: [postMedia.sortOrder] },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
  });
}

/**
 * Fetches a single post by ID with full engagement metrics (likes, dislikes, reaction state).
 */
export async function getPostAccessById(postId: string) {
  const lightweightPost = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedByStaffAt)),
    columns: { id: true, userId: true, accessTypeId: true, password: true },
  });

  if (!lightweightPost) return null;

  const moderationState = await getUserModerationState(lightweightPost.userId);
  if (moderationState?.activeBan) return null;

  return lightweightPost;
}

/**
 * Fetches a single post by ID with full engagement metrics (likes, dislikes, reaction state).
 */
export async function getPostById(
  postId: string,
  currentUserId?: string,
  options: { includeProtectedContent?: boolean } = {},
) {
  const lightweightPost = await getPostAccessById(postId);

  if (!lightweightPost) return null;

  if (
    lightweightPost.accessTypeId === ACCESS_TYPES.PRIVATE &&
    lightweightPost.password &&
    !options.includeProtectedContent
  ) {
    return null;
  }

  const [post, reactions] = await Promise.all([
    db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: {
          columns: { id: true, name: true, image: true, email: true, roleId: true },
        },
        media: { orderBy: [postMedia.sortOrder] },
        comments: {
          where: isNull(comments.deletedByStaffAt),
          orderBy: [desc(comments.createdAt)],
          with: {
            author: { columns: { id: true, name: true, image: true, email: true, roleId: true } },
          },
        },
      },
      extras: {
        viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
      },
    }),
    db
      .select({ typeId: postReactions.typeId, userId: postReactions.userId })
      .from(postReactions)
      .where(eq(postReactions.postId, postId)),
  ]);

  if (!post) return null;

  // 1. Calculate engagement aggregates
  const likeCount = reactions.filter((r) => r.typeId === REACTION_TYPES.LIKE).length;
  const dislikeCount = reactions.filter((r) => r.typeId === REACTION_TYPES.DISLIKE).length;
  
  // 2. Identify the current viewer's active reaction
  const userReactionId = currentUserId
    ? (reactions.find((r) => r.userId === currentUserId)?.typeId) ?? null
    : null;
  const userReaction = userReactionId === REACTION_TYPES.LIKE ? "like" : userReactionId === REACTION_TYPES.DISLIKE ? "dislike" : null;

  return { ...post, likeCount, dislikeCount, userReaction };
}

/**
 * Retrieves public user profile details.
 */
export async function getUserById(userId: string) {
  return db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, name: true, email: true, image: true },
  });
}

/**
 * Retrieves the collection of posts liked by a specific user.
 */
export async function getLikedPostsByUserId(userId: string, viewerUserId?: string) {
  const liked = await db
    .select({ postId: postReactions.postId })
    .from(postReactions)
    .where(and(eq(postReactions.userId, userId), eq(postReactions.typeId, REACTION_TYPES.LIKE)));

  const postIds = liked.map((r) => r.postId);
  if (!postIds.length) return [];

  let moderationState = null;
  if (viewerUserId) {
    moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) return [];
  }

  const accessFilter = await getViewerAccessFilter(viewerUserId, moderationState?.roleId);

  return db.query.posts.findMany({
    where: and(inArray(posts.id, postIds), accessFilter, isNull(posts.deletedByStaffAt)),
    orderBy: [desc(posts.createdAt)],
    with: {
      author: {
        columns: { id: true, name: true, image: true, email: true, roleId: true },
      },
      media: { orderBy: [postMedia.sortOrder] },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
  });
}

/**
 * Aggregates comprehensive activity statistics for a user's entire content portfolio.
 */
export async function getUserAccountStatistics(userId: string) {
  const userPosts = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.userId, userId), isNull(posts.deletedByStaffAt)));
  const postIds = userPosts.map(p => p.id);

  if (postIds.length === 0) {
    return { views: 0, likes: 0, dislikes: 0, comments: 0 };
  }

  // Orchestrate parallel aggregation of views, reactions, and comments
  const [viewsResult, reactionsResult, commentsResult] = await Promise.all([
    db.select({ count: count() }).from(postViews).where(and(inArray(postViews.postId, postIds), ne(postViews.userId, userId))),
    db.select({ typeId: postReactions.typeId, count: count() }).from(postReactions).where(and(inArray(postReactions.postId, postIds), ne(postReactions.userId, userId))).groupBy(postReactions.typeId),
    db.select({ count: count() }).from(comments).where(and(inArray(comments.postId, postIds), ne(comments.userId, userId), isNull(comments.deletedByStaffAt)))
  ]);

  const views = Number(viewsResult[0]?.count ?? 0);
  const likes = Number(reactionsResult.find(r => r.typeId === REACTION_TYPES.LIKE)?.count ?? 0);
  const dislikes = Number(reactionsResult.find(r => r.typeId === REACTION_TYPES.DISLIKE)?.count ?? 0);
  const commentsCount = Number(commentsResult[0]?.count ?? 0);

  return { views, likes, dislikes, comments: commentsCount };
}

type PostFilterOptions = {
  time?: PostTimeFilter;
  contentType?: PostContentFilter;
};

type PostSearchOptions = {
  viewerUserId?: string;
  query: string;
  time?: PostTimeFilter;
  contentType?: PostContentFilter;
  limit?: number;
};
