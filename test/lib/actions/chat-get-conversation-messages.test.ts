import { getConversationMessagesAction } from "../../../lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  ne: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/cloudinary", () => ({ cloudinary: { uploader: { destroy: jest.fn() } } }));
jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      conversationParticipants: { findFirst: jest.fn() },
      messages: { findMany: jest.fn() },
    },
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: { conversationId: "cp.conversationId", userId: "cp.userId" },
  conversations: {},
  messages: { conversationId: "messages.conversationId" },
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

describe("getConversationMessagesAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findParticipantMock = db.query.conversationParticipants.findFirst as unknown as jest.Mock;
  const findMessagesMock = db.query.messages.findMany as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
  });

  afterEach(() => jest.clearAllMocks());

  it("rejects non-participants", async () => {
    findParticipantMock.mockResolvedValue(undefined);

    await expect(getConversationMessagesAction("conversation-1")).resolves.toEqual({
      error: "You do not have access to this conversation",
    });
    expect(findMessagesMock).not.toHaveBeenCalled();
  });

  it("returns conversation messages for participants", async () => {
    const messages = [{ id: "message-1" }];
    findParticipantMock.mockResolvedValue({ id: "participant-1" });
    findMessagesMock.mockResolvedValue(messages);

    await expect(getConversationMessagesAction("conversation-1")).resolves.toEqual({
      messages,
      success: true,
    });
  });
});
