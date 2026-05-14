import { NextRequest, NextResponse } from "next/server";
import { and, isNotNull, lt, inArray } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { cloudinary } from "@/lib/cloudinary";
import {
  posts,
  comments,
  adminActionLog,
  RESOURCE_TYPES,
} from "@/lib/db/auth-schema";

/**
 * Automated Cleanup Cron Job — runs every 6 hours via Vercel Cron.
 *
 * Responsibilities:
 *  1. Find posts soft-deleted by staff more than 30 days ago.
 *  2. Delete their associated Cloudinary media assets.
 *  3. Delete their admin_action_log entries (targetPostId or targetCommentId).
 *  4. Hard-delete the post records (cascades to post_media, comments, reactions, views, notifications).
 *  5. Find comments soft-deleted by staff more than 30 days ago (not already cascade-deleted).
 *  6. Delete their admin_action_log entries.
 *  7. Hard-delete the comment records.
 */
export async function GET(request: NextRequest) {
  // Security: validate the cron secret so only Vercel (or authorised callers) can trigger this
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // =========================================================================
    // PHASE 1 — Expired soft-deleted POSTS
    // =========================================================================

    // 1a. Fetch expired posts and their media in one query
    const expiredPosts = await db.query.posts.findMany({
      where: and(
        isNotNull(posts.deletedByStaffAt),
        lt(posts.deletedByStaffAt, thirtyDaysAgo)
      ),
      columns: { id: true },
      with: {
        media: {
          columns: { publicId: true, resourceTypeId: true },
        },
      },
    });

    let deletedPostsCount = 0;
    let deletedPostMediaCount = 0;
    let deletedPostLogsCount = 0;

    if (expiredPosts.length > 0) {
      const expiredPostIds = expiredPosts.map((p) => p.id);

      // 1b. Delete Cloudinary assets for all expired posts
      const allMediaItems = expiredPosts.flatMap((p) => p.media);
      if (allMediaItems.length > 0) {
        const cloudinaryResults = await Promise.allSettled(
          allMediaItems.map((m) =>
            cloudinary.uploader.destroy(m.publicId, {
              resource_type:
                m.resourceTypeId === RESOURCE_TYPES.VIDEO ? "video" : "image",
            })
          )
        );
        deletedPostMediaCount = cloudinaryResults.filter(
          (r) => r.status === "fulfilled"
        ).length;
      }

      // 1c. Delete admin_action_log rows linked to these posts
      //     (targetPostId foreign key is SET NULL on post deletion, so we must clean first)
      const deletedPostLogs = await db
        .delete(adminActionLog)
        .where(inArray(adminActionLog.targetPostId, expiredPostIds))
        .returning({ id: adminActionLog.id });
      deletedPostLogsCount = deletedPostLogs.length;

      // 1d. Hard-delete the posts — cascades to:
      //     post_media, comments, post_reactions, post_views, notifications (postId cascade)
      const deletedPosts = await db
        .delete(posts)
        .where(inArray(posts.id, expiredPostIds))
        .returning({ id: posts.id });
      deletedPostsCount = deletedPosts.length;

      deletedPosts.forEach((p) => {
        console.log(`[cron/cleanup] Post - ${p.id} was deleted`);
      });
    }

    // =========================================================================
    // PHASE 2 — Expired soft-deleted COMMENTS
    // (posts cascade-delete their comments, so only orphaned ones remain here)
    // =========================================================================

    const expiredComments = await db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          isNotNull(comments.deletedByStaffAt),
          lt(comments.deletedByStaffAt, thirtyDaysAgo)
        )
      );

    let deletedCommentsCount = 0;
    let deletedCommentLogsCount = 0;

    if (expiredComments.length > 0) {
      const expiredCommentIds = expiredComments.map((c) => c.id);

      // 2a. Delete admin_action_log rows linked to these comments
      const deletedCommentLogs = await db
        .delete(adminActionLog)
        .where(inArray(adminActionLog.targetCommentId, expiredCommentIds))
        .returning({ id: adminActionLog.id });
      deletedCommentLogsCount = deletedCommentLogs.length;

      // 2b. Hard-delete the comment records
      //     (cascades to notifications that reference them via commentId)
      const deletedComments = await db
        .delete(comments)
        .where(inArray(comments.id, expiredCommentIds))
        .returning({ id: comments.id });
      deletedCommentsCount = deletedComments.length;

      deletedComments.forEach((c) => {
        console.log(`[cron/cleanup] Comment - ${c.id} was deleted`);
      });
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      posts: {
        deleted: deletedPostsCount,
        mediaDeletedFromCloudinary: deletedPostMediaCount,
        logsDeleted: deletedPostLogsCount,
      },
      comments: {
        deleted: deletedCommentsCount,
        logsDeleted: deletedCommentLogsCount,
      },
    };

    console.log("[cron/cleanup]", JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown cleanup error";
    console.error("[cron/cleanup] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
