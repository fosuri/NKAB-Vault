"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import {
  conversations,
  conversationParticipants,
  messages,
} from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";

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

  // Emit event to both users to update their sidebars
  const { chatEventEmitter } = await import("@/lib/events");
  chatEventEmitter.emit(`user:${currentUserId}`, { type: "new_conversation", conversationId: newConversationId! });
  chatEventEmitter.emit(`user:${targetUserId}`, { type: "new_conversation", conversationId: newConversationId! });

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

export async function sendMessageAction(
  conversationId: string, 
  content: string, 
  mediaUrl?: string, 
  mediaType?: string, 
  mediaPublicId?: string
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  if (!content.trim() && !mediaUrl) {
    return { error: "Message cannot be empty" };
  }

  const userId = session.user.id;

  const participants = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.conversationId, conversationId),
  });

  const participant = participants.find(p => p.userId === userId);

  if (!participant) {
    return { error: "You do not have access to this conversation" };
  }

  let newMessageData: any;

  await db.transaction(async (tx) => {
    const [newMessage] = await tx.insert(messages).values({
      conversationId,
      senderId: userId,
      content,
      mediaUrl,
      mediaType,
      mediaPublicId,
    }).returning();
    
    newMessageData = newMessage;

    await tx.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  });

  // Emit event to subscribers
  if (newMessageData) {
    const { chatEventEmitter } = await import("@/lib/events");
    const payload = {
      ...newMessageData,
      sender: {
        id: userId,
        name: session.user.name,
        image: session.user.image,
      }
    };
    
    // Emit to conversation stream
    chatEventEmitter.emit(`chat:${conversationId}`, payload);
    
    // Emit to all participants' personal streams (for sidebar refresh)
    participants.forEach(p => {
      chatEventEmitter.emit(`user:${p.userId}`, { type: "new_message", conversationId });
    });
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  
  return { success: true, messageId: newMessageData.id };
}

export async function deleteMessageAction(messageId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const userId = session.user.id;

  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!msg) {
    return { error: "Message not found" };
  }

  if (msg.senderId !== userId) {
    return { error: "You can only delete your own messages" };
  }

  // If the message has media, delete from Cloudinary
  if (msg.mediaPublicId) {
    try {
      const resourceType = msg.mediaType === "video" ? "video" : "image";
      await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: resourceType });
    } catch (error) {
      console.error("Failed to delete media from Cloudinary:", error);
    }
  }

  await db.delete(messages).where(eq(messages.id, messageId));

  revalidatePath("/chat");
  revalidatePath(`/chat/${msg.conversationId}`);

  return { success: true };
}

export async function deleteConversationAction(conversationId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const userId = session.user.id;

  const participant = await db.query.conversationParticipants.findFirst({
    where: (cp, { and, eq }) => and(
      eq(cp.conversationId, conversationId),
      eq(cp.userId, userId)
    ),
  });

  if (!participant) {
    return { error: "You do not have access to this conversation" };
  }

  const msgsWithMedia = await db.query.messages.findMany({
    where: (m, { and, eq, isNotNull }) => and(
      eq(m.conversationId, conversationId),
      isNotNull(m.mediaPublicId)
    ),
  });

  for (const msg of msgsWithMedia) {
    if (msg.mediaPublicId) {
      try {
        const resourceType = msg.mediaType === "video" ? "video" : "image";
        await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: resourceType });
      } catch (error) {
        console.error(error);
      }
    }
  }

  const allParticipants = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.conversationId, conversationId),
  });

  const { chatEventEmitter } = await import("@/lib/events");
  allParticipants.forEach(p => {
    chatEventEmitter.emit(`user:${p.userId}`, { type: "delete_conversation", conversationId });
  });

  await db.delete(conversations).where(eq(conversations.id, conversationId));

  revalidatePath("/chat");

  return { success: true };
}

export async function getUnreadMessageCountAction() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in", count: 0 };
  }

  const userId = session.user.id;

  const participantRecords = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, userId),
    columns: { conversationId: true },
  });

  const conversationIds = participantRecords.map((p) => p.conversationId);

  if (conversationIds.length === 0) {
    return { success: true, count: 0 };
  }



  const unreadMessages = await db.query.messages.findMany({
    where: (messages, { and, ne, inArray, eq }) => and(
      inArray(messages.conversationId, conversationIds),
      eq(messages.isRead, false),
      ne(messages.senderId, userId)
    ),
    columns: { id: true },
  });

  return { success: true, count: unreadMessages.length };
}

export async function markConversationMessagesAsReadAction(conversationId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const userId = session.user.id;

  const participant = await db.query.conversationParticipants.findFirst({
    where: (cp, { and, eq }) => and(
      eq(cp.conversationId, conversationId),
      eq(cp.userId, userId)
    ),
  });

  if (!participant) {
    return { error: "You do not have access to this conversation" };
  }

  await db.update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        eq(messages.isRead, false)
      )
    );

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  
  return { success: true };
}
