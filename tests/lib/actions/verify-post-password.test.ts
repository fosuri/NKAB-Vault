import { verifyPostPassword } from "../../../lib/actions/verify-post-password";
import { db } from "@/lib/db/db";
import { createOneTimePostAccessToken, verifyPostPassword as verifyPasswordValue } from "@/lib/post-password";

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((field, value) => ({ field, value })),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      posts: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  ACCESS_TYPES: {
    PUBLIC: 1,
    PRIVATE: 2,
    PAID: 3,
  },
  posts: {
    id: "posts.id",
  },
}));

jest.mock("@/lib/post-password", () => ({
  createOneTimePostAccessToken: jest.fn(() => "one-time-unlock-token"),
  verifyPostPassword: jest.fn(),
}));

describe("verifyPostPassword action", () => {
  const findPost = jest.mocked(db.query.posts.findFirst);
  const post = (overrides: { accessTypeId: number; password: string | null }) => ({
    id: "post-1",
    createdAt: new Date("2026-05-15T12:00:00.000Z"),
    updatedAt: new Date("2026-05-15T12:00:00.000Z"),
    userId: "user-1",
    title: "Test post",
    description: "Test description",
    deletedByStaffAt: null,
    ...overrides,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Handles errors if the locked post does not exist.
  it("returns an error when the post does not exist", async () => {
    findPost.mockResolvedValue(undefined);

    await expect(verifyPostPassword("missing-post", "secret")).resolves.toEqual({
      valid: false,
      error: "Post not found",
    });
  });

  // Bypasses the password check entirely if the post is actually public.
  it("allows access when the post is not private", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 1, password: "stored-password" }));

    await expect(verifyPostPassword("public-post", "wrong")).resolves.toEqual({ valid: true });
    expect(verifyPasswordValue).not.toHaveBeenCalled();
    expect(createOneTimePostAccessToken).not.toHaveBeenCalled();
  });

  // Allows entry if the post is marked private but the author forgot to set a password.
  it("allows access when a private post has no password stored", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 2, password: null }));

    await expect(verifyPostPassword("private-post", "secret")).resolves.toEqual({ valid: true });
    expect(verifyPasswordValue).not.toHaveBeenCalled();
    expect(createOneTimePostAccessToken).not.toHaveBeenCalled();
  });

  // Verifies that spaces accidentally typed around the password are ignored before checking.
  it("trims the entered password before verifying private posts", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 2, password: "hashed-password" }));
    jest.mocked(verifyPasswordValue).mockResolvedValue(true);

    await expect(verifyPostPassword("private-post", "  secret  ")).resolves.toEqual({
      valid: true,
      unlockToken: "one-time-unlock-token",
    });
    expect(verifyPasswordValue).toHaveBeenCalledWith("secret", "hashed-password");
    expect(createOneTimePostAccessToken).toHaveBeenCalledWith("private-post", "hashed-password");
  });

  // Correctly rejects access if the typed password does not match the stored hash.
  it("returns an incorrect password error when verification fails", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 2, password: "hashed-password" }));
    jest.mocked(verifyPasswordValue).mockResolvedValue(false);

    await expect(verifyPostPassword("private-post", "wrong")).resolves.toEqual({
      valid: false,
      error: "Incorrect password",
    });
    expect(createOneTimePostAccessToken).not.toHaveBeenCalled();
  });
});
