import { recoverCommentAction } from "../../../lib/actions/admin";
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
jest.mock("@/lib/db/db", () => ({
  db: {
    query: { comments: { findFirst: jest.fn() } },
    transaction: jest.fn(),
  },
}));
jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: { DELETE_COMMENT: 61, RECOVER_COMMENT: 63 },
  NOTIFICATION_TYPES: {},
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  adminActionLog: {
    actionTypeId: "adminActionLog.actionTypeId",
    createdAt: "adminActionLog.createdAt",
    id: "adminActionLog.id",
    targetCommentId: "adminActionLog.targetCommentId",
  },
  comments: { id: "comments.id" },
  notifications: {},
  posts: {},
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

describe("recoverCommentAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const getModerationMock = getUserModerationState as jest.MockedFunction<
    typeof getUserModerationState
  >;
  const findCommentMock = db.query.comments.findFirst as unknown as jest.Mock;
  const transactionMock = db.transaction as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "staff-1" } } as never);
    getModerationMock.mockResolvedValue({ roleId: 1 } as never);
    findCommentMock.mockResolvedValue({ postId: "post-1" });
    transactionMock.mockImplementation(async (callback) => callback(txBuilder()));
  });

  afterEach(() => jest.clearAllMocks());

  // Checks that an unauthenticated user cannot access the comment recovery feature.
  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(recoverCommentAction("comment-1")).resolves.toEqual({
      error: "Not authenticated",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  // Confirms the comment is successfully recovered and the corresponding post page is refreshed.
  it("restores comment and revalidates the owning post", async () => {
    await expect(recoverCommentAction("comment-1")).resolves.toEqual({ success: true });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/post/post-1");
    expect(revalidatePath).toHaveBeenCalledWith("/staff/review/post-1");
  });
});
