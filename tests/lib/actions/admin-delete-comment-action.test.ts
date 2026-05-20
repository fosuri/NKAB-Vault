import { adminDeleteCommentAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { requireStaff } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn(),
  desc: jest.fn(),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  isNull: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/moderation", () => ({
  getUserModerationState: jest.fn(),
  requireAdmin: jest.fn(),
  requireStaff: jest.fn(),
}));
jest.mock("@/lib/cloudinary", () => ({ cloudinary: { uploader: { destroy: jest.fn() } } }));
jest.mock("@/lib/events", () => ({ chatEventEmitter: { emit: jest.fn() } }));
jest.mock("@/lib/db/db", () => ({
  db: {
    insert: jest.fn(),
    query: { comments: { findFirst: jest.fn() }, user: { findFirst: jest.fn() } },
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: { DELETE_COMMENT: 61 },
  NOTIFICATION_TYPES: { DELETE_COMMENT: 71 },
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: "admin-action-log-table",
  comments: { id: "comments.id" },
  notifications: "notifications-table",
  posts: {},
  user: { id: "user.id" },
  userSanctions: {},
}));

function builder() {
  return {
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

describe("adminDeleteCommentAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const requireStaffMock = requireStaff as jest.MockedFunction<typeof requireStaff>;
  const findCommentMock = db.query.comments.findFirst as unknown as jest.Mock;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "admin-1" } } as never);
    requireStaffMock.mockResolvedValue({ id: "admin-1", roleId: 1 } as never);
    findCommentMock.mockResolvedValue({ id: "comment-1", postId: "post-1", userId: "author-1" });
    findUserMock.mockResolvedValue({ roleId: 3 });
    updateMock.mockReturnValue(builder());
    insertMock.mockReturnValue(builder());
  });

  afterEach(() => jest.clearAllMocks());

  // Returns an error if the comment we are trying to delete does not exist.
  it("returns an error when the comment is missing", async () => {
    findCommentMock.mockResolvedValue(undefined);

    await expect(adminDeleteCommentAction("comment-1")).resolves.toEqual({
      error: "Comment not found",
    });
  });

  // Verifies that the comment is removed, the author gets a notification, and the post's page is refreshed.
  it("soft deletes comment, notifies author, and revalidates post path", async () => {
    await expect(adminDeleteCommentAction("comment-1")).resolves.toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("notifications:author-1", {
      type: "update",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/post/post-1");
  });
});
