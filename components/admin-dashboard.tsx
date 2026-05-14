"use client";

import { AdminUserModeration } from "./admin/admin-user-moderation";
import { AdminActiveSanctions } from "./admin/admin-active-sanctions";
import { AdminActionHistory } from "./admin/admin-action-history";
import { UserRow, SanctionRow, LogRow, ActorRole } from "./admin/types";

/**
 * Admin Dashboard Root Component.
 * Acts as the primary layout for the moderation interface.
 * Coordinates the User Moderation (role/sanction issuance), 
 * Active Sanctions (revocation), and Action History (audit trail) components.
 */
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
    <div className="grid gap-6 min-w-0">
      {/* Search and manage specific users */}
      <AdminUserModeration users={users} actorRole={actorRole} />
      
      {/* View and revoke currently active disciplinary actions */}
      <AdminActiveSanctions activeSanctions={activeSanctions} />
      
      {/* Audit trail of recent moderation actions */}
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

