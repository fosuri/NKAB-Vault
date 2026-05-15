import { updatePostAccess } from "../../../lib/actions/update-post-access";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { db } from "@/lib/db/db";
import { protectPassword } from "@/lib/post-password";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/auth/moderation", () => ({
  getUserModerationState: jest.fn(),
}));

jest.mock("@/lib/post-password", () => ({
  protectPassword: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      posts: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  ACCESS_TYPES: {
    PAID: 3,
    PRIVATE: 2,
    PUBLIC: 1,
  },
  posts: {
    id: "posts.id",
  },
}));

function createUpdateBuilder() {
  const builder = {
    set: jest.fn(),
    where: jest.fn(),
  };

  builder.set.mockReturnValue(builder);
  builder.where.mockResolvedValue(undefined);

  return builder;
}

describe("updatePostAccess", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const getModerationMock = getUserModerationState as jest.MockedFunction<
    typeof getUserModerationState
  >;
  const findPostMock = db.query.posts.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const protectPasswordMock = protectPassword as jest.MockedFunction<typeof protectPassword>;
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    getModerationMock.mockResolvedValue({ activeBan: null } as never);
    findPostMock.mockResolvedValue({ userId: "user-1" });
    protectPasswordMock.mockResolvedValue("protected-password");
    updateMock.mockReturnValue(createUpdateBuilder());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(updatePostAccess("post-1", 1)).resolves.toEqual({
      error: "Not authenticated",
    });
    expect(findPostMock).not.toHaveBeenCalled();
  });

  it("blocks banned users", async () => {
    getModerationMock.mockResolvedValue({ activeBan: { id: "ban-1" } } as never);

    await expect(updatePostAccess("post-1", 1)).resolves.toEqual({
      error: "Your account is banned",
    });
    expect(findPostMock).not.toHaveBeenCalled();
  });

  it("returns an error when the post does not exist", async () => {
    findPostMock.mockResolvedValue(undefined);

    await expect(updatePostAccess("missing-post", 1)).resolves.toEqual({
      error: "Post not found",
    });
  });

  it("prevents non-authors from changing access", async () => {
    findPostMock.mockResolvedValue({ userId: "author-1" });

    await expect(updatePostAccess("post-1", 1)).resolves.toEqual({
      error: "Not authorised. Only the post author can change the access.",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid access types", async () => {
    await expect(updatePostAccess("post-1", 999)).resolves.toEqual({
      error: "Invalid access type",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("protects trimmed password for private posts", async () => {
    const updateBuilder = createUpdateBuilder();
    updateMock.mockReturnValue(updateBuilder);

    await expect(updatePostAccess("post-1", 2, "  secret  ")).resolves.toEqual({
      success: true,
    });

    expect(protectPasswordMock).toHaveBeenCalledWith("secret");
    expect(updateBuilder.set).toHaveBeenCalledWith({
      accessTypeId: 2,
      password: "protected-password",
    });
  });

  it("clears password when private access is saved with a blank password", async () => {
    const updateBuilder = createUpdateBuilder();
    updateMock.mockReturnValue(updateBuilder);

    await expect(updatePostAccess("post-1", 2, "   ")).resolves.toEqual({
      success: true,
    });

    expect(protectPasswordMock).not.toHaveBeenCalled();
    expect(updateBuilder.set).toHaveBeenCalledWith({
      accessTypeId: 2,
      password: null,
    });
  });

  it("clears password for public and paid posts", async () => {
    const updateBuilder = createUpdateBuilder();
    updateMock.mockReturnValue(updateBuilder);

    await expect(updatePostAccess("post-1", 3, "secret")).resolves.toEqual({ success: true });

    expect(protectPasswordMock).not.toHaveBeenCalled();
    expect(updateBuilder.set).toHaveBeenCalledWith({
      accessTypeId: 3,
      password: null,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/post/post-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });
});
