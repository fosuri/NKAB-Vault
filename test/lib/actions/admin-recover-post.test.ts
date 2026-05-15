import { recoverPostAction } from "../../../lib/actions/admin";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  desc: jest.fn((field) => ({ field, type: "desc" })),
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
jest.mock("@/lib/db/db", () => ({ db: { transaction: jest.fn() } }));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: { DELETE_POST: 60, RECOVER_POST: 62 },
  NOTIFICATION_TYPES: {},
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: {
    actionTypeId: "adminActionLog.actionTypeId",
    createdAt: "adminActionLog.createdAt",
    id: "adminActionLog.id",
    targetPostId: "adminActionLog.targetPostId",
  },
  comments: {},
  notifications: {},
  posts: { id: "posts.id" },
  user: {},
  userSanctions: {},
}));

function txBuilder() {
  return {
    from: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ id: "log-1" }]),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };
}

describe("recoverPostAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const getModerationMock = getUserModerationState as jest.MockedFunction<
    typeof getUserModerationState
  >;
  const transactionMock = db.transaction as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "staff-1" } } as never);
    getModerationMock.mockResolvedValue({ roleId: 2 } as never);
    transactionMock.mockImplementation(async (callback) => callback(txBuilder()));
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures that an anonymous user cannot use the post recovery feature.
  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(recoverPostAction("post-1")).resolves.toEqual({ error: "Not authenticated" });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  // Verifies that only staff members (admins/moderators) can recover posts, regular users cannot.
  it("requires staff role", async () => {
    getModerationMock.mockResolvedValue({ roleId: 3 } as never);

    await expect(recoverPostAction("post-1")).resolves.toEqual({ error: "Not authorized" });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  // Confirms the post is successfully un-deleted and staff review pages are refreshed.
  it("restores post and revalidates review surfaces", async () => {
    await expect(recoverPostAction("post-1")).resolves.toEqual({ success: true });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/review/post-1");
  });
});
