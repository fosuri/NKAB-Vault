import { revokeSanctionAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { requireStaff } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";

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
    insert: jest.fn(),
    query: { userSanctions: { findFirst: jest.fn() } },
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: { REVOKE_SANCTION: 50 },
  NOTIFICATION_TYPES: {},
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: "admin-action-log-table",
  comments: {},
  notifications: {},
  posts: {},
  user: {},
  userSanctions: { id: "userSanctions.id", revokedAt: "userSanctions.revokedAt" },
}));

function builder() {
  return {
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

describe("revokeSanctionAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const requireStaffMock = requireStaff as jest.MockedFunction<typeof requireStaff>;
  const findSanctionMock = db.query.userSanctions.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "admin-1" } } as never);
    requireStaffMock.mockResolvedValue({ id: "admin-1", roleId: 1 } as never);
    findSanctionMock.mockResolvedValue({
      id: "sanction-1",
      targetUser: { roleId: 3 },
      typeId: 1,
      userId: "user-1",
    });
    updateMock.mockReturnValue(builder());
    insertMock.mockReturnValue(builder());
  });

  afterEach(() => jest.clearAllMocks());

  // Returns an error if the targeted sanction does not exist or has already been revoked.
  it("returns an error when sanction is missing", async () => {
    findSanctionMock.mockResolvedValue(undefined);

    await expect(revokeSanctionAction("sanction-1")).resolves.toEqual({
      error: "Sanction not found or already revoked",
    });
  });

  // Prevents moderators from revoking sanctions that were placed on admins.
  it("prevents moderators from revoking staff sanctions", async () => {
    requireStaffMock.mockResolvedValue({ id: "mod-1", roleId: 2 } as never);
    findSanctionMock.mockResolvedValue({
      id: "sanction-1",
      targetUser: { roleId: 1 },
      typeId: 1,
      userId: "admin-target",
    });

    await expect(revokeSanctionAction("sanction-1")).resolves.toEqual({
      error: "Moderators cannot moderate admins or moderators",
    });
  });

  // Checks that the ban or mute is successfully lifted and the action is recorded in the admin audit log.
  it("revokes sanction and writes an audit log", async () => {
    const updateBuilder = builder();
    const logBuilder = builder();
    updateMock.mockReturnValue(updateBuilder);
    insertMock.mockReturnValue(logBuilder);

    await expect(revokeSanctionAction("sanction-1")).resolves.toEqual({ success: true });
    expect(updateBuilder.set).toHaveBeenCalledWith({
      revokedAt: expect.any(Date),
      revokedByUserId: "admin-1",
    });
    expect(logBuilder.values).toHaveBeenCalledWith({
      actionTypeId: 50,
      actorUserId: "admin-1",
      details: "Revoked ban",
      targetCommentId: null,
      targetPostId: null,
      targetUserId: "user-1",
    });
  });
});
