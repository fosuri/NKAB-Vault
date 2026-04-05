import { and, desc, eq, gte, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { comments, postMedia, posts, user } from "@/lib/db/auth-schema";
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
  if (viewerUserId) {
    const moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) {
      return [];
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
    viewerUserId
      ? or(eq(posts.access, "public"), eq(posts.userId, viewerUserId))
      : eq(posts.access, "public"),
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
  if (viewerUserId) {
    const moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) {
      return [];
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
    viewerUserId
      ? or(eq(posts.access, "public"), eq(posts.userId, viewerUserId))
      : eq(posts.access, "public"),
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
        },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
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
  });
}

export async function getPostById(postId: string) {
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

  return db.query.posts.findFirst({
    where: eq(posts.id, postId),
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
      comments: {
        orderBy: [desc(comments.createdAt)],
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      },
    },
  });
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