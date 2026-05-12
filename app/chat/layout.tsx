import { getUserConversationsAction } from "@/lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ChatLayoutWrapper } from "@/components/chat/ChatLayoutWrapper";

export const metadata = {
  title: "Messages | NKAB Vault",
  description: "View all your conversations",
};

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const result = await getUserConversationsAction();
  const conversations = result.success && result.conversations ? result.conversations : [];

  const sidebar = (
    <>
      <div className="p-4 border-b border-border/50 bg-muted/20 font-semibold">
        Conversations
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            You don&apos;t have any conversations yet. Visit a user&apos;s profile to start a chat.
          </div>
        ) : (
          conversations.map((conv) => {
            const otherUser = conv.otherUser;
            const lastMessage = conv.lastMessage;

            const isUnread = lastMessage &&
              !lastMessage.isRead &&
              lastMessage.senderId !== session.user.id;

            return (
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <Card className={`p-3 hover:bg-accent/50 border-none shadow-none transition-colors flex flex-row items-center gap-3 ${isUnread ? 'bg-accent/20 border-l-4 border-l-red-500 rounded-l-none' : ''}`}>
                  <Avatar className="h-10 w-10 shrink-0">
                    {otherUser?.image ? (
                      <AvatarImage src={otherUser.image} alt={otherUser?.name || "User"} />
                    ) : null}
                    <AvatarFallback>
                      {otherUser?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h2 className="text-sm font-semibold truncate">
                        {otherUser?.name || "Unknown User"}
                      </h2>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 shrink-0">
                        {lastMessage?.createdAt || conv.updatedAt ? formatDistanceToNow(new Date(lastMessage?.createdAt || conv.updatedAt), { addSuffix: true }) : ''}
                      </span>
                    </div>

                    <p className={`text-xs truncate ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {lastMessage ? (
                        <>
                          {lastMessage.senderId === session.user.id && <span className="text-[10px] mr-1 opacity-70">You:</span>}
                          {lastMessage.content}
                        </>
                      ) : (
                        <span className="italic">No messages yet</span>
                      )}
                    </p>
                  </div>

                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-1"></div>
                  )}
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="container max-w-6xl mx-auto md:py-8 md:px-4 h-[calc(100vh-4rem)]">
      <h1 className="text-2xl md:text-3xl font-bold p-4 md:p-0 md:mb-6 hidden md:block">Messages</h1>

      <ChatLayoutWrapper sidebar={sidebar}>
        {children}
      </ChatLayoutWrapper>
    </div>
  );
}
