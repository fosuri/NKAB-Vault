import { deleteConversationAction } from "../../../lib/actions/chat";
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
    query: {
      conversationParticipants: { findFirst: jest.fn(), findMany: jest.fn() },
      messages: { findMany: jest.fn() },
    },
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  conversationParticipants: { conversationId: "cp.conversationId" },
  conversations: { id: "conversations.id" },
  messages: {},
  MESSAGE_MEDIA_TYPES: { FILE: 3, IMAGE: 1, VIDEO: 2 },
}));

describe("deleteConversationAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findParticipantMock = db.query.conversationParticipants.findFirst as unknown as jest.Mock;
  const findParticipantsMock = db.query.conversationParticipants.findMany as unknown as jest.Mock;
  const findMessagesMock = db.query.messages.findMany as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findParticipantMock.mockResolvedValue({ id: "participant-1" });
    findParticipantsMock.mockResolvedValue([{ userId: "user-1" }, { userId: "user-2" }]);
    findMessagesMock.mockResolvedValue([{ mediaPublicId: "media-1", mediaTypeId: 1 }]);
    deleteMock.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures that users cannot delete a conversation they are not a part of.
  it("rejects users who are not participants", async () => {
    findParticipantMock.mockResolvedValue(undefined);

    await expect(deleteConversationAction("conversation-1")).resolves.toEqual({ error: "Forbidden" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  // Verifies that deleting a conversation also removes its media files, notifies the other user, and deletes the record.
  it("destroys media, notifies participants, and deletes the conversation", async () => {
    await expect(deleteConversationAction("conversation-1")).resolves.toEqual({ success: true });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("media-1", { resource_type: "image" });
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("user:user-2", {
      conversationId: "conversation-1",
      type: "delete_conversation",
    });
    expect(deleteMock).toHaveBeenCalled();
  });
});
