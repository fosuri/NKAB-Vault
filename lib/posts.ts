import { and, desc, eq, gte, ilike, inArray, or, count, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { comments, postMedia, postReactions, posts, postViews, user, subscriptions } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";

export type PostTimeFilter = "all" | "24h" | "7d" | "30d" | "365d";
export type PostContentFilter = "all" | "image" | "gif" | "video";

type PostFilterOptions = {
  time?: PostTimeFilter;
  contentType?: PostContentFilter;
};

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

async function getPostIdsByContentType(contentType: PostContentFilter): Promise<string[] | undefined> {
  if (contentType === "all") {
    return undefined;
  }

  const mediaWhere =
    contentType === "gif"
      ? and(eq(postMedia.resourceType, "image"), eq(postMedia.format, "gif"))
      : eq(postMedia.resourceType, contentType);

  const mediaRows = await db
    .select({ postId: postMedia.postId })
    .from(postMedia)
    .where(mediaWhere);

  return Array.from(new Set(mediaRows.map((row) => row.postId)));
}

export async function getFeedPosts(
  viewerUserId?: string,
  options: PostFilterOptions = {}
) {
  let accessFilter = eq(posts.access, "public");

  if (viewerUserId) {
    const moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) {
      return [];
    }

    const sub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, viewerUserId),
        inArray(subscriptions.status, ["active", "trialing"])
      ),
    });

    if (sub) {
      accessFilter = inArray(posts.access, ["public", "paid"]);
    }
  }

  const time = options.time ?? "all";
  const contentType = options.contentType ?? "all";
  const createdAfter = getCreatedAfterDate(time);
  const postIdsByType = await getPostIdsByContentType(contentType);

  if (postIdsByType && postIdsByType.length === 0) {
    return [];
  }

  const feedWhere = and(
    accessFilter,
    createdAfter ? gte(posts.createdAt, createdAfter) : undefined,
    postIdsByType ? inArray(posts.id, postIdsByType) : undefined,
  );

  const rows = await db.query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
    where: feedWhere,
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
  });

  return rows;
}

type PostSearchOptions = {
  viewerUserId?: string;
  query: string;
  time?: PostTimeFilter;
  contentType?: PostContentFilter;
  limit?: number;
};

export async function searchPosts({
  viewerUserId,
  query,
  time = "all",
  contentType = "all",
  limit = 24,
}: PostSearchOptions) {
  let accessFilter = eq(posts.access, "public");

  if (viewerUserId) {
    const moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) {
      return [];
    }

    const sub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, viewerUserId),
        inArray(subscriptions.status, ["active", "trialing"])
      ),
    });

    if (sub) {
      accessFilter = inArray(posts.access, ["public", "paid"]);
    }
  }

  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const createdAfter = getCreatedAfterDate(time);
  const postIdsByType = await getPostIdsByContentType(contentType);

  if (postIdsByType && postIdsByType.length === 0) {
    return [];
  }

  const whereClause = and(
    accessFilter,
    or(
      ilike(posts.title, `%${trimmedQuery}%`),
      ilike(posts.description, `%${trimmedQuery}%`),
      ilike(user.name, `%${trimmedQuery}%`)
    ),
    createdAfter ? gte(posts.createdAt, createdAfter) : undefined,
    postIdsByType ? inArray(posts.id, postIdsByType) : undefined,
  );

  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .leftJoin(user, eq(posts.userId, user.id))
    .where(whereClause)
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const postIds = rows.map((row) => row.id);

  if (!postIds.length) {
    return [];
  }

  return db.query.posts.findMany({
    where: inArray(posts.id, postIds),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
          roleId: true,
        },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
    orderBy: [desc(posts.createdAt)],
  });
}

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
      ? post.media[0].resourceType === "video"
        ? post.media[0].secureUrl.replace(/\.[^/.?]+(?=(\?|$))/, ".jpg")
        : post.media[0].secureUrl
      : null,
  }));
}

export async function getPostsByUserId(userId: string) {
  const moderationState = await getUserModerationState(userId);
  if (moderationState?.activeBan) {
    return [];
  }

  return db.query.posts.findMany({
    where: eq(posts.userId, userId),
    orderBy: [desc(posts.createdAt)],
    with: {
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
  });
}

export async function getPostById(postId: string, currentUserId?: string) {
  const lightweightPost = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: {
      id: true,
      userId: true,
    },
  });

  if (!lightweightPost) {
    return null;
  }

  const moderationState = await getUserModerationState(lightweightPost.userId);
  if (moderationState?.activeBan) {
    return null;
  }

  const [post, reactions] = await Promise.all([
    db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
            email: true,
            roleId: true,
          },
        },
        media: {
          orderBy: [postMedia.sortOrder],
        },
        comments: {
          orderBy: [desc(comments.createdAt)],
          with: {
            author: {
              columns: {
                id: true,
                name: true,
                image: true,
                email: true,
                roleId: true,
              },
            },
          },
        },
      },
      extras: {
        viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
      },
    }),
    db
      .select({ type: postReactions.type, userId: postReactions.userId })
      .from(postReactions)
      .where(eq(postReactions.postId, postId)),
  ]);

  if (!post) return null;

  const likeCount = reactions.filter((r) => r.type === "like").length;
  const dislikeCount = reactions.filter((r) => r.type === "dislike").length;
  const userReaction = currentUserId
    ? (reactions.find((r) => r.userId === currentUserId)?.type as "like" | "dislike" | undefined) ?? null
    : null;

  return { ...post, likeCount, dislikeCount, userReaction };
}

export async function getUserById(userId: string) {
  return db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });
}

export async function getLikedPostsByUserId(userId: string) {
  const liked = await db
    .select({ postId: postReactions.postId })
    .from(postReactions)
    .where(and(eq(postReactions.userId, userId), eq(postReactions.type, "like")));

  const postIds = liked.map((r) => r.postId);
  if (!postIds.length) return [];

  let accessFilter = eq(posts.access, "public");

  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      inArray(subscriptions.status, ["active", "trialing"])
    ),
  });

  if (sub) {
    accessFilter = inArray(posts.access, ["public", "paid"]);
  }

  return db.query.posts.findMany({
    where: and(inArray(posts.id, postIds), accessFilter),
    orderBy: [desc(posts.createdAt)],
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
          roleId: true,
        },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
    extras: {
      viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
    },
  });
}

export async function getUserAccountStatistics(userId: string) {
  const userPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, userId));
  const postIds = userPosts.map(p => p.id);

  if (postIds.length === 0) {
    return { views: 0, likes: 0, dislikes: 0, comments: 0 };
  }

  const [viewsResult, reactionsResult, commentsResult] = await Promise.all([
    db.select({ count: count() }).from(postViews).where(and(inArray(postViews.postId, postIds), ne(postViews.userId, userId))),
    db.select({ type: postReactions.type, count: count() }).from(postReactions).where(and(inArray(postReactions.postId, postIds), ne(postReactions.userId, userId))).groupBy(postReactions.type),
    db.select({ count: count() }).from(comments).where(and(inArray(comments.postId, postIds), ne(comments.userId, userId)))
  ]);

  const views = Number(viewsResult[0]?.count ?? 0);
  const likes = Number(reactionsResult.find(r => r.type === "like")?.count ?? 0);
  const dislikes = Number(reactionsResult.find(r => r.type === "dislike")?.count ?? 0);
  const commentsCount = Number(commentsResult[0]?.count ?? 0);

  return { views, likes, dislikes, comments: commentsCount };
}
