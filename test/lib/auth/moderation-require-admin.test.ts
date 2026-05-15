import { requireAdmin } from "../../../lib/auth/moderation";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  and: jest.fn(),
  desc: jest.fn(),
  eq: jest.fn(),
  gt: jest.fn(),
  isNull: jest.fn(),
  or: jest.fn(),
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

describe("requireAdmin", () => {
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const findSanctionsMock = db.query.userSanctions.findMany as unknown as jest.Mock;

  afterEach(() => jest.clearAllMocks());

  it("returns state for active admins", async () => {
    findUserMock.mockResolvedValue({ id: "admin-1", roleId: 1 });
    findSanctionsMock.mockResolvedValue([]);

    await expect(requireAdmin("admin-1")).resolves.toMatchObject({
      roleId: 1,
      userId: "admin-1",
    });
  });

  it("rejects non-admin users", async () => {
    findUserMock.mockResolvedValue({ id: "user-1", roleId: 3 });
    findSanctionsMock.mockResolvedValue([]);

    await expect(requireAdmin("user-1")).rejects.toThrow("Admin access required");
  });

  it("rejects banned admins", async () => {
    findUserMock.mockResolvedValue({ id: "admin-1", roleId: 1 });
    findSanctionsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
        expiresAt: null,
        id: "ban-1",
        reason: "banned",
        typeId: 1,
      },
    ]);

    await expect(requireAdmin("admin-1")).rejects.toThrow(
      "Banned users cannot access admin tools"
    );
  });
});
