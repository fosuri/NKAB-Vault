import { toggleReactionAction } from "../../../lib/actions/reactions";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { chatEventEmitter } from "@/lib/events";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
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
      postReactions: {
        findFirst: jest.fn(),
      },
      posts: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  NOTIFICATION_TYPES: {
    DISLIKE: 11,
    LIKE: 10,
  },
  REACTION_TYPES: {
    DISLIKE: 2,
    LIKE: 1,
  },
  notifications: "notifications-table",
  postReactions: {
    id: "postReactions.id",
    postId: "postReactions.postId",
    userId: "postReactions.userId",
  },
  posts: {
    id: "posts.id",
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

describe("toggleReactionAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findReactionMock = db.query.postReactions.findFirst as unknown as jest.Mock;
  const findPostMock = db.query.posts.findFirst as unknown as jest.Mock;
  const insertMock = db.insert as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;
  const emitMock = chatEventEmitter.emit as jest.MockedFunction<typeof chatEventEmitter.emit>;
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findPostMock.mockResolvedValue({ userId: "author-1" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication before reacting", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(toggleReactionAction("post-1", "like")).resolves.toEqual({
      error: "You must be signed in to react",
    });
    expect(findReactionMock).not.toHaveBeenCalled();
  });

  it("creates a new reaction and notifies the post owner", async () => {
    const reactionInsert = createMutationBuilder();
    const notificationInsert = createMutationBuilder();
    findReactionMock.mockResolvedValue(undefined);
    insertMock.mockReturnValueOnce(reactionInsert).mockReturnValueOnce(notificationInsert);

    await expect(toggleReactionAction("post-1", "like")).resolves.toEqual({ success: true });

    expect(reactionInsert.values).toHaveBeenCalledWith({
      postId: "post-1",
      typeId: 1,
      userId: "user-1",
    });
    expect(notificationInsert.values).toHaveBeenCalledWith({
      actorId: "user-1",
      postId: "post-1",
      typeId: 10,
      userId: "author-1",
    });
    expect(emitMock).toHaveBeenCalledWith("notifications:author-1", { type: "update" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/post/post-1");
  });

  it("does not notify when the user reacts to their own post", async () => {
    const reactionInsert = createMutationBuilder();
    findReactionMock.mockResolvedValue(undefined);
    findPostMock.mockResolvedValue({ userId: "user-1" });
    insertMock.mockReturnValue(reactionInsert);

    await expect(toggleReactionAction("post-1", "dislike")).resolves.toEqual({ success: true });

    expect(reactionInsert.values).toHaveBeenCalledWith({
      postId: "post-1",
      typeId: 2,
      userId: "user-1",
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("removes an existing matching reaction", async () => {
    const deleteBuilder = createMutationBuilder();
    findReactionMock.mockResolvedValue({ id: "reaction-1", typeId: 1 });
    deleteMock.mockReturnValue(deleteBuilder);

    await expect(toggleReactionAction("post-1", "like")).resolves.toEqual({ success: true });

    expect(deleteMock).toHaveBeenCalledWith(expect.objectContaining({ id: "postReactions.id" }));
    expect(deleteBuilder.where).toHaveBeenCalledWith({
      field: "postReactions.id",
      type: "eq",
      value: "reaction-1",
    });
  });

  it("switches an existing reaction and notifies the post owner", async () => {
    const updateBuilder = createMutationBuilder();
    const notificationInsert = createMutationBuilder();
    findReactionMock.mockResolvedValue({ id: "reaction-1", typeId: 1 });
    updateMock.mockReturnValue(updateBuilder);
    insertMock.mockReturnValue(notificationInsert);

    await expect(toggleReactionAction("post-1", "dislike")).resolves.toEqual({ success: true });

    expect(updateBuilder.set).toHaveBeenCalledWith({ typeId: 2 });
    expect(notificationInsert.values).toHaveBeenCalledWith({
      actorId: "user-1",
      postId: "post-1",
      typeId: 11,
      userId: "author-1",
    });
    expect(emitMock).toHaveBeenCalledWith("notifications:author-1", { type: "update" });
  });
});
