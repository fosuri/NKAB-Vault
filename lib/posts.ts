import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { comments, postMedia, posts, user } from "@/lib/db/auth-schema";

export async function getFeedPosts(viewerUserId?: string) {
  const rows = await db.query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
    where: viewerUserId
      ? or(eq(posts.access, "public"), eq(posts.userId, viewerUserId))
      : eq(posts.access, "public"),
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

export async function getPostsByUserId(userId: string) {
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