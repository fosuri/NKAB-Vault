import { NextRequest, NextResponse } from "next/server";
import { and, isNotNull, lt, inArray } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { destroyUserCloudinaryAsset } from "@/lib/cloudinary-assets";
import {
  posts,
  comments,
  adminActionLog,
  RESOURCE_TYPES,
} from "@/lib/db/auth-schema";

/**
 * Automated Cleanup API.
 * Hard-deletes content soft-deleted over 30 days ago and cleans up associated resources.
 */
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Fetch expired posts and their media
    const expiredPosts = await db.query.posts.findMany({
      where: and(
        isNotNull(posts.deletedByStaffAt),
        lt(posts.deletedByStaffAt, thirtyDaysAgo)
      ),
      columns: { id: true, userId: true },
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

      // Delete Cloudinary assets for expired posts
      const allMediaItems = expiredPosts.flatMap((p) => p.media);
      if (allMediaItems.length > 0) {
        const cloudinaryResults = await Promise.allSettled(
          expiredPosts.flatMap((post) =>
            post.media.map((m) =>
              destroyUserCloudinaryAsset(
                post.userId,
                m.publicId,
                m.resourceTypeId === RESOURCE_TYPES.VIDEO ? "video" : "image",
              )
            )
          )
        );
        deletedPostMediaCount = cloudinaryResults.filter(
          (r) => r.status === "fulfilled"
        ).length;
      }

      // Delete admin action logs linked to expired posts
      const deletedPostLogs = await db
        .delete(adminActionLog)
        .where(inArray(adminActionLog.targetPostId, expiredPostIds))
        .returning({ id: adminActionLog.id });
      deletedPostLogsCount = deletedPostLogs.length;

      // Hard-delete the posts
      const deletedPosts = await db
        .delete(posts)
        .where(inArray(posts.id, expiredPostIds))
        .returning({ id: posts.id });
      deletedPostsCount = deletedPosts.length;

      deletedPosts.forEach((p) => {
        console.log(`[cron/cleanup] Post - ${p.id} was deleted`);
      });
    }

    // Fetch orphaned expired comments
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

      // Delete admin action logs linked to expired comments
      const deletedCommentLogs = await db
        .delete(adminActionLog)
        .where(inArray(adminActionLog.targetCommentId, expiredCommentIds))
        .returning({ id: adminActionLog.id });
      deletedCommentLogsCount = deletedCommentLogs.length;

      // Hard-delete the comment records
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
