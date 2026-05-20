import { setUserRoleAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState, requireAdmin } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  desc: jest.fn((field) => ({ field, type: "desc" })),
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
    insert: jest.fn(),
    query: { user: { findFirst: jest.fn() } },
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: {
    ADD_MODERATOR: 40,
    REMOVE_MODERATOR: 41,
  },
  NOTIFICATION_TYPES: {},
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: "admin-action-log-table",
  comments: {},
  notifications: "notifications-table",
  posts: {},
  user: { id: "user.id" },
  userSanctions: {},
}));

function mutationBuilder() {
  return {
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

describe("setUserRoleAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const requireAdminMock = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
  const getModerationMock = getUserModerationState as jest.MockedFunction<
    typeof getUserModerationState
  >;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "admin-1" } } as never);
    requireAdminMock.mockResolvedValue({ roleId: 1 } as never);
    getModerationMock.mockResolvedValue({ activeBan: null } as never);
    findUserMock.mockResolvedValue({ id: "user-1", roleId: 3 });
    updateMock.mockReturnValue(mutationBuilder());
    insertMock.mockReturnValue(mutationBuilder());
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures that only users with the admin role can change other people's roles.
  it("returns auth errors from admin guard", async () => {
    requireAdminMock.mockRejectedValue(new Error("Admin access required"));

    await expect(setUserRoleAction("user-1", 2)).resolves.toEqual({
      error: "Admin access required",
    });
  });

  // Stops an admin from accidentally removing their own admin privileges.
  it("prevents admins from changing their own role", async () => {
    await expect(setUserRoleAction("admin-1", 3)).resolves.toEqual({
      error: "You cannot change your own role",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  // Ensures a user cannot become a moderator if their account is currently banned.
  it("prevents assigning moderator role to banned users", async () => {
    getModerationMock.mockResolvedValue({ activeBan: { id: "ban-1" } } as never);

    await expect(setUserRoleAction("user-1", 2)).resolves.toEqual({
      error: "Banned users cannot be assigned as moderators",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  // Verifies that the new role is saved, logged in the admin history, and the dashboard is refreshed.
  it("updates role, writes an audit log, and revalidates admin dashboard", async () => {
    const updateBuilder = mutationBuilder();
    const logBuilder = mutationBuilder();
    updateMock.mockReturnValue(updateBuilder);
    insertMock.mockReturnValue(logBuilder);

    await expect(setUserRoleAction("user-1", 2)).resolves.toEqual({ success: true });
    expect(updateBuilder.set).toHaveBeenCalledWith({ roleId: 2 });
    expect(logBuilder.values).toHaveBeenCalledWith({
      actionTypeId: 40,
      actorUserId: "admin-1",
      details: "Set role to moderator",
      targetCommentId: null,
      targetPostId: null,
      targetUserId: "user-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});
