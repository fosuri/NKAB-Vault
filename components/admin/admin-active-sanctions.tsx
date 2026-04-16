"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { revokeSanctionAction } from "@/lib/actions/admin";
import { SanctionRow } from "./types";

export function AdminActiveSanctions({
  activeSanctions,
}: {
  activeSanctions: SanctionRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sanctionSearchQuery, setSanctionSearchQuery] = useState("");
  const [sanctionsPage, setSanctionsPage] = useState(1);
  const [sanctionSort, setSanctionSort] = useState<{
    key: "type" | "targetUserName" | "reason" | "createdByName" | "expiresAt";
    direction: "asc" | "desc";
  }>({ key: "expiresAt", direction: "desc" });
  
  const pageSize = 8;
  
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

  const toggleSanctionSort = (key: "type" | "targetUserName" | "reason" | "createdByName" | "expiresAt") => {
    setSanctionSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

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
                    disabled={isPending}
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
  );
}
