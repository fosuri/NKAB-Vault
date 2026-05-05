"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import {
  conversations,
  conversationParticipants,
  messages,
  user,
} from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";

export async function getOrCreateConversationAction(targetUserId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const currentUserId = session.user.id;

  if (currentUserId === targetUserId) {
    return { error: "You cannot chat with yourself" };
  }

  const currentUserParticipant = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, currentUserId),
    columns: { conversationId: true },
  });

  const targetUserParticipant = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, targetUserId),
    columns: { conversationId: true },
  });

  const currentUserConvIds = currentUserParticipant.map((p) => p.conversationId);
  const targetUserConvIds = targetUserParticipant.map((p) => p.conversationId);

  const sharedConversationId = currentUserConvIds.find((id) =>
    targetUserConvIds.includes(id)
  );

  if (sharedConversationId) {
    return { success: true, conversationId: sharedConversationId };
  }

  let newConversationId: string;

  await db.transaction(async (tx) => {
    const [newConv] = await tx.insert(conversations).values({}).returning({ id: conversations.id });
    newConversationId = newConv.id;

    await tx.insert(conversationParticipants).values([
      {
        conversationId: newConversationId,
        userId: currentUserId,
      },
      {
        conversationId: newConversationId,
        userId: targetUserId,
      },
    ]);
  });

  revalidatePath("/chat");
  return { success: true, conversationId: newConversationId! };
}

export async function getUserConversationsAction() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const userId = session.user.id;

  const userParticipantRecords = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, userId),
    with: {
      conversation: {
        with: {
          participants: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            orderBy: (messages, { desc }) => [desc(messages.createdAt)],
            limit: 1,
          },
        },
      },
    },
  });

  const formattedConversations = userParticipantRecords.map((record) => {
    const conv = record.conversation;
    const otherParticipant = conv.participants.find((p) => p.userId !== userId)?.user;
    const lastMessage = conv.messages[0] || null;

    return {
      id: conv.id,
      updatedAt: conv.updatedAt,
      otherUser: otherParticipant,
      lastMessage,
    };
  });

  formattedConversations.sort((a, b) => {
    const dateA = a.lastMessage?.createdAt || a.updatedAt;
    const dateB = b.lastMessage?.createdAt || b.updatedAt;
    return dateB.getTime() - dateA.getTime();
  });

  return { success: true, conversations: formattedConversations };
}

export async function getConversationMessagesAction(conversationId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const userId = session.user.id;

  const participant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId)
    ),
  });

  if (!participant) {
    return { error: "You do not have access to this conversation" };
  }

  const conversationMessages = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    with: {
      sender: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return { success: true, messages: conversationMessages };
}

export async function sendMessageAction(conversationId: string, content: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  const userId = session.user.id;

  const participant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId)
    ),
  });

  if (!participant) {
    return { error: "You do not have access to this conversation" };
  }

  let newMessageId: string;

  await db.transaction(async (tx) => {
    const [newMessage] = await tx.insert(messages).values({
      conversationId,
      senderId: userId,
      content,
    }).returning({ id: messages.id });
    
    newMessageId = newMessage.id;

    await tx.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  });

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  
  return { success: true, messageId: newMessageId! };
}
