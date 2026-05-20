import { getUserModerationState } from "../../../lib/auth/moderation";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  desc: jest.fn((field) => ({ field, type: "desc" })),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
  gt: jest.fn((field, value) => ({ field, type: "gt", value })),
  isNull: jest.fn((field) => ({ field, type: "isNull" })),
  or: jest.fn((...conditions) => ({ conditions, type: "or" })),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      user: { findFirst: jest.fn() },
      userSanctions: { findMany: jest.fn() },
    },
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  ROLES: { ADMIN: 1, MODERATOR: 2, USER: 3 },
  SANCTION_TYPES: { BAN: 1, MUTE: 2 },
  user: { id: "user.id" },
  userSanctions: {
    createdAt: "userSanctions.createdAt",
    expiresAt: "userSanctions.expiresAt",
    revokedAt: "userSanctions.revokedAt",
    userId: "userSanctions.userId",
  },
}));

describe("getUserModerationState", () => {
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const findSanctionsMock = db.query.userSanctions.findMany as unknown as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the user does not exist", async () => {
    findUserMock.mockResolvedValue(undefined);

    await expect(getUserModerationState("user-1")).resolves.toBeNull();
    expect(findSanctionsMock).not.toHaveBeenCalled();
  });

  it("maps active ban and mute sanctions into moderation state", async () => {
    const createdAt = new Date("2026-05-15T12:00:00.000Z");
    const expiresAt = new Date("2026-05-16T12:00:00.000Z");
    findUserMock.mockResolvedValue({ id: "user-1", roleId: 3 });
    findSanctionsMock.mockResolvedValue([
      { id: "mute-1", typeId: 2, reason: "spam", expiresAt, createdAt },
      { id: "ban-1", typeId: 1, reason: "abuse", expiresAt: null, createdAt },
    ]);

    await expect(getUserModerationState("user-1")).resolves.toEqual({
      activeBan: {
        createdAt,
        expiresAt: null,
        id: "ban-1",
        reason: "abuse",
        type: "ban",
      },
      activeMute: {
        createdAt,
        expiresAt,
        id: "mute-1",
        reason: "spam",
        type: "mute",
      },
      roleId: 3,
      userId: "user-1",
    });
  });
});
