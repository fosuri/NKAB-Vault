import { sendMessageAction } from "../../../lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn(),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  ne: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/events", () => ({ chatEventEmitter: { emit: jest.fn() } }));
jest.mock("@/lib/cloudinary", () => ({ cloudinary: { uploader: { destroy: jest.fn() } } }));
jest.mock("@/lib/db/db", () => ({
  db: {
    query: { conversationParticipants: { findMany: jest.fn() } },
    transaction: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: { conversationId: "cp.conversationId" },
  conversations: { id: "conversations.id" },
  messages: "messages-table",
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

function txBuilder() {
  return {
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: "message-1", content: "Hello" }]),
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

describe("sendMessageAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findParticipantsMock = db.query.conversationParticipants.findMany as unknown as jest.Mock;
  const transactionMock = db.transaction as unknown as jest.Mock;
  const emitMock = chatEventEmitter.emit as jest.MockedFunction<typeof chatEventEmitter.emit>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-1", image: "avatar.png", name: "Alice" },
    } as never);
    findParticipantsMock.mockResolvedValue([{ userId: "user-1" }, { userId: "user-2" }]);
  });

  afterEach(() => jest.clearAllMocks());

  // Stops the user from sending a completely blank message (if there is no picture or file attached).
  it("rejects empty messages without media", async () => {
    await expect(sendMessageAction("conversation-1", "   ")).resolves.toEqual({
      error: "Message cannot be empty",
    });
  });

  // Ensures you cannot send messages to a chat that you are not a part of.
  it("rejects users outside the conversation", async () => {
    findParticipantsMock.mockResolvedValue([{ userId: "user-2" }]);

    await expect(sendMessageAction("conversation-1", "Hello")).resolves.toEqual({
      error: "You do not have access to this conversation",
    });
  });

  // Checks that a valid message is saved, the live chat updates, and the chat screen refreshes.
  it("stores a message, emits events, and revalidates chat paths", async () => {
    const tx = txBuilder();
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(sendMessageAction("conversation-1", "Hello", "url", "image", "media-1")).resolves.toEqual({
      messageId: "message-1",
      success: true,
    });
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Hello", mediaTypeId: 1, senderId: "user-1" })
    );
    expect(emitMock).toHaveBeenCalledWith("chat:conversation-1", expect.objectContaining({ id: "message-1" }));
    expect(emitMock).toHaveBeenCalledWith("user:user-2", {
      conversationId: "conversation-1",
      type: "new_message",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/chat/conversation-1");
  });
});
