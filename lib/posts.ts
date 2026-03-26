import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { postMedia, posts, user } from "@/lib/db/auth-schema";

export async function getFeedPosts() {
  const rows = await db.query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
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