import { issueSanctionAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { requireStaff } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  desc: jest.fn(),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  isNull: jest.fn((field) => ({ field, type: "isNull" })),
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
    delete: jest.fn(),
    insert: jest.fn(),
    query: {
      posts: { findMany: jest.fn() },
      user: { findFirst: jest.fn() },
      userSanctions: { findFirst: jest.fn() },
    },
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: {
    BAN_USER: 80,
    MUTE_USER: 81,
    REMOVE_MODERATOR: 82,
  },
  NOTIFICATION_TYPES: { BAN: 90, MUTE: 91 },
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: "admin-action-log-table",
  comments: { id: "comments.id", userId: "comments.userId" },
  notifications: "notifications-table",
  posts: { id: "posts.id", userId: "posts.userId" },
  user: { id: "user.id" },
  userSanctions: {
    id: "userSanctions.id",
    revokedAt: "userSanctions.revokedAt",
    typeId: "userSanctions.typeId",
    userId: "userSanctions.userId",
  },
}));

function builder(returningResult: Array<{ id: string }> = []) {
  return {
    returning: jest.fn().mockResolvedValue(returningResult),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockReturnThis(),
  };
}

describe("issueSanctionAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const requireStaffMock = requireStaff as jest.MockedFunction<typeof requireStaff>;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const findSanctionMock = db.query.userSanctions.findFirst as unknown as jest.Mock;
  const findPostsMock = db.query.posts.findMany as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "staff-1" } } as never);
    requireStaffMock.mockResolvedValue({ id: "staff-1", roleId: 1 } as never);
    findUserMock.mockResolvedValue({ id: "target-1", roleId: 3 });
    findSanctionMock.mockResolvedValue(undefined);
    findPostsMock.mockResolvedValue([]);
    insertMock.mockReturnValue(builder());
    updateMock.mockReturnValue(builder());
    deleteMock.mockReturnValue(builder([]));
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures that an admin or moderator cannot apply a ban or mute to their own account.
  it("prevents staff from sanctioning themselves", async () => {
    await expect(
      issueSanctionAction({ reason: "bad", targetUserId: "staff-1", type: "mute" })
    ).resolves.toEqual({ error: "You cannot sanction yourself" });
  });

  // Verifies that a valid reason must be provided when sanctioning a user.
  it("requires a non-empty reason", async () => {
    await expect(
      issueSanctionAction({ reason: "   ", targetUserId: "target-1", type: "mute" })
    ).resolves.toEqual({ error: "Reason is required" });
  });

  // Stops regular moderators from banning or muting admins.
  it("prevents moderators from sanctioning staff", async () => {
    requireStaffMock.mockResolvedValue({ id: "mod-1", roleId: 2 } as never);
    findUserMock.mockResolvedValue({ id: "target-1", roleId: 1 });

    await expect(
      issueSanctionAction({ reason: "bad", targetUserId: "target-1", type: "ban" })
    ).resolves.toEqual({ error: "Moderators cannot moderate admins or moderators" });
  });

  // Checks that the sanction is successfully applied, saved in the logs, and a notification is sent to the target user.
  it("creates a mute, writes log and notification, and emits update", async () => {
    await expect(
      issueSanctionAction({
        expiresAt: "2026-05-20T12:00:00.000Z",
        reason: " spam ",
        targetUserId: "target-1",
        type: "mute",
      })
    ).resolves.toEqual({ success: true });

    expect(insertMock).toHaveBeenCalledTimes(3);
    expect(chatEventEmitter.emit).toHaveBeenCalledWith("notifications:target-1", {
      type: "update",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/moderator");
  });
});
