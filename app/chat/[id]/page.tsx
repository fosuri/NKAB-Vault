import { getConversationMessagesAction } from "@/lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { eq, and, ne } from "drizzle-orm";
import { conversationParticipants, user } from "@/lib/db/auth-schema";
import { redirect, notFound } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatConversationPage({ params }: PageProps) {
  const resolvedParams = await params;
  const conversationId = resolvedParams.id;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const currentUserId = session.user.id;

  // Verify access and get other user
  const participants = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.conversationId, conversationId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
        }
      }
    }
  });

  const currentUserParticipant = participants.find(p => p.userId === currentUserId);
  if (!currentUserParticipant) {
    redirect("/chat");
  }

  const otherUserParticipant = participants.find(p => p.userId !== currentUserId);
  const otherUser = otherUserParticipant?.user;

  if (!otherUser) {
    redirect("/chat");
  }

  const result = await getConversationMessagesAction(conversationId);
  const messages = result.success && result.messages ? result.messages : [];

  return (
    <ChatInterface 
      conversationId={conversationId} 
      initialMessages={messages} 
      currentUserId={currentUserId}
      otherUser={otherUser}
    />
  );
}
