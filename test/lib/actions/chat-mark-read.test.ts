import { markConversationMessagesAsReadAction } from "../../../lib/actions/chat";
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
jest.mock("@/lib/cloudinary", () => ({ cloudinary: { uploader: { destroy: jest.fn() } } }));
jest.mock("@/lib/db/db", () => ({
  db: {
    query: { conversationParticipants: { findFirst: jest.fn() } },
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: {},
  conversations: {},
  messages: { conversationId: "messages.conversationId", isRead: "messages.isRead", senderId: "messages.senderId" },
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

describe("markConversationMessagesAsReadAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findParticipantMock = db.query.conversationParticipants.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    updateMock.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("returns forbidden when the user is not a participant", async () => {
    findParticipantMock.mockResolvedValue(undefined);

    await expect(markConversationMessagesAsReadAction("conversation-1")).resolves.toEqual({
      error: "Forbidden",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("marks unread messages as read and emits sync events", async () => {
    findParticipantMock.mockResolvedValue({ id: "participant-1" });

    await expect(markConversationMessagesAsReadAction("conversation-1")).resolves.toEqual({
      success: true,
    });
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("chat:conversation-1", {
      readerId: "user-1",
      type: "messages_read",
    });
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("user:user-1", { type: "messages_read" });
    expect(revalidatePath).toHaveBeenCalledWith("/chat/conversation-1");
  });
});
