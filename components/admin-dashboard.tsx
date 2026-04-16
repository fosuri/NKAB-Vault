"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  clearMyAdminHistoryAction,
  issueSanctionAction,
  revokeSanctionAction,
  setUserRoleAction,
} from "@/lib/actions/admin";
import { ROLES } from "@/lib/db/auth-schema";

const ROLE_NAMES: Record<number, string> = {
  [ROLES.USER]: "user",
  [ROLES.MODERATOR]: "moderator",
  [ROLES.ADMIN]: "admin",
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: number;
  createdAt: Date;
};

type SanctionRow = {
  id: string;
  type: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date | null;
  targetUserName: string;
  createdByName: string;
  revokedAt: Date | null;
};

type LogRow = {
  id: string;
  actionType: string;
  details: string | null;
  createdAt: Date;
  targetUserName: string | null;
};

type ActorRole = "admin" | "moderator";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserResultsOpen, setIsUserResultsOpen] = useState(false);
  const [sanctionSort, setSanctionSort] = useState<{
    key: "type" | "targetUserName" | "reason" | "createdByName" | "expiresAt";
    direction: "asc" | "desc";
  }>({ key: "expiresAt", direction: "desc" });
  const [historySort, setHistorySort] = useState<{
    key: "createdAt" | "actionType" | "targetUserName" | "details";
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });
  const [sanctionSearchQuery, setSanctionSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [sanctionsPage, setSanctionsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [sanctionType, setSanctionType] = useState<"mute" | "ban">("mute");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionExpiresAt, setSanctionExpiresAt] = useState("");
  const pageSize = 8;

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return users.slice(0, 8);
    }

    return users
      .filter((item) => {
        const roleStr = ROLE_NAMES[item.roleId] ?? "unknown";
        const haystack = `${item.name} ${item.email} ${roleStr}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [users, userSearchQuery]);

  const filteredSanctions = useMemo(() => {
    const normalizedQuery = sanctionSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return activeSanctions;
    }

    return activeSanctions.filter((item) => {
      const expiresText = item.expiresAt ? item.expiresAt.toLocaleString() : "never";
      const haystack = `${item.type} ${item.targetUserName} ${item.reason} ${item.createdByName} ${expiresText}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeSanctions, sanctionSearchQuery]);

  const sortedSanctions = useMemo(() => {
    const sorted = [...filteredSanctions];

    sorted.sort((a, b) => {
      const aValue = a[sanctionSort.key];
      const bValue = b[sanctionSort.key];

      if (aValue === bValue) {
        return 0;
      }

      if (aValue === null) {
        return sanctionSort.direction === "asc" ? -1 : 1;
      }

      if (bValue === null) {
        return sanctionSort.direction === "asc" ? 1 : -1;
      }

      let comparison = 0;

      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: "base",
        });
      }

      return sanctionSort.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredSanctions, sanctionSort]);

  const sanctionsTotalPages = Math.max(1, Math.ceil(sortedSanctions.length / pageSize));
  const safeSanctionsPage = Math.min(sanctionsPage, sanctionsTotalPages);
  const pagedSanctions = useMemo(() => {
    const start = (safeSanctionsPage - 1) * pageSize;
    return sortedSanctions.slice(start, start + pageSize);
  }, [safeSanctionsPage, sortedSanctions]);
  const emptySanctionRows = Math.max(0, pageSize - pagedSanctions.length);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = historySearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return myActionHistory;
    }

    return myActionHistory.filter((item) => {
      const haystack = `${item.createdAt.toLocaleString()} ${item.actionType} ${item.targetUserName ?? ""} ${item.details ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [historySearchQuery, myActionHistory]);

  const sortedHistory = useMemo(() => {
    const sorted = [...filteredHistory];

    sorted.sort((a, b) => {
      const aValue = a[historySort.key];
      const bValue = b[historySort.key];

      if (aValue === bValue) {
        return 0;
      }

      if (aValue === null) {
        return historySort.direction === "asc" ? -1 : 1;
      }

      if (bValue === null) {
        return historySort.direction === "asc" ? 1 : -1;
      }

      let comparison = 0;

      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: "base",
        });
      }

      return historySort.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredHistory, historySort]);

  const historyTotalPages = Math.max(1, Math.ceil(sortedHistory.length / pageSize));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = useMemo(() => {
    const start = (safeHistoryPage - 1) * pageSize;
    return sortedHistory.slice(start, start + pageSize);
  }, [safeHistoryPage, sortedHistory]);
  const emptyHistoryRows = Math.max(0, pageSize - pagedHistory.length);

  const toggleSanctionSort = (key: "type" | "targetUserName" | "reason" | "createdByName" | "expiresAt") => {
    setSanctionSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const toggleHistorySort = (key: "createdAt" | "actionType" | "targetUserName" | "details") => {
    setHistorySort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const selectedUserRoleId = selectedUser?.roleId ?? 0;
  const canManageRoles = actorRole === "admin";
  const canSanctionSelectedUser =
    selectedUserRoleId !== 0 &&
    (actorRole === "admin"
      ? selectedUserRoleId !== ROLES.ADMIN
      : selectedUserRoleId === ROLES.USER);
  const canMakeModerator = selectedUserRoleId === ROLES.USER;
  const canRemoveModerator = selectedUserRoleId === ROLES.MODERATOR;

  const runAction = (callback: () => Promise<{ success?: boolean; error?: string }>, successMessage: string) => {
    startTransition(async () => {
      const result = await callback();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold">User moderation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {canManageRoles
            ? "Assign moderators, mute or ban users."
            : "Mute or ban users, and review active sanctions."}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Input
              type="text"
              value={userSearchQuery}
              onChange={(event) => {
                setUserSearchQuery(event.target.value);
                setIsUserResultsOpen(true);
              }}
              onFocus={() => setIsUserResultsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsUserResultsOpen(false), 100);
              }}
              placeholder="Search by username or email"
            />

            {isUserResultsOpen ? (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-input bg-background p-1 shadow-md">
                {filteredUsers.length ? (
                  filteredUsers.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSelectedUserId(item.id);
                        setUserSearchQuery(`${item.name} (${item.email})`);
                        setIsUserResultsOpen(false);
                      }}
                      className="flex h-10 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted font-normal"
                    >
                      <span className="truncate">{item.name} ({item.email})</span>
                      <span className="shrink-0 text-xs uppercase text-muted-foreground">{ROLE_NAMES[item.roleId] ?? "unknown"}</span>
                    </Button>
                  ))
                ) : (
                  <p className="px-2 py-2 text-sm text-muted-foreground">No users found.</p>
                )}
              </div>
            ) : null}
          </div>
          {canManageRoles ? (
            <>
              <Button
                disabled={!selectedUserId || isPending || !canMakeModerator}
                onClick={() => runAction(() => setUserRoleAction(selectedUserId, ROLES.MODERATOR), "Moderator role assigned")}
              >
                Make moderator
              </Button>
              <Button
                variant="outline"
                disabled={!selectedUserId || isPending || !canRemoveModerator}
                onClick={() => runAction(() => setUserRoleAction(selectedUserId, ROLES.USER), "Moderator role removed")}
              >
                Remove moderator
              </Button>
            </>
          ) : null}
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Selected user role: <span className="font-medium text-foreground">{ROLE_NAMES[selectedUserRoleId] ?? "unknown"}</span>
        </p>

        {!canManageRoles ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Moderators can apply sanctions only to users with role &quot;user&quot;.
          </p>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_220px_auto]">
          <Input
            type="text"
            value={sanctionReason}
            onChange={(event) => setSanctionReason(event.target.value)}
            placeholder="Reason for mute/ban"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between font-normal">
                {sanctionType === "mute" ? "Mute" : "Ban"}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem onClick={() => setSanctionType("mute")}>Mute</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSanctionType("ban")}>Ban</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            type="datetime-local"
            value={sanctionExpiresAt}
            onChange={(event) => setSanctionExpiresAt(event.target.value)}
          />
          <Button
            variant="destructive"
            disabled={!selectedUserId || !sanctionReason.trim() || isPending || !canSanctionSelectedUser}
            onClick={() => {
              runAction(
                () =>
                  issueSanctionAction({
                    targetUserId: selectedUserId,
                    type: sanctionType,
                    reason: sanctionReason,
                    expiresAt: sanctionExpiresAt || undefined,
                  }),
                sanctionType === "ban" ? "User banned" : "User muted"
              );
            }}
          >
            Apply sanction
          </Button>
        </div>

        {isPending ? <Loader2 className="mt-3 size-4 animate-spin text-muted-foreground" /> : null}
      </section>

      <section className="rounded-2xl border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold">Active sanctions</h2>
        <div className="mt-3">
          <Input
            type="text"
            value={sanctionSearchQuery}
            onChange={(event) => {
              setSanctionSearchQuery(event.target.value);
              setSanctionsPage(1);
            }}
            placeholder="Search sanctions"
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="w-24 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleSanctionSort("type")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Type {sanctionSort.key === "type" ? (sanctionSort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-56 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleSanctionSort("targetUserName")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    User {sanctionSort.key === "targetUserName" ? (sanctionSort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-64 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleSanctionSort("reason")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Reason {sanctionSort.key === "reason" ? (sanctionSort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-48 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleSanctionSort("createdByName")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    By {sanctionSort.key === "createdByName" ? (sanctionSort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-56 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleSanctionSort("expiresAt")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Expires {sanctionSort.key === "expiresAt" ? (sanctionSort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-28 pb-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedSanctions.map((item) => (
                <tr key={item.id} className="border-t border-border/40">
                  <td className="py-2 pr-4 uppercase whitespace-nowrap">{item.type}</td>
                  <td className="py-2 pr-4 truncate" title={item.targetUserName}>{item.targetUserName}</td>
                  <td className="py-2 pr-4 truncate" title={item.reason}>{item.reason}</td>
                  <td className="py-2 pr-4 truncate" title={item.createdByName}>{item.createdByName}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{item.expiresAt ? item.expiresAt.toLocaleString() : "Never"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAction(() => revokeSanctionAction(item.id), "Sanction revoked")}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
              {Array.from({ length: emptySanctionRows }).map((_, index) => (
                <tr key={`empty-sanction-${index}`} className="border-t border-border/40">
                  <td className="py-2 pr-4" colSpan={6}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sortedSanctions.length ? <p className="py-2 text-sm text-muted-foreground">No active sanctions.</p> : null}
          {sortedSanctions.length ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Showing {(safeSanctionsPage - 1) * pageSize + 1}-{Math.min(safeSanctionsPage * pageSize, sortedSanctions.length)} of {sortedSanctions.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeSanctionsPage <= 1}
                  onClick={() => setSanctionsPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </Button>
                <span>
                  Page {safeSanctionsPage} / {sanctionsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeSanctionsPage >= sanctionsTotalPages}
                  onClick={() => setSanctionsPage((prev) => Math.min(sanctionsTotalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-background/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {actorRole === "admin" && logUserId && currentUserId && logUserId !== currentUserId
              ? `Moderation history: ${users.find((u) => u.id === logUserId)?.name || "User"}`
              : `Your ${actorRole === "admin" ? "admin" : "moderation"} history`}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {actorRole === "admin" && currentUserId ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="font-normal w-auto justify-between min-w-[200px]">
                    {logUserId === currentUserId || !logUserId
                      ? "My History"
                      : `${users.find((u) => u.id === logUserId)?.name} (${ROLE_NAMES[users.find((u) => u.id === logUserId)?.roleId ?? 0]})`}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("logUserId");
                    router.push(url.pathname + url.search);
                  }}>
                    My History
                  </DropdownMenuItem>
                  {users
                    .filter((u) => (u.roleId === ROLES.ADMIN || u.roleId === ROLES.MODERATOR) && u.id !== currentUserId)
                    .map((u) => (
                      <DropdownMenuItem key={u.id} onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("logUserId", u.id);
                        router.push(url.pathname + url.search);
                      }}>
                        {u.name} ({ROLE_NAMES[u.roleId]})
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {(!logUserId || logUserId === currentUserId) ? (
              <Button
                variant="outline"
                disabled={!myActionHistory.length || isPending}
                onClick={() => {
                  if (!window.confirm("Clear your entire moderation history?")) {
                    return;
                  }

                  runAction(() => clearMyAdminHistoryAction(), "History cleared");
                }}
              >
                Clear my history
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <Input
            type="text"
            value={historySearchQuery}
            onChange={(event) => {
              setHistorySearchQuery(event.target.value);
              setHistoryPage(1);
            }}
            placeholder="Search history"
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="w-52 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleHistorySort("createdAt")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    When {historySort.key === "createdAt" ? (historySort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-44 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleHistorySort("actionType")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Action {historySort.key === "actionType" ? (historySort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="w-40 pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleHistorySort("targetUserName")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Target {historySort.key === "targetUserName" ? (historySort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
                <th className="pb-2 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => toggleHistorySort("details")} className="-ml-3 h-8 px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground">
                    Details {historySort.key === "details" ? (historySort.direction === "asc" ? "↑" : "↓") : ""}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedHistory.map((item) => (
                <tr key={item.id} className="border-t border-border/40">
                  <td className="py-2 pr-4 whitespace-nowrap">{item.createdAt.toLocaleString()}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{item.actionType}</td>
                  <td className="py-2 pr-4 truncate" title={item.targetUserName ?? "-"}>{item.targetUserName ?? "-"}</td>
                  <td className="py-2 pr-4 truncate" title={item.details ?? "-"}>{item.details ?? "-"}</td>
                </tr>
              ))}
              {Array.from({ length: emptyHistoryRows }).map((_, index) => (
                <tr key={`empty-history-${index}`} className="border-t border-border/40">
                  <td className="py-2 pr-4" colSpan={4}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sortedHistory.length ? <p className="py-2 text-sm text-muted-foreground">No moderation actions yet.</p> : null}
          {sortedHistory.length ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Showing {(safeHistoryPage - 1) * pageSize + 1}-{Math.min(safeHistoryPage * pageSize, sortedHistory.length)} of {sortedHistory.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeHistoryPage <= 1}
                  onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </Button>
                <span>
                  Page {safeHistoryPage} / {historyTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeHistoryPage >= historyTotalPages}
                  onClick={() => setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
