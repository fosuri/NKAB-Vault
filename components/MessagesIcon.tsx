"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { getUnreadMessageCountAction } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";

export function MessagesIcon() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnreadCount() {
      const result = await getUnreadMessageCountAction();
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    }
    
    fetchUnreadCount();
  }, []);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/chat" aria-label="Messages">
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-600" />
        )}
      </Link>
    </Button>
  );
}
