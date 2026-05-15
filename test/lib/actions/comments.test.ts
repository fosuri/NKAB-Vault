import { createComment, deleteComment } from "../../../lib/actions/comments";
import { getSession } from "@/lib/auth/auth-server";
import { ensureCanCreateComment, getUserModerationState } from "@/lib/auth/moderation";
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
  ensureCanCreateComment: jest.fn(),
  getUserModerationState: jest.fn(),
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
      comments: {
        findFirst: jest.fn(),
      },
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
    DELETE_COMMENT: 21,
  },
  NOTIFICATION_TYPES: {
    COMMENT: 31,
    DELETE_COMMENT: 32,
  },
  ROLES: {
    ADMIN: 1,
    MODERATOR: 2,
    USER: 3,
  },
  adminActionLog: "admin-action-log-table",
  comments: {
    id: "comments.id",
  },
  notifications: "notifications-table",
  posts: {
    id: "posts.id",
  },
  user: {
    id: "user.id",
  },
}));

function createInsertBuilder(result: Array<{ id: string }> = []) {
  const builder = {
    returning: jest.fn(),
    values: jest.fn(),
  };

  builder.values.mockReturnValue(builder);
  builder.returning.mockResolvedValue(result);

  return builder;
}

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

describe("comment actions", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const ensureCanCreateCommentMock = ensureCanCreateComment as jest.MockedFunction<
    typeof ensureCanCreateComment
  >;
  const getModerationMock = getUserModerationState as jest.MockedFunction<
    typeof getUserModerationState
  >;
  const findCommentMock = db.query.comments.findFirst as unknown as jest.Mock;
  const findPostMock = db.query.posts.findFirst as unknown as jest.Mock;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;
  const emitMock = chatEventEmitter.emit as jest.MockedFunction<typeof chatEventEmitter.emit>;
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    ensureCanCreateCommentMock.mockResolvedValue({ allowed: true });
    getModerationMock.mockResolvedValue({ activeBan: null, roleId: 3 } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createComment", () => {
    it("requires authentication", async () => {
      getSessionMock.mockResolvedValue(null);

      await expect(createComment("post-1", "Hello")).resolves.toEqual({
        error: "You must be signed in to comment",
      });
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("returns moderation permission errors", async () => {
      ensureCanCreateCommentMock.mockResolvedValue({
        allowed: false,
        error: "Your account is muted. You cannot create comments.",
      });

      await expect(createComment("post-1", "Hello")).resolves.toEqual({
        error: "Your account is muted. You cannot create comments.",
      });
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("validates empty comments after trimming", async () => {
      await expect(createComment("post-1", "   ")).resolves.toEqual({
        error: "Comment cannot be empty",
      });
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("rejects comments longer than the maximum length", async () => {
      await expect(createComment("post-1", "a".repeat(1001))).resolves.toEqual({
        error: "Comment is too long",
      });
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("creates a trimmed comment and notifies the post owner", async () => {
      const commentInsert = createInsertBuilder([{ id: "comment-1" }]);
      const notificationInsert = createMutationBuilder();
      insertMock.mockReturnValueOnce(commentInsert).mockReturnValueOnce(notificationInsert);
      findPostMock.mockResolvedValue({ userId: "author-1" });

      await expect(createComment("post-1", "  Nice post  ")).resolves.toEqual({
        commentId: "comment-1",
        success: true,
      });

      expect(commentInsert.values).toHaveBeenCalledWith({
        body: "Nice post",
        postId: "post-1",
        userId: "user-1",
      });
      expect(notificationInsert.values).toHaveBeenCalledWith({
        actorId: "user-1",
        commentId: "comment-1",
        postId: "post-1",
        typeId: 31,
        userId: "author-1",
      });
      expect(emitMock).toHaveBeenCalledWith("notifications:author-1", { type: "update" });
      expect(revalidatePathMock).toHaveBeenCalledWith("/post/post-1");
    });

    it("does not notify when commenting on own post", async () => {
      const commentInsert = createInsertBuilder([{ id: "comment-1" }]);
      insertMock.mockReturnValue(commentInsert);
      findPostMock.mockResolvedValue({ userId: "user-1" });

      await expect(createComment("post-1", "Mine")).resolves.toEqual({
        commentId: "comment-1",
        success: true,
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(emitMock).not.toHaveBeenCalled();
    });
  });

  describe("deleteComment", () => {
    it("requires authentication", async () => {
      getSessionMock.mockResolvedValue(null);

      await expect(deleteComment("comment-1", "post-1")).resolves.toEqual({
        error: "Not authenticated",
      });
      expect(findCommentMock).not.toHaveBeenCalled();
    });

    it("blocks banned users", async () => {
      getModerationMock.mockResolvedValue({ activeBan: { id: "ban-1" } } as never);

      await expect(deleteComment("comment-1", "post-1")).resolves.toEqual({
        error: "Your account is banned",
      });
      expect(findCommentMock).not.toHaveBeenCalled();
    });

    it("returns an error when the comment does not exist", async () => {
      findCommentMock.mockResolvedValue(undefined);

      await expect(deleteComment("missing-comment", "post-1")).resolves.toEqual({
        error: "Comment not found",
      });
    });

    it("prevents regular users from deleting someone else's comment", async () => {
      findCommentMock.mockResolvedValue({ id: "comment-1", userId: "author-1" });

      await expect(deleteComment("comment-1", "post-1")).resolves.toEqual({
        error: "Not authorised",
      });
      expect(deleteMock).not.toHaveBeenCalled();
    });

    it("deletes the user's own comment", async () => {
      const deleteBuilder = createMutationBuilder();
      findCommentMock.mockResolvedValue({ id: "comment-1", userId: "user-1" });
      deleteMock.mockReturnValue(deleteBuilder);

      await expect(deleteComment("comment-1", "post-1")).resolves.toEqual({ success: true });

      expect(deleteBuilder.where).toHaveBeenCalledWith({
        field: "comments.id",
        type: "eq",
        value: "comment-1",
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/post/post-1");
    });

    it("prevents moderators from deleting staff comments", async () => {
      getModerationMock.mockResolvedValue({ activeBan: null, roleId: 2 } as never);
      findCommentMock.mockResolvedValue({ id: "comment-1", userId: "staff-1" });
      findUserMock.mockResolvedValue({ roleId: 1 });

      await expect(deleteComment("comment-1", "post-1")).resolves.toEqual({
        error: "Moderators cannot delete comments of admins or moderators",
      });
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("soft deletes another user's comment when performed by admin", async () => {
      const logInsert = createMutationBuilder();
      const notificationInsert = createMutationBuilder();
      const updateBuilder = createMutationBuilder();
      getModerationMock.mockResolvedValue({ activeBan: null, roleId: 1 } as never);
      findCommentMock.mockResolvedValue({ id: "comment-1", userId: "author-1" });
      insertMock.mockReturnValueOnce(logInsert).mockReturnValueOnce(notificationInsert);
      updateMock.mockReturnValue(updateBuilder);

      await expect(deleteComment("comment-1", "post-1")).resolves.toEqual({ success: true });

      expect(logInsert.values).toHaveBeenCalledWith({
        actionTypeId: 21,
        actorUserId: "user-1",
        details: "Deleted by staff (admin)",
        targetCommentId: "comment-1",
        targetPostId: "post-1",
        targetUserId: "author-1",
      });
      expect(notificationInsert.values).toHaveBeenCalledWith({
        actorId: "user-1",
        message: "Deleted for community guidelines violation",
        postId: "post-1",
        typeId: 32,
        userId: "author-1",
      });
      expect(updateBuilder.set).toHaveBeenCalledWith({ deletedByStaffAt: expect.any(Date) });
      expect(emitMock).toHaveBeenCalledWith("notifications:author-1", { type: "update" });
    });
  });
});
