import { deleteMessageAction } from "../../../lib/actions/chat";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";

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
    delete: jest.fn(),
    query: { messages: { findFirst: jest.fn() } },
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: {},
  conversations: {},
  messages: { id: "messages.id" },
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

describe("deleteMessageAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findMessageMock = db.query.messages.findFirst as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;
  const destroyMock = cloudinary.uploader.destroy as jest.MockedFunction<typeof cloudinary.uploader.destroy>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    deleteMock.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
    destroyMock.mockResolvedValue({ result: "ok" } as never);
  });

  afterEach(() => jest.clearAllMocks());

  // Stops users from deleting messages that belong to someone else or don't exist.
  it("returns forbidden when the message is missing or owned by another user", async () => {
    findMessageMock.mockResolvedValue({ senderId: "user-2" });

    await expect(deleteMessageAction("message-1")).resolves.toEqual({ error: "Forbidden" });
  });

  // Checks that deleting a message successfully removes its attached media and updates the chat live.
  it("deletes owned message media and emits a delete event", async () => {
    findMessageMock.mockResolvedValue({
      conversationId: "conversation-1",
      mediaPublicId: "media-1",
      mediaTypeId: 2,
      senderId: "user-1",
    });

    await expect(deleteMessageAction("message-1")).resolves.toEqual({ success: true });
    expect(destroyMock).toHaveBeenCalledWith("media-1", { resource_type: "video" });
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("chat:conversation-1", {
      messageId: "message-1",
      type: "delete_message",
    });
  });
});
