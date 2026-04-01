"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EditProfileModal } from "@/components/EditProfileModal";
import { User } from "better-auth";
import { Pencil } from "lucide-react";

interface Post {
  id: string;
  content?: string;
  image?: string;
  createdAt?: Date;
  [key: string]: unknown;
}

interface ProfileContentProps {
  user: User & { profileDescription?: string | null };
  userPosts: Post[];
}

export function ProfileContent({ user, userPosts }: ProfileContentProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);

  return (
    <>
      <section className="rounded-[32px] border border-border/50 bg-background/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-16">
              {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
              <AvatarFallback>{user.name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {user.name || "User profile"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="grid gap-1 rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Posts published</span>
              <span className="text-2xl font-semibold text-foreground">{userPosts.length}</span>
            </div>
            <Button
              onClick={() => setEditModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </section>

      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={user}
      />
    </>
  );
}
