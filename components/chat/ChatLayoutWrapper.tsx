"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

/**
 * Chat Layout Wrapper.
 * Provides the responsive structure for the chat interface, handling the 
 * visibility of the conversation list (sidebar) and the active chat room.
 */
export function ChatLayoutWrapper({
  sidebar,
  children
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Responsive check: determine if the user is currently inside a specific chat room
  const isChatRoom = pathname !== "/chat";

  /**
   * User-Level Real-Time Sync:
   * Listens for broad chat events (like conversation deletion or new chat alerts) 
   * that affect the user's overall chat state.
   */
  useEffect(() => {
    const eventSource = new EventSource("/api/chat/stream/user");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Force redirect if the active conversation is deleted by the other participant
        if (data.type === "delete_conversation" && pathname === `/chat/${data.conversationId}`) {
          router.push("/chat");
        } else {
          // Refresh data for new messages or conversation list updates
          router.refresh();
        }
      } catch (e) {
        router.refresh();
      }
    };

    eventSource.onerror = (error) => {
      console.error("User chat stream error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [router, pathname]);

  return (
    <div className="flex h-[calc(100%-4rem)] gap-0 md:gap-6 relative">
      {/* Sidebar: Conversation List. Hidden on mobile when inside a chat room. */}
      <div className={`w-full md:w-1/3 flex-col border-0 md:border border-border/50 md:rounded-xl bg-background md:bg-background/80 md:shadow-[0_24px_90px_rgba(15,23,42,0.08)] md:backdrop-blur overflow-hidden ${isChatRoom ? "hidden md:flex" : "flex"}`}>
        {sidebar}
      </div>
      
      {/* Main Content: Chat Room. Hidden on mobile when viewing the list. */}
      <div className={`flex-1 flex-col border-0 md:border border-border/50 md:rounded-xl bg-background md:bg-background/80 md:shadow-[0_24px_90px_rgba(15,23,42,0.08)] md:backdrop-blur overflow-hidden absolute md:relative inset-0 md:inset-auto z-10 md:z-0 ${isChatRoom ? "flex" : "hidden md:flex"}`}>
        {children}
      </div>
    </div>
  );
}

