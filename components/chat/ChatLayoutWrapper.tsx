"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function ChatLayoutWrapper({
  sidebar,
  children
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isChatRoom = pathname !== "/chat";

  return (
    <div className="flex h-[calc(100%-4rem)] gap-0 md:gap-6 relative">
      <div className={`w-full md:w-1/3 flex-col border-0 md:border border-border/50 md:rounded-xl bg-background md:bg-background/80 md:shadow-[0_24px_90px_rgba(15,23,42,0.08)] md:backdrop-blur overflow-hidden ${isChatRoom ? "hidden md:flex" : "flex"}`}>
        {sidebar}
      </div>
      
      <div className={`flex-1 flex-col border-0 md:border border-border/50 md:rounded-xl bg-background md:bg-background/80 md:shadow-[0_24px_90px_rgba(15,23,42,0.08)] md:backdrop-blur overflow-hidden absolute md:relative inset-0 md:inset-auto z-10 md:z-0 ${isChatRoom ? "flex" : "hidden md:flex"}`}>
        {children}
      </div>
    </div>
  );
}
