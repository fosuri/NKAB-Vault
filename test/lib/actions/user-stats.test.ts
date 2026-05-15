import { fetchUserStatsAction } from "../../../lib/actions/user-stats";
import { getPostsByUserId, getUserAccountStatistics } from "@/lib/posts";

jest.mock("@/lib/posts", () => ({
  getPostsByUserId: jest.fn(),
  getUserAccountStatistics: jest.fn(),
}));

describe("fetchUserStatsAction", () => {
  const getStatsMock = getUserAccountStatistics as jest.MockedFunction<
    typeof getUserAccountStatistics
  >;
  const getPostsMock = getPostsByUserId as jest.MockedFunction<typeof getPostsByUserId>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns account statistics with the user's post count", async () => {
    const stats = { views: 12, likes: 3, dislikes: 1, comments: 4 };
    getStatsMock.mockResolvedValue(stats);
    getPostsMock.mockResolvedValue([{ id: "post-1" }, { id: "post-2" }] as never);

    await expect(fetchUserStatsAction("user-1")).resolves.toEqual({
      stats,
      postsCount: 2,
    });
    expect(getStatsMock).toHaveBeenCalledWith("user-1");
    expect(getPostsMock).toHaveBeenCalledWith("user-1");
  });
});
