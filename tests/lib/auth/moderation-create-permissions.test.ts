import {
  ensureCanCreateComment,
  ensureCanCreatePost,
} from "../../../lib/auth/moderation";
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

describe("content creation moderation permissions", () => {
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const findSanctionsMock = db.query.userSanctions.findMany as unknown as jest.Mock;

  afterEach(() => jest.clearAllMocks());

  it("returns user-not-found when no moderation state exists", async () => {
    findUserMock.mockResolvedValue(undefined);

    await expect(ensureCanCreatePost("missing")).resolves.toEqual({
      allowed: false,
      error: "User not found",
    });
  });

  it("blocks post creation for muted users", async () => {
    findUserMock.mockResolvedValue({ id: "user-1", roleId: 3 });
    findSanctionsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
        expiresAt: null,
        id: "mute-1",
        reason: "spam",
        typeId: 2,
      },
    ]);

    await expect(ensureCanCreatePost("user-1")).resolves.toEqual({
      allowed: false,
      error: "Your account is muted. You cannot create posts.",
    });
  });

  it("blocks comment creation for banned users", async () => {
    findUserMock.mockResolvedValue({ id: "user-1", roleId: 3 });
    findSanctionsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
        expiresAt: null,
        id: "ban-1",
        reason: "abuse",
        typeId: 1,
      },
    ]);

    await expect(ensureCanCreateComment("user-1")).resolves.toEqual({
      allowed: false,
      error: "Your account is banned",
    });
  });
});
