import { getOrCreateConversationAction } from "../../../lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  ne: jest.fn((field, value) => ({ field, type: "ne", value })),
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/events", () => ({ chatEventEmitter: { emit: jest.fn() } }));
jest.mock("@/lib/auth/moderation", () => ({
  ensureCanStartChat: jest.fn().mockResolvedValue({ allowed: true }),
}));
jest.mock("@/lib/db/db", () => ({
  db: {
    query: { conversationParticipants: { findMany: jest.fn() } },
    transaction: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: { conversationId: "cp.conversationId", userId: "cp.userId" },
  conversations: { id: "conversations.id" },
  messages: {},
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

function txBuilder() {
  return {
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: "conversation-new" }]),
    values: jest.fn().mockReturnThis(),
  };
}

describe("getOrCreateConversationAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findManyMock = db.query.conversationParticipants.findMany as unknown as jest.Mock;
  const transactionMock = db.transaction as unknown as jest.Mock;
  const emitMock = chatEventEmitter.emit as jest.MockedFunction<typeof chatEventEmitter.emit>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures you must be logged in to start or find a chat.
  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(getOrCreateConversationAction("user-2")).resolves.toEqual({
      error: "You must be signed in",
    });
  });

  // If a chat already exists between the two users, it simply returns that chat's ID.
  it("returns an existing shared conversation", async () => {
    findManyMock
      .mockResolvedValueOnce([{ conversationId: "conversation-1" }])
      .mockResolvedValueOnce([{ conversationId: "conversation-1" }]);

    await expect(getOrCreateConversationAction("user-2")).resolves.toEqual({
      conversationId: "conversation-1",
      success: true,
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  // If no chat exists, it creates a new one and notifies both users so it appears on their screens.
  it("creates a conversation and emits refresh events", async () => {
    const tx = txBuilder();
    findManyMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(getOrCreateConversationAction("user-2")).resolves.toEqual({
      conversationId: "conversation-new",
      success: true,
    });
    expect(emitMock).toHaveBeenCalledWith("user:user-1", {
      conversationId: "conversation-new",
      type: "new_conversation",
    });
    expect(emitMock).toHaveBeenCalledWith("user:user-2", {
      conversationId: "conversation-new",
      type: "new_conversation",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/chat");
  });
});
