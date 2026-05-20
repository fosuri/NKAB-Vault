import { adminDeletePostAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { requireStaff } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";

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
    query: { posts: { findFirst: jest.fn() }, user: { findFirst: jest.fn() } },
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: { DELETE_POST: 60 },
  NOTIFICATION_TYPES: { DELETE_POST: 70 },
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: "admin-action-log-table",
  comments: {},
  notifications: "notifications-table",
  posts: { id: "posts.id" },
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

describe("adminDeletePostAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const requireStaffMock = requireStaff as jest.MockedFunction<typeof requireStaff>;
  const findPostMock = db.query.posts.findFirst as unknown as jest.Mock;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "admin-1" } } as never);
    requireStaffMock.mockResolvedValue({ id: "admin-1", roleId: 1 } as never);
    findPostMock.mockResolvedValue({ id: "post-1", userId: "author-1" });
    findUserMock.mockResolvedValue({ roleId: 3 });
    updateMock.mockReturnValue(builder());
    insertMock.mockReturnValue(builder());
  });

  afterEach(() => jest.clearAllMocks());

  // Returns an error if the target post does not exist in the database.
  it("returns an error when the post is missing", async () => {
    findPostMock.mockResolvedValue(undefined);

    await expect(adminDeletePostAction("post-1")).resolves.toEqual({ error: "Post not found" });
  });

  // Ensures that lower-level staff (moderators) cannot delete posts created by higher-level staff (admins).
  it("prevents moderators from deleting staff posts", async () => {
    requireStaffMock.mockResolvedValue({ id: "mod-1", roleId: 2 } as never);
    findUserMock.mockResolvedValue({ roleId: 1 });

    await expect(adminDeletePostAction("post-1")).resolves.toEqual({
      error: "Moderators cannot moderate admins or moderators",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  // Confirms that the post is successfully deleted and the author receives a notification.
  it("soft deletes a post and notifies its author", async () => {
    const updateBuilder = builder();
    updateMock.mockReturnValue(updateBuilder);

    await expect(adminDeletePostAction("post-1")).resolves.toEqual({ success: true });
    expect(updateBuilder.set).toHaveBeenCalledWith({ deletedByStaffAt: expect.any(Date) });
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("notifications:author-1", {
      type: "update",
    });
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});
