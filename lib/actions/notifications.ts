"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { notifications } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";

export async function getNotifications() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated", data: null };
  }

  const userNotifications = await db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: [desc(notifications.createdAt)],
    with: {
      actor: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      post: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
    limit: 20,
  });

  return { success: true, data: userNotifications };
}

export async function markNotificationsAsRead() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, session.user.id));

  revalidatePath("/");
  return { success: true };
}

export async function deleteNotification(id: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await db
    .delete(notifications)
    .where(eq(notifications.id, id));

  revalidatePath("/");
  return { success: true };
}

export async function clearAllNotifications() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await db
    .delete(notifications)
    .where(eq(notifications.userId, session.user.id));

  revalidatePath("/");
  return { success: true };
}
