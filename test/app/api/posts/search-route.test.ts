import { GET } from "../../../../app/api/posts/search/route";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { getSearchSuggestions } from "@/lib/posts";

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/auth/moderation", () => ({
  getUserModerationState: jest.fn(),
}));

jest.mock("@/lib/posts", () => ({
  getSearchSuggestions: jest.fn(),
}));

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("posts search API", () => {
  beforeEach(() => {
    jest.mocked(getSession).mockResolvedValue(null);
    jest.mocked(getUserModerationState).mockResolvedValue(null);
    jest.mocked(getSearchSuggestions).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty suggestions array for a blank query", async () => {
    const response = await GET(new Request("http://localhost/api/posts/search?q=%20%20"));

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ suggestions: [] });
    expect(getSearchSuggestions).not.toHaveBeenCalled();
  });

  it("blocks banned users", async () => {
    jest.mocked(getSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    jest.mocked(getUserModerationState).mockResolvedValue({ activeBan: true } as never);

    const response = await GET(new Request("http://localhost/api/posts/search?q=vault"));

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toEqual({ error: "Your account is banned" });
    expect(getSearchSuggestions).not.toHaveBeenCalled();
  });

  it("passes normalized filters and clamps the search limit", async () => {
    const suggestions = [{ id: "post-1", title: "Vault post" }];
    jest.mocked(getSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    jest.mocked(getSearchSuggestions).mockResolvedValue(suggestions as never);

    const response = await GET(
      new Request(
        "http://localhost/api/posts/search?q=%20vault%20&time=7d&contentType=gif&limit=999"
      )
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ suggestions });
    expect(getSearchSuggestions).toHaveBeenCalledWith({
      viewerUserId: "user-1",
      query: "vault",
      time: "7d",
      contentType: "gif",
      limit: 10,
    });
  });

  it("defaults invalid filters and non-numeric limits", async () => {
    await GET(
      new Request(
        "http://localhost/api/posts/search?q=vault&time=tomorrow&contentType=audio&limit=wat"
      )
    );

    expect(getSearchSuggestions).toHaveBeenCalledWith({
      viewerUserId: undefined,
      query: "vault",
      time: "all",
      contentType: "all",
      limit: 6,
    });
  });

  it("returns a 500 response when search fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(getSearchSuggestions).mockRejectedValue(new Error("db down"));

    const response = await GET(new Request("http://localhost/api/posts/search?q=vault"));

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({ error: "Failed to search posts" });
  });
});
