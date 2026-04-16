"use client";

import { AdminUserModeration } from "./admin/admin-user-moderation";
import { AdminActiveSanctions } from "./admin/admin-active-sanctions";
import { AdminActionHistory } from "./admin/admin-action-history";
import { UserRow, SanctionRow, LogRow, ActorRole } from "./admin/types";

export function AdminDashboard({
  users,
  activeSanctions,
  myActionHistory,
  actorRole = "admin",
  logUserId,
  currentUserId,
}: {
  users: UserRow[];
  activeSanctions: SanctionRow[];
  myActionHistory: LogRow[];
  actorRole?: ActorRole;
  logUserId?: string;
  currentUserId?: string;
}) {
  return (
    <div className="grid gap-6">
      <AdminUserModeration users={users} actorRole={actorRole} />
      <AdminActiveSanctions activeSanctions={activeSanctions} />
      <AdminActionHistory 
        users={users} 
        myActionHistory={myActionHistory} 
        actorRole={actorRole} 
        logUserId={logUserId} 
        currentUserId={currentUserId} 
      />
    </div>
  );
}
