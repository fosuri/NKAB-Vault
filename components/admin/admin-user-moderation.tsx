"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  issueSanctionAction,
  setUserRoleAction,
} from "@/lib/actions/admin";
import { ROLES } from "@/lib/db/auth-schema";
import { ROLE_NAMES, UserRow, ActorRole } from "./types";

export function AdminUserModeration({
  users,
  actorRole = "admin",
}: {
  users: UserRow[];
  actorRole?: ActorRole;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserResultsOpen, setIsUserResultsOpen] = useState(false);
  
  const [sanctionType, setSanctionType] = useState<"mute" | "ban">("mute");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionExpiresAt, setSanctionExpiresAt] = useState("");
  
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
  );
}
