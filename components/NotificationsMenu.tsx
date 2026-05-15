"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getNotifications, markNotificationsAsRead, deleteNotification, clearAllNotifications } from "@/lib/actions/notifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
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
 * Notifications Dropdown Menu.
 * Provides a quick-access preview of recent notifications in the global header.
 * Syncs in real-time via SSE and marks all as 'read' upon menu opening.
 */
export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      const result = await getNotifications();
      if (result.success && result.data) {
        const notificationsData = result.data as unknown as Notification[];
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter((n) => !n.isRead).length);
      }
    }
    fetchNotifications();

    const handleUpdate = () => {
      fetchNotifications();
    };

    // Listen for local and remote updates
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

  /**
   * Menu Visibility Toggle:
   * Marks unread notifications as read on the server when the menu is opened.
   */
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      await markNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

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
    setUnreadCount(0);
    setIsOpen(false);
    window.dispatchEvent(new Event("notificationsUpdated"));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Real-time unread count indicator */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-600" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex items-start gap-2 p-3 pr-8 relative group" asChild>
                {/* Navigation: Links to relevant post content where applicable */}
                {notification.postId && (notification.typeId === NOTIFICATION_TYPES.LIKE || notification.typeId === NOTIFICATION_TYPES.COMMENT || notification.typeId === NOTIFICATION_TYPES.DISLIKE) ? (
                  <Link href={`/post/${notification.postId}`} className="cursor-pointer w-full">
                    <NotificationContent notification={notification} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <div className="w-full relative">
                    <NotificationContent notification={notification} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        {/* Footer actions: Clear all or view full history */}
        <div className="flex items-center justify-between p-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={handleClearAll} disabled={notifications.length === 0}>
            Clear all
          </Button>
          <Button variant="default" size="sm" className="text-xs" asChild>
            <Link href="/notifications" onClick={() => setIsOpen(false)}>
              See all notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Shared Notification Content Fragment.
 * Formats the actor avatar, action text, and relative timestamp.
 */
function NotificationContent({ notification }: { notification: Notification }) {
  let text = "";
  if (notification.typeId === NOTIFICATION_TYPES.LIKE) {
    text = `liked your post ${notification.post?.title ? `"${notification.post.title}"` : ""}`;
  } else if (notification.typeId === NOTIFICATION_TYPES.DISLIKE) {
    text = `disliked your post ${notification.post?.title ? `"${notification.post.title}"` : ""}`;
  } else if (notification.typeId === NOTIFICATION_TYPES.COMMENT) {
    text = `commented on your post ${notification.post?.title ? `"${notification.post.title}"` : ""}`;
  } else if (notification.typeId === NOTIFICATION_TYPES.DELETE_POST) {
    text = "Your post was deleted";
  } else if (notification.typeId === NOTIFICATION_TYPES.DELETE_COMMENT) {
    text = "Your comment was deleted";
  } else if (notification.typeId === NOTIFICATION_TYPES.MUTE) {
    text = "You were muted";
  } else if (notification.typeId === NOTIFICATION_TYPES.BAN) {
    text = "You were banned";
  }

  return (
    <div className="flex gap-3 w-full">
      <Avatar className="h-8 w-8 mt-1">
        {notification.actor?.image ? (
          <AvatarImage src={notification.actor.image} alt={notification.actor.name} />
        ) : null}
        <AvatarFallback>
          {notification.actor?.name?.charAt(0) ?? notification.actor?.email?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {notification.actor && <span className="font-semibold">{notification.actor.name} </span>}
          {text}
        </p>
        {notification.message && (
          <p className="text-xs text-red-500 font-medium">{notification.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

