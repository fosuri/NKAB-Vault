"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { notifications } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";

/**
 * User Notification Lifecycle Actions.
 */

/**
 * Retrieves the chronological list of alerts for the current user.
 */
export async function getNotifications() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated", data: null };
  }

  // Fetch with full relational context for UI display
  const userNotifications = await db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: [desc(notifications.createdAt)], // Chronological sort
    with: {
      actor: {
        columns: { id: true, name: true, image: true, email: true },
      },
      post: {
        columns: { id: true, title: true },
      },
    },
    limit: 20, // Performance optimization
  });

  return { success: true, data: userNotifications };
}

/**
 * Synchronizes the unread state of all notifications for the user.
 */
export async function markNotificationsAsRead() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // 1. Bulk update flag for all notification records
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, session.user.id));

  revalidatePath("/");
  return { success: true };
}

/**
 * Removes a specific alert record from the user's history.
 */
export async function deleteNotification(id: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // 2. Individual wipe: record-level deletion
  await db
    .delete(notifications)
    .where(eq(notifications.id, id));

  revalidatePath("/");
  return { success: true };
}

/**
 * Wipes the entire notification history for the current user.
 */
export async function clearAllNotifications() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // 3. Bulk wipe: removes all records for the user
  await db
    .delete(notifications)
    .where(eq(notifications.userId, session.user.id));

  revalidatePath("/");
  return { success: true };
}
