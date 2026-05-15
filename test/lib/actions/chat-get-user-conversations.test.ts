import { getUserConversationsAction } from "../../../lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  and: jest.fn(),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  ne: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/cloudinary", () => ({ cloudinary: { uploader: { destroy: jest.fn() } } }));
jest.mock("@/lib/db/db", () => ({
  db: { query: { conversationParticipants: { findMany: jest.fn() } } },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: { userId: "cp.userId" },
  conversations: {},
  messages: {},
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

describe("getUserConversationsAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findManyMock = db.query.conversationParticipants.findMany as unknown as jest.Mock;

  afterEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(getUserConversationsAction()).resolves.toEqual({
      error: "You must be signed in",
    });
  });

  it("formats and sorts conversations by latest activity", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findManyMock.mockResolvedValue([
      {
        conversation: {
          id: "older",
          messages: [{ createdAt: new Date("2026-05-14T12:00:00.000Z"), id: "msg-1" }],
          participants: [{ userId: "user-2", user: { id: "user-2", name: "Bob" } }],
          updatedAt: new Date("2026-05-15T10:00:00.000Z"),
        },
      },
      {
        conversation: {
          id: "newer",
          messages: [],
          participants: [{ userId: "user-3", user: { id: "user-3", name: "Cara" } }],
          updatedAt: new Date("2026-05-15T11:00:00.000Z"),
        },
      },
    ]);

    await expect(getUserConversationsAction()).resolves.toMatchObject({
      conversations: [
        { id: "newer", otherUser: { id: "user-3", name: "Cara" } },
        { id: "older", otherUser: { id: "user-2", name: "Bob" } },
      ],
      success: true,
    });
  });
});
