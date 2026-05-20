import { GET } from "../../../../app/api/user/check-username/route";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
}));

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      user: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  user: {
    name: "user.name",
  },
}));

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("check username API", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Ensures that only logged-in users can check if a username is available.
  it("requires an authenticated session", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({
      available: false,
      error: "Unauthorized",
    });
    expect(findUserMock).not.toHaveBeenCalled();
  });

  // Rejects usernames that are invalid (too short, too long, or contain forbidden characters).
  it.each([
    ["", "Username must be at least 3 characters"],
    ["ab", "Username must be at least 3 characters"],
    ["averyveryverylongusername", "Username must be at most 20 characters"],
    ["alice_1", "Username must contain only English letters and be a single word"],
  ])("rejects invalid username %s", async (username, error) => {
    const response = await GET(
      new Request(`http://localhost/api/user/check-username?username=${username}`)
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      available: false,
      error,
    });
    expect(findUserMock).not.toHaveBeenCalled();
  });

  // If the username is not taken by anyone, it marks it as available for use.
  it("marks a username as available when no user exists", async () => {
    findUserMock.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ available: true });
  });

  // A user is allowed to keep their current username; it won't be considered taken by them.
  it("allows the current user to keep their own username", async () => {
    findUserMock.mockResolvedValue({ id: "user-1" });

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ available: true });
  });

  // If another person is already using the username, it shows an error message.
  it("marks a username as unavailable when another user owns it", async () => {
    findUserMock.mockResolvedValue({ id: "user-2" });

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      available: false,
      error: "Username is already taken",
    });
  });

  // Returns a proper error message if an unexpected server issue happens.
  it("returns a server error response when lookup fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    findUserMock.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({
      available: false,
      error: "Server error",
    });
  });
});
