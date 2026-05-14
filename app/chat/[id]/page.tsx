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

/**
 * Individual Chat Conversation Page.
 * Loads and displays the message history for a specific conversation.
 */
export default async function ChatConversationPage({ params }: PageProps) {
  const resolvedParams = await params;
  const conversationId = resolvedParams.id;
  const session = await getSession();

  // Ensure the user is logged in
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const currentUserId = session.user.id;

  /**
   * Security & Access Check:
   * Verify that the current user is a participant in this conversation.
   * Also retrieve details of the other participant for the UI.
   */
  const participants = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.conversationId, conversationId),
    with: {
      user: {
        columns: { id: true, name: true, image: true }
      }
    }
  });

  // Redirect if current user is not a participant
  const currentUserParticipant = participants.find(p => p.userId === currentUserId);
  if (!currentUserParticipant) {
    redirect("/chat");
  }

  // Identify the other user in the 1-on-1 chat
  const otherUserParticipant = participants.find(p => p.userId !== currentUserId);
  const otherUser = otherUserParticipant?.user;

  if (!otherUser) {
    redirect("/chat");
  }

  // Fetch initial message history
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

