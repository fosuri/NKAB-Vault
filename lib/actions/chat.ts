"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import {
  conversations,
  conversationParticipants,
  messages,
  MESSAGE_MEDIA_TYPES,
} from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";
import { ensureCanStartChat } from "@/lib/auth/moderation";
import { cloudinary } from "@/lib/cloudinary";

/**
 * Private Messaging and Conversation Orchestration Actions.
 */

/**
 * Initiates or retrieves an existing direct message conversation.
 */
export async function getOrCreateConversationAction(targetUserId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const currentUserId = session.user.id;

  if (currentUserId === targetUserId) {
    return { error: "You cannot chat with yourself" };
  }

  const modCheck = await ensureCanStartChat(currentUserId);
  if (!modCheck.allowed) return { error: modCheck.error };

  // 1. Check for existing shared conversation between the two users
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

  // 2. Transactional creation of new conversation + participants
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

  // 3. Real-time broadcast: signal both users to refresh chat lists
  const { chatEventEmitter } = await import("@/lib/events");
  chatEventEmitter.emit(`user:${currentUserId}`, { type: "new_conversation", conversationId: newConversationId! });
  chatEventEmitter.emit(`user:${targetUserId}`, { type: "new_conversation", conversationId: newConversationId! });

  revalidatePath("/chat");
  return { success: true, conversationId: newConversationId! };
}

/**
 * Lists conversations for the current user.
 */
export async function getUserConversationsAction() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const userId = session.user.id;

  // 1. Fetch conversations where user is a participant
  const userParticipantRecords = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, userId),
    with: {
      conversation: {
        with: {
          participants: {
            with: {
              user: {
                columns: { id: true, name: true, image: true },
              },
            },
          },
          messages: {
            orderBy: (messages, { desc }) => [desc(messages.createdAt)],
            limit: 1, // Preview of last message
          },
        },
      },
    },
  });

  // 2. Map results to identifying the "other" person
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

  // 3. Chronological sort (Latest activity first)
  formattedConversations.sort((a, b) => {
    const dateA = a.lastMessage?.createdAt || a.updatedAt;
    const dateB = b.lastMessage?.createdAt || b.updatedAt;
    return dateB.getTime() - dateA.getTime();
  });

  return { success: true, conversations: formattedConversations };
}

/**
 * Retrieves full message history.
 */
export async function getConversationMessagesAction(conversationId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  // Auth: verify user is in the room
  const participant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, session.user.id)
    ),
  });

  if (!participant) {
    return { error: "You do not have access to this conversation" };
  }

  // Fetch all messages in ascending order
  const conversationMessages = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    with: {
      sender: {
        columns: { id: true, name: true, image: true },
      },
    },
  });

  return { success: true, messages: conversationMessages };
}

/**
 * Synchronizes new messages with the database and real-time event stream.
 */
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

  const modCheck = await ensureCanStartChat(userId);
  if (!modCheck.allowed) return { error: modCheck.error };

  // Participant check
  const participants = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.conversationId, conversationId),
  });

  if (!participants.some(p => p.userId === userId)) {
    return { error: "You do not have access to this conversation" };
  }

  let newMessageData: any;

  // 1. Transactional: Insert message and update conversation 'last activity' timestamp
  await db.transaction(async (tx) => {
    const [newMessage] = await tx.insert(messages).values({
      conversationId,
      senderId: userId,
      content,
      mediaUrl,
      mediaTypeId: mediaType === "video" ? MESSAGE_MEDIA_TYPES.VIDEO : mediaType === "image" ? MESSAGE_MEDIA_TYPES.IMAGE : mediaType === "file" ? MESSAGE_MEDIA_TYPES.FILE : undefined,
      mediaPublicId,
    }).returning();

    newMessageData = newMessage;

    await tx.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  });

  // 2. Real-time Delivery
  if (newMessageData) {
    const { chatEventEmitter } = await import("@/lib/events");
    const payload = {
      ...newMessageData,
      sender: { id: userId, name: session.user.name, image: session.user.image }
    };

    // Emit to active chat room
    chatEventEmitter.emit(`chat:${conversationId}`, payload);
    // Emit to individual user sidebars/counters
    participants.forEach(p => {
      chatEventEmitter.emit(`user:${p.userId}`, { type: "new_message", conversationId });
    });
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);

  return { success: true, messageId: newMessageData.id };
}

/**
 * Permanently removes a message and its associated media assets.
 */
export async function deleteMessageAction(messageId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!msg || msg.senderId !== session.user.id) {
    return { error: "Forbidden" };
  }

  // 1. Media Cleanup
  if (msg.mediaPublicId) {
    try {
      const resourceType = msg.mediaTypeId === MESSAGE_MEDIA_TYPES.VIDEO ? "video" : "image";
      await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: resourceType });
    } catch (error) {
      console.error(error);
    }
  }

  // 2. Database Wipe
  await db.delete(messages).where(eq(messages.id, messageId));

  // 3. UI Synchronization
  const { chatEventEmitter } = await import("@/lib/events");
  chatEventEmitter.emit(`chat:${msg.conversationId}`, { type: "delete_message", messageId });

  revalidatePath("/chat");
  revalidatePath(`/chat/${msg.conversationId}`);

  return { success: true };
}

/**
 * Wipes an entire conversation history including all media and participant links.
 */
export async function deleteConversationAction(conversationId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  // Verify membership
  const participant = await db.query.conversationParticipants.findFirst({
    where: (cp, { and, eq }) => and(
      eq(cp.conversationId, conversationId),
      eq(cp.userId, session.user.id)
    ),
  });

  if (!participant) {
    return { error: "Forbidden" };
  }

  // 1. Identify and delete all attached media in the room
  const msgsWithMedia = await db.query.messages.findMany({
    where: (m, { and, eq, isNotNull }) => and(
      eq(m.conversationId, conversationId),
      isNotNull(m.mediaPublicId)
    ),
  });

  for (const msg of msgsWithMedia) {
    if (msg.mediaPublicId) {
      try {
        const resourceType = msg.mediaTypeId === MESSAGE_MEDIA_TYPES.VIDEO ? "video" : "image";
        await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: resourceType });
      } catch (error) {
        console.error(error);
      }
    }
  }

  // 2. Notify participants and drop from DB
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

/**
 * Counts unread messages for global badges.
 */
export async function getUnreadMessageCountAction() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated", count: 0 };
  }

  const userId = session.user.id;

  // 1. Identify all active chat IDs
  const participantRecords = await db.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, userId),
    columns: { conversationId: true },
  });

  const conversationIds = participantRecords.map((p) => p.conversationId);
  if (conversationIds.length === 0) return { success: true, count: 0 };

  // 2. Count unread messages not sent by the user
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

/**
 * Synchronizes the unread state of a conversation across participants.
 */
export async function markConversationMessagesAsReadAction(conversationId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const userId = session.user.id;

  // Security check
  const participant = await db.query.conversationParticipants.findFirst({
    where: (cp, { and, eq }) => and(
      eq(cp.conversationId, conversationId),
      eq(cp.userId, userId)
    ),
  });

  if (!participant) return { error: "Forbidden" };

  // 1. Update flag in DB
  await db.update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        eq(messages.isRead, false)
      )
    );

  // 2. Signal UI synchronization
  const { chatEventEmitter } = await import("@/lib/events");
  chatEventEmitter.emit(`chat:${conversationId}`, { type: "messages_read", readerId: userId });
  chatEventEmitter.emit(`user:${userId}`, { type: "messages_read" });

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);

  return { success: true };
}
