import { getUnreadMessageCountAction } from "../../../lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({ and: jest.fn(), eq: jest.fn(), ne: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/cloudinary", () => ({ cloudinary: { uploader: { destroy: jest.fn() } } }));
jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      conversationParticipants: { findMany: jest.fn() },
      messages: { findMany: jest.fn() },
    },
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: { userId: "cp.userId" },
  conversations: {},
  messages: {},
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

describe("getUnreadMessageCountAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findParticipantsMock = db.query.conversationParticipants.findMany as unknown as jest.Mock;
  const findMessagesMock = db.query.messages.findMany as unknown as jest.Mock;

  afterEach(() => jest.clearAllMocks());

  it("returns zero for unauthenticated users", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(getUnreadMessageCountAction()).resolves.toEqual({
      count: 0,
      error: "Not authenticated",
    });
  });

  it("returns zero when the user has no conversations", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findParticipantsMock.mockResolvedValue([]);

    await expect(getUnreadMessageCountAction()).resolves.toEqual({ count: 0, success: true });
    expect(findMessagesMock).not.toHaveBeenCalled();
  });

  it("counts unread messages from other users", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findParticipantsMock.mockResolvedValue([{ conversationId: "conversation-1" }]);
    findMessagesMock.mockResolvedValue([{ id: "msg-1" }, { id: "msg-2" }]);

    await expect(getUnreadMessageCountAction()).resolves.toEqual({ count: 2, success: true });
  });
});
