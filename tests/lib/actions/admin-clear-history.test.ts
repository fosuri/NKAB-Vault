import { clearMyAdminHistoryAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { requireStaff } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
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
  db: { delete: jest.fn() },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: {},
  NOTIFICATION_TYPES: {},
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: { actorUserId: "adminActionLog.actorUserId" },
  comments: {},
  notifications: {},
  posts: {},
  user: {},
  userSanctions: {},
}));

describe("clearMyAdminHistoryAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const requireStaffMock = requireStaff as jest.MockedFunction<typeof requireStaff>;
  const deleteMock = db.delete as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "admin-1" } } as never);
    requireStaffMock.mockResolvedValue({ id: "admin-1", roleId: 1 } as never);
    deleteMock.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
  });

  afterEach(() => jest.clearAllMocks());

  // Verifies that the action fails if the user lacks moderator or admin privileges.
  it("returns guard errors", async () => {
    requireStaffMock.mockRejectedValue(new Error("Moderator access required"));

    await expect(clearMyAdminHistoryAction()).resolves.toEqual({
      error: "Moderator access required",
    });
  });

  // Ensures that all past admin actions by the current user are deleted and admin dashboards are updated.
  it("deletes the current staff actor history and revalidates dashboards", async () => {
    await expect(clearMyAdminHistoryAction()).resolves.toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalledWith({ actorUserId: "adminActionLog.actorUserId" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/moderator");
  });
});
