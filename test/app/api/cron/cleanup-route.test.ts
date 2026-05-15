import { GET } from "../../../../app/api/cron/cleanup/route";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ conditions, type: "and" })),
  inArray: jest.fn((field, values) => ({ field, type: "inArray", values })),
  isNotNull: jest.fn((field) => ({ field, type: "isNotNull" })),
  lt: jest.fn((field, value) => ({ field, type: "lt", value })),
}));

jest.mock("@/lib/cloudinary", () => ({
  cloudinary: { uploader: { destroy: jest.fn() } },
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    delete: jest.fn(),
    query: { posts: { findMany: jest.fn() } },
    select: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  RESOURCE_TYPES: { IMAGE: 1, VIDEO: 2 },
  adminActionLog: { id: "log.id", targetCommentId: "log.targetCommentId", targetPostId: "log.targetPostId" },
  comments: { deletedByStaffAt: "comments.deletedByStaffAt", id: "comments.id" },
  posts: { deletedByStaffAt: "posts.deletedByStaffAt", id: "posts.id" },
}));

function request(secret: string | null) {
  return {
    headers: {
      get: jest.fn(() => (secret ? `Bearer ${secret}` : null)),
    },
  } as never;
}

function returningBuilder(result: Array<{ id: string }>) {
  return {
    returning: jest.fn().mockResolvedValue(result),
    where: jest.fn().mockReturnThis(),
  };
}

describe("cleanup cron route", () => {
  const findPostsMock = db.query.posts.findMany as unknown as jest.Mock;
  const selectMock = db.select as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;

  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    jest.spyOn(console, "log").mockImplementation(() => {});
    findPostsMock.mockResolvedValue([]);
    selectMock.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures that the cleanup process cannot be run without the correct secret key.
  it("rejects missing or invalid cron secrets", async () => {
    const response = await GET(request(null));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  // Checks that old or deleted posts, comments, logs, and media files are successfully removed.
  it("deletes expired posts, comments, logs, and media", async () => {
    findPostsMock.mockResolvedValue([
      { id: "post-1", media: [{ publicId: "video-1", resourceTypeId: 2 }] },
    ]);
    selectMock.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: "comment-1" }]),
    });
    deleteMock
      .mockReturnValueOnce(returningBuilder([{ id: "post-log-1" }]))
      .mockReturnValueOnce(returningBuilder([{ id: "post-1" }]))
      .mockReturnValueOnce(returningBuilder([{ id: "comment-log-1" }]))
      .mockReturnValueOnce(returningBuilder([{ id: "comment-1" }]));

    const response = await GET(request("cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      comments: { deleted: 1, logsDeleted: 1 },
      posts: { deleted: 1, logsDeleted: 1, mediaDeletedFromCloudinary: 1 },
      success: true,
    });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("video-1", {
      resource_type: "video",
    });
  });
});
