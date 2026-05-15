import { deletePost } from "../../../lib/actions/delete-post";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";
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

jest.mock("@/lib/cloudinary", () => ({
  cloudinary: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

jest.mock("@/lib/events", () => ({
  chatEventEmitter: {
    emit: jest.fn(),
  },
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    delete: jest.fn(),
    insert: jest.fn(),
    query: {
      posts: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  ADMIN_ACTION_TYPES: {
    DELETE_POST: 20,
  },
  NOTIFICATION_TYPES: {
    DELETE_POST: 30,
  },
  RESOURCE_TYPES: {
    IMAGE: 1,
    VIDEO: 2,
  },
  ROLES: {
    ADMIN: 1,
    MODERATOR: 2,
    USER: 3,
  },
  adminActionLog: "admin-action-log-table",
  notifications: "notifications-table",
  posts: {
    id: "posts.id",
  },
  user: {
    id: "user.id",
  },
}));

function createMutationBuilder() {
  const builder = {
    set: jest.fn(),
    values: jest.fn(),
    where: jest.fn(),
  };

  builder.set.mockReturnValue(builder);
  builder.values.mockResolvedValue(undefined);
  builder.where.mockResolvedValue(undefined);

  return builder;
}

function post(overrides: Partial<{ id: string; userId: string; media: unknown[] }> = {}) {
  return {
    id: "post-1",
    media: [],
    userId: "author-1",
    ...overrides,
  };
}

describe("deletePost", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const getModerationMock = getUserModerationState as jest.MockedFunction<
    typeof getUserModerationState
  >;
  const findPostMock = db.query.posts.findFirst as unknown as jest.Mock;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;
  const destroyMock = cloudinary.uploader.destroy as jest.MockedFunction<
    typeof cloudinary.uploader.destroy
  >;
  const emitMock = chatEventEmitter.emit as jest.MockedFunction<typeof chatEventEmitter.emit>;
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    getModerationMock.mockResolvedValue({ roleId: 3, activeBan: null } as never);
    findPostMock.mockResolvedValue(post({ userId: "user-1" }));
    destroyMock.mockResolvedValue({ result: "ok" } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(deletePost("post-1")).resolves.toEqual({ error: "Not authenticated" });
    expect(findPostMock).not.toHaveBeenCalled();
  });

  it("blocks banned users", async () => {
    getModerationMock.mockResolvedValue({ activeBan: { id: "ban-1" } } as never);

    await expect(deletePost("post-1")).resolves.toEqual({ error: "Your account is banned" });
    expect(findPostMock).not.toHaveBeenCalled();
  });

  it("returns an error when the post does not exist", async () => {
    findPostMock.mockResolvedValue(undefined);

    await expect(deletePost("missing-post")).resolves.toEqual({ error: "Post not found" });
  });

  it("prevents regular users from deleting someone else's post", async () => {
    findPostMock.mockResolvedValue(post({ userId: "author-1" }));

    await expect(deletePost("post-1")).resolves.toEqual({ error: "Not authorised" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes own post and destroys attached Cloudinary assets", async () => {
    const deleteBuilder = createMutationBuilder();
    findPostMock.mockResolvedValue(
      post({
        media: [
          { publicId: "image-1", resourceTypeId: 1 },
          { publicId: "video-1", resourceTypeId: 2 },
        ],
        userId: "user-1",
      })
    );
    deleteMock.mockReturnValue(deleteBuilder);

    await expect(deletePost("post-1")).resolves.toEqual({ success: true });

    expect(destroyMock).toHaveBeenCalledWith("image-1", { resource_type: "image" });
    expect(destroyMock).toHaveBeenCalledWith("video-1", { resource_type: "video" });
    expect(deleteBuilder.where).toHaveBeenCalledWith({
      field: "posts.id",
      type: "eq",
      value: "post-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  it("prevents moderators from deleting staff posts", async () => {
    getModerationMock.mockResolvedValue({ roleId: 2, activeBan: null } as never);
    findPostMock.mockResolvedValue(post({ userId: "staff-1" }));
    findUserMock.mockResolvedValue({ roleId: 1 });

    await expect(deletePost("post-1")).resolves.toEqual({
      error: "Moderators cannot delete posts of admins or moderators",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("soft deletes another user's post when performed by admin", async () => {
    const logInsert = createMutationBuilder();
    const notificationInsert = createMutationBuilder();
    const updateBuilder = createMutationBuilder();
    getModerationMock.mockResolvedValue({ roleId: 1, activeBan: null } as never);
    findPostMock.mockResolvedValue(post({ userId: "author-1" }));
    insertMock.mockReturnValueOnce(logInsert).mockReturnValueOnce(notificationInsert);
    updateMock.mockReturnValue(updateBuilder);

    await expect(deletePost("post-1")).resolves.toEqual({ success: true });

    expect(logInsert.values).toHaveBeenCalledWith({
      actionTypeId: 20,
      actorUserId: "user-1",
      details: "Deleted by (admin)",
      targetPostId: "post-1",
      targetUserId: "author-1",
    });
    expect(notificationInsert.values).toHaveBeenCalledWith({
      actorId: "user-1",
      message: "Deleted for community guidelines violation",
      typeId: 30,
      userId: "author-1",
    });
    expect(emitMock).toHaveBeenCalledWith("notifications:author-1", { type: "update" });
    expect(updateBuilder.set).toHaveBeenCalledWith({ deletedByStaffAt: expect.any(Date) });
    expect(destroyMock).not.toHaveBeenCalled();
  });
});
