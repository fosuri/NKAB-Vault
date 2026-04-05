"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  issueSanctionAction,
  revokeSanctionAction,
  setUserRoleAction,
} from "@/lib/actions/admin";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
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

export function AdminDashboard({
  users,
  activeSanctions,
  myActionHistory,
}: {
  users: UserRow[];
  activeSanctions: SanctionRow[];
  myActionHistory: LogRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [sanctionType, setSanctionType] = useState<"mute" | "ban">("mute");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionExpiresAt, setSanctionExpiresAt] = useState("");

  const userOptions = useMemo(
    () => users.map((item) => ({ value: item.id, label: `${item.name} (${item.email}) - ${item.role}` })),
    [users]
  );

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const selectedUserRole = selectedUser?.role ?? "unknown";
  const canMakeModerator = selectedUserRole === "user";
  const canRemoveModerator = selectedUserRole === "moderator";

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
          Assign moderators, mute or ban users.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {userOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedUserId || isPending || !canMakeModerator}
            onClick={() => runAction(() => setUserRoleAction(selectedUserId, "moderator"), "Moderator role assigned")}
            className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Make moderator
          </button>
          <button
            type="button"
            disabled={!selectedUserId || isPending || !canRemoveModerator}
            onClick={() => runAction(() => setUserRoleAction(selectedUserId, "user"), "Moderator role removed")}
            className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Remove moderator
          </button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Selected user role: <span className="font-medium text-foreground">{selectedUserRole}</span>
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_220px_auto]">
          <input
            type="text"
            value={sanctionReason}
            onChange={(event) => setSanctionReason(event.target.value)}
            placeholder="Reason for mute/ban"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            value={sanctionType}
            onChange={(event) => setSanctionType(event.target.value as "mute" | "ban")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="mute">Mute</option>
            <option value="ban">Ban</option>
          </select>
          <input
            type="datetime-local"
            value={sanctionExpiresAt}
            onChange={(event) => setSanctionExpiresAt(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={!selectedUserId || !sanctionReason.trim() || isPending}
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
            className="h-10 rounded-md border border-destructive/40 bg-destructive/5 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Apply sanction
          </button>
        </div>

        {isPending ? <Loader2 className="mt-3 size-4 animate-spin text-muted-foreground" /> : null}
      </section>

      <section className="rounded-2xl border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold">Active sanctions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Reason</th>
                <th className="pb-2 pr-4">By</th>
                <th className="pb-2 pr-4">Expires</th>
                <th className="pb-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeSanctions.map((item) => (
                <tr key={item.id} className="border-t border-border/40">
                  <td className="py-2 pr-4 uppercase">{item.type}</td>
                  <td className="py-2 pr-4">{item.targetUserName}</td>
                  <td className="py-2 pr-4">{item.reason}</td>
                  <td className="py-2 pr-4">{item.createdByName}</td>
                  <td className="py-2 pr-4">{item.expiresAt ? item.expiresAt.toLocaleString() : "Never"}</td>
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => runAction(() => revokeSanctionAction(item.id), "Sanction revoked")}
                      className="rounded-md border border-input px-3 py-1 hover:bg-muted"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!activeSanctions.length ? (
            <p className="py-2 text-sm text-muted-foreground">No active sanctions.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold">Your admin history</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 pr-4">When</th>
                <th className="pb-2 pr-4">Action</th>
                <th className="pb-2 pr-4">Target</th>
                <th className="pb-2 pr-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {myActionHistory.map((item) => (
                <tr key={item.id} className="border-t border-border/40">
                  <td className="py-2 pr-4">{item.createdAt.toLocaleString()}</td>
                  <td className="py-2 pr-4">{item.actionType}</td>
                  <td className="py-2 pr-4">{item.targetUserName ?? "-"}</td>
                  <td className="py-2 pr-4">{item.details ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!myActionHistory.length ? (
            <p className="py-2 text-sm text-muted-foreground">No admin actions yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
