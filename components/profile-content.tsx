"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProfileModal } from "@/components/EditProfileModal";
import { authClient } from "@/lib/auth/auth-client";
import { User } from "better-auth";
import { ChevronDown, Pencil, Trash2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  content?: string;
  image?: string;
  createdAt?: Date;
  [key: string]: unknown;
}

interface ProfileContentProps {
  user: User & { profileDescription?: string | null; isPro?: boolean };
}

export function ProfileContent({ user }: ProfileContentProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await authClient.deleteUser();
    if (error) {
      toast.error(error.message || "Failed to delete account");
      setDeleting(false);
      return;
    }
    toast.success("Account deleted successfully");
    router.push("/");
  };

  return (
    <>
      <section className="rounded-xl border border-border/50 bg-background/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className={cn("size-16", user.isPro && "outline-1 outline-pro-bg outline-offset-2 border-none")}>
              {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
              <AvatarFallback>{user.name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                {user.name || "User profile"}
                {user.isPro && (
                  <Badge variant="secondary" className="bg-pro-bg text-black gap-1 rounded-full px-2 py-0.5">
                    <BadgeCheck className="size-4 fill-black text-pro-bg" />
                    Pro
                  </Badge>
                )}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end sm:w-44">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-full">
                  Account
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : "rotate-0"}`}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-1.5 flex flex-col gap-1 w-(--radix-dropdown-menu-trigger-width)">
                <Button
                  onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </Button>
                <Button
                  onClick={() => { setDropdownOpen(false); setDeleteDialogOpen(true); }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={user}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
