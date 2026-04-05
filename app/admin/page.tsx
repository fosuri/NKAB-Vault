import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { getSession } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { adminActionLog, user, userSanctions } from "@/lib/db/auth-schema";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getUserModerationState } from "@/lib/auth/moderation";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    redirect("/banned");
  }

  if (!moderationState || moderationState.role !== "admin") {
    redirect("/");
  }

  const now = new Date();

  const [users, activeSanctions, myActionHistory] = await Promise.all([
    db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      limit: 200,
    }),
    db.query.userSanctions.findMany({
      where: and(
        isNull(userSanctions.revokedAt),
        or(isNull(userSanctions.expiresAt), gt(userSanctions.expiresAt, now)),
      ),
      orderBy: [desc(userSanctions.createdAt)],
      with: {
        targetUser: {
          columns: { name: true, email: true },
        },
        actorUser: {
          columns: { name: true, email: true },
        },
      },
      limit: 100,
    }),
    db.query.adminActionLog.findMany({
      where: eq(adminActionLog.actorUserId, session.user.id),
      orderBy: [desc(adminActionLog.createdAt)],
      with: {
        targetUser: {
          columns: { name: true, email: true },
        },
      },
      limit: 120,
    }),
  ]);

  return (
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(243,244,246,0.95),transparent_40%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(55,65,81,0.35),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Moderate content, apply sanctions, manage moderators, and review your action history.
            </p>
          </div>

          <AdminDashboard
            users={users}
            activeSanctions={activeSanctions.map((item) => ({
              id: item.id,
              type: item.type,
              reason: item.reason,
              createdAt: item.createdAt,
              expiresAt: item.expiresAt,
              revokedAt: item.revokedAt,
              targetUserName: item.targetUser?.name ?? item.targetUser?.email ?? "Unknown",
              createdByName: item.actorUser?.name ?? item.actorUser?.email ?? "Unknown",
            }))}
            myActionHistory={myActionHistory.map((item) => ({
              id: item.id,
              actionType: item.actionType,
              details: item.details,
              createdAt: item.createdAt,
              targetUserName: item.targetUser?.name ?? item.targetUser?.email ?? null,
            }))}
          />
        </div>
      </div>
  );
}
