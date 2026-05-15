import { incrementPostViewsAction } from "../../../lib/actions/post-views";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  postViews: {
    id: "postViews.id",
    postId: "postViews.postId",
    userId: "postViews.userId",
  },
  posts: {
    id: "posts.id",
  },
}));

function createInsertBuilder(result: Array<{ id: string }>) {
  const builder = {
    insert: jest.fn(),
    onConflictDoNothing: jest.fn(),
    returning: jest.fn(),
    values: jest.fn(),
  };

  builder.insert.mockReturnValue(builder);
  builder.values.mockReturnValue(builder);
  builder.onConflictDoNothing.mockReturnValue(builder);
  builder.returning.mockResolvedValue(result);

  return builder;
}

describe("incrementPostViewsAction", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const transactionMock = db.transaction as unknown as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing for anonymous users", async () => {
    getSessionMock.mockResolvedValue(null);

    await incrementPostViewsAction("post-1");

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("inserts a unique post view for authenticated users", async () => {
    const tx = createInsertBuilder([{ id: "view-1" }]);
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await incrementPostViewsAction("post-1");

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledWith({
      id: "postViews.id",
      postId: "postViews.postId",
      userId: "postViews.userId",
    });
    expect(tx.values).toHaveBeenCalledWith({
      postId: "post-1",
      userId: "user-1",
    });
    expect(tx.onConflictDoNothing).toHaveBeenCalledWith({
      target: ["postViews.userId", "postViews.postId"],
    });
    expect(tx.returning).toHaveBeenCalledWith({ id: "postViews.id" });
  });

  it("handles an already-recorded view without throwing", async () => {
    const tx = createInsertBuilder([]);
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(incrementPostViewsAction("post-1")).resolves.toBeUndefined();
  });
});
