"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clearMyAdminHistoryAction } from "@/lib/actions/admin";
import { ROLES, ADMIN_ACTION_TYPES } from "@/lib/db/auth-schema";
import { ROLE_NAMES, UserRow, LogRow, ActorRole } from "./types";

/**
 * Admin Action History Component.
 * Displays a detailed log of moderation actions performed by admins and moderators.
 * Supports searching, sorting, and pagination of the action logs.
 */
export function AdminActionHistory({
  users,
  myActionHistory,
  actorRole = "admin",
  logUserId,
  currentUserId,
}: {
  users: UserRow[];
  myActionHistory: LogRow[];
  actorRole?: ActorRole;
  logUserId?: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // State for filtering and navigation
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [historySort, setHistorySort] = useState<{
    key: "createdAt" | "actionType" | "targetUserName" | "details";
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  // Expand/collapse long detail strings in the table
  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pageSize = 8;

  // Filter history based on search query across multiple fields
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

  // Sort history based on selected column and direction
  const sortedHistory = useMemo(() => {
    const sorted = [...filteredHistory];

    sorted.sort((a, b) => {
      const aValue = a[historySort.key];
      const bValue = b[historySort.key];

      if (aValue === bValue) return 0;
      if (aValue === null) return historySort.direction === "asc" ? -1 : 1;
      if (bValue === null) return historySort.direction === "asc" ? 1 : -1;

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

  // Pagination calculations
  const historyTotalPages = Math.max(1, Math.ceil(sortedHistory.length / pageSize));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = useMemo(() => {
    const start = (safeHistoryPage - 1) * pageSize;
    return sortedHistory.slice(start, start + pageSize);
  }, [safeHistoryPage, sortedHistory]);
  
  const emptyHistoryRows = Math.max(0, pageSize - pagedHistory.length);

  const toggleHistorySort = (key: "createdAt" | "actionType" | "targetUserName" | "details") => {
    setHistorySort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Helper for server action execution with feedback
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
    <section className="rounded-2xl border border-border/60 bg-background/80 p-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {/* Dynamic title based on whose history is being viewed */}
          {actorRole === "admin" && logUserId && currentUserId && logUserId !== currentUserId
            ? `Moderation history: ${users.find((u) => u.id === logUserId)?.name || "User"}`
            : `Your ${actorRole === "admin" ? "admin" : "moderation"} history`}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* Admin-only: dropdown to view other moderators' logs */}
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

          {/* Feature to clear personal moderation history */}
          {(!logUserId || logUserId === currentUserId) ? (
            <Dialog open={isClearHistoryOpen} onOpenChange={setIsClearHistoryOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!myActionHistory.length || isPending}
                >
                  Clear my history
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear moderation history</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to clear your entire moderation history? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsClearHistoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsClearHistoryOpen(false);
                      runAction(() => clearMyAdminHistoryAction(), "History cleared");
                    }}
                  >
                    Clear history
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

      {/* Action Logs Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[1100px] w-full table-fixed text-sm">
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
              <th className="w-24 pb-2 text-center font-semibold text-muted-foreground">Review</th>
            </tr>
          </thead>
          <tbody>
            {pagedHistory.map((item) => {
              // Build the staff review link for deleted/recovered posts and comments.
              const isPostReviewAction = item.actionType === "DELETE_POST" || item.actionType === "RECOVER_POST";
              const isCommentReviewAction = item.actionType === "DELETE_COMMENT" || item.actionType === "RECOVER_COMMENT";
              let reviewHref: string | null = null;
              if (isPostReviewAction && item.targetPostId) {
                reviewHref = `/staff/review/${item.targetPostId}`;
              } else if (isCommentReviewAction && item.targetCommentId && item.targetPostId) {
                reviewHref = `/staff/review/${item.targetPostId}?comment=${item.targetCommentId}`;
              }

              return (
                <tr key={item.id} className="border-t border-border/40">
                  <td suppressHydrationWarning className="py-2 pr-4 whitespace-nowrap">{item.createdAt.toLocaleString()}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{item.actionType}</td>
                  <td className="py-2 pr-4 truncate" title={item.targetUserName ?? "-"}>{item.targetUserName ?? "-"}</td>
                  <td 
                    className={`py-2 pr-4 cursor-pointer ${expandedDetails.has(item.id) ? "" : "truncate"}`} 
                    title={item.details ?? "-"}
                    onClick={() => toggleDetails(item.id)}
                  >
                    {item.details ?? "-"}
                  </td>
                  <td className="py-2 text-center">
                    {reviewHref ? (
                      <a
                        href={reviewHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Review content"
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {/* Visual padding to maintain table height */}
            {Array.from({ length: emptyHistoryRows }).map((_, index) => (
              <tr key={`empty-history-${index}`} className="border-t border-border/40">
                <td className="py-2 pr-4" colSpan={5}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!sortedHistory.length ? <p className="py-2 text-sm text-muted-foreground">No moderation actions yet.</p> : null}
        
        {/* Pagination UI */}
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
  );
}

