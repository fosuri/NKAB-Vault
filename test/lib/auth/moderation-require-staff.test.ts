import { requireStaff } from "../../../lib/auth/moderation";
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

describe("requireStaff", () => {
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const findSanctionsMock = db.query.userSanctions.findMany as unknown as jest.Mock;

  afterEach(() => jest.clearAllMocks());

  it("allows moderators", async () => {
    findUserMock.mockResolvedValue({ id: "mod-1", roleId: 2 });
    findSanctionsMock.mockResolvedValue([]);

    await expect(requireStaff("mod-1")).resolves.toMatchObject({
      roleId: 2,
      userId: "mod-1",
    });
  });

  it("allows admins", async () => {
    findUserMock.mockResolvedValue({ id: "admin-1", roleId: 1 });
    findSanctionsMock.mockResolvedValue([]);

    await expect(requireStaff("admin-1")).resolves.toMatchObject({ roleId: 1 });
  });

  it("rejects regular users", async () => {
    findUserMock.mockResolvedValue({ id: "user-1", roleId: 3 });
    findSanctionsMock.mockResolvedValue([]);

    await expect(requireStaff("user-1")).rejects.toThrow("Moderator access required");
  });
});
