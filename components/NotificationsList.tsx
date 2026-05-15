"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import { deleteNotification, clearAllNotifications, getNotifications } from "@/lib/actions/notifications";
import { subscribeToUserEvents } from "@/lib/client-user-events";

import { NOTIFICATION_TYPES } from "@/lib/db/auth-schema";

type Notification = {
  id: string;
  typeId: number;
  message: string | null;
  isRead: boolean;
  createdAt: Date;
  postId: string | null;
  actor: {
    id: string;
    name: string;
    image: string | null;
    email: string;
  } | null;
  post: {
    id: string;
    title: string;
  } | null;
};

/**
 * Notifications List Component.
 * Displays a persistent list of user notifications with real-time syncing.
 * Actions: Navigate to source post, individual deletion, and bulk clearing.
 */
export function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    async function fetchNotifications() {
      const result = await getNotifications();
      if (result.success && result.data) {
        setNotifications(result.data as Notification[]);
      }
    }

    const handleUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener("notificationsUpdated", handleUpdate);

    const unsubscribe = subscribeToUserEvents((event) => {
      if (event.type === "notifications_update") {
        fetchNotifications();
      }
    });

    return () => {
      window.removeEventListener("notificationsUpdated", handleUpdate);
      unsubscribe();
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    window.dispatchEvent(new Event("notificationsUpdated"));
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
    window.dispatchEvent(new Event("notificationsUpdated"));
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-end mb-2">
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleClearAll} 
          disabled={notifications.length === 0}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Clear all notifications
        </Button>
      </div>

      {/* Notification Stream */}
      {notifications.length === 0 ? (
        <p className="text-muted-foreground">No notifications yet.</p>
      ) : (
        notifications.map((n) => {
          // Dynamic text generation based on notification type
          let text = "";
          if (n.typeId === NOTIFICATION_TYPES.LIKE) text = `liked your post ${n.post?.title ? `"${n.post.title}"` : ""}`;
          else if (n.typeId === NOTIFICATION_TYPES.DISLIKE) text = `disliked your post ${n.post?.title ? `"${n.post.title}"` : ""}`;
          else if (n.typeId === NOTIFICATION_TYPES.COMMENT) text = `commented on your post ${n.post?.title ? `"${n.post.title}"` : ""}`;
          else if (n.typeId === NOTIFICATION_TYPES.DELETE_POST) text = "Your post was deleted";
          else if (n.typeId === NOTIFICATION_TYPES.DELETE_COMMENT) text = "Your comment was deleted";
          else if (n.typeId === NOTIFICATION_TYPES.MUTE) text = "You were muted";
          else if (n.typeId === NOTIFICATION_TYPES.BAN) text = "You were banned";

          const content = (
            <div className="flex gap-4 items-start w-full group relative">
              <Avatar className="h-10 w-10 shrink-0">
                {n.actor?.image ? (
                  <AvatarImage src={n.actor.image} alt={n.actor.name} />
                ) : null}
                <AvatarFallback>
                  {n.actor?.name?.charAt(0) ?? n.actor?.email?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 flex-1 min-w-0 pr-10">
                <p className="text-sm">
                  {n.actor && <span className="font-semibold">{n.actor.name} </span>}
                  {text}
                </p>
                {/* Optional administrative/moderation message */}
                {n.message && <p className="text-sm text-red-500 font-medium">{n.message}</p>}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              {/* Action: Delete notification */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDelete(e, n.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );

          // Interactive: Links to the relevant post if applicable
          if (n.postId && (n.typeId === NOTIFICATION_TYPES.LIKE || n.typeId === NOTIFICATION_TYPES.COMMENT || n.typeId === NOTIFICATION_TYPES.DISLIKE)) {
            return (
              <Link key={n.id} href={`/post/${n.postId}`} className="block p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors w-full">
                {content}
              </Link>
            );
          }

          return (
            <div key={n.id} className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors w-full">
              {content}
            </div>
          );
        })
      )}
    </div>
  );
}

