"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { getUnreadMessageCountAction } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Messages Icon Component.
 * Displays a message icon in the header with a real-time unread count badge.
 * Updates are pushed via Server-Sent Events (SSE) when new messages arrive.
 */
export function MessagesIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  // Fetches the current unread count from the server
  const fetchUnreadCount = async () => {
    const result = await getUnreadMessageCountAction();
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Listen for real-time chat events (new messages, read receipts)
    const eventSource = new EventSource("/api/chat/stream/user");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Refresh count if a relevant chat event occurs
        if (data.type === "new_message" || data.type === "messages_read" || data.type === "delete_conversation") {
          fetchUnreadCount();
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/chat" aria-label="Messages">
        <MessageCircle className="h-5 w-5" />
        {/* Unread Badge: Visible only when count > 0 */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-600" />
        )}
      </Link>
    </Button>
  );
}

