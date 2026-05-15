import { verifyPostPassword } from "../../../lib/actions/verify-post-password";
import { db } from "@/lib/db/db";
import { verifyPostPassword as verifyPasswordValue } from "@/lib/post-password";

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

  it("returns an error when the post does not exist", async () => {
    findPost.mockResolvedValue(undefined);

    await expect(verifyPostPassword("missing-post", "secret")).resolves.toEqual({
      valid: false,
      error: "Post not found",
    });
  });

  it("allows access when the post is not private", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 1, password: "stored-password" }));

    await expect(verifyPostPassword("public-post", "wrong")).resolves.toEqual({ valid: true });
    expect(verifyPasswordValue).not.toHaveBeenCalled();
  });

  it("allows access when a private post has no password stored", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 2, password: null }));

    await expect(verifyPostPassword("private-post", "secret")).resolves.toEqual({ valid: true });
    expect(verifyPasswordValue).not.toHaveBeenCalled();
  });

  it("trims the entered password before verifying private posts", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 2, password: "hashed-password" }));
    jest.mocked(verifyPasswordValue).mockResolvedValue(true);

    await expect(verifyPostPassword("private-post", "  secret  ")).resolves.toEqual({
      valid: true,
    });
    expect(verifyPasswordValue).toHaveBeenCalledWith("secret", "hashed-password");
  });

  it("returns an incorrect password error when verification fails", async () => {
    findPost.mockResolvedValue(post({ accessTypeId: 2, password: "hashed-password" }));
    jest.mocked(verifyPasswordValue).mockResolvedValue(false);

    await expect(verifyPostPassword("private-post", "wrong")).resolves.toEqual({
      valid: false,
      error: "Incorrect password",
    });
  });
});
