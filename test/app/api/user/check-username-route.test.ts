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

  it("marks a username as available when no user exists", async () => {
    findUserMock.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ available: true });
  });

  it("allows the current user to keep their own username", async () => {
    findUserMock.mockResolvedValue({ id: "user-1" });

    const response = await GET(
      new Request("http://localhost/api/user/check-username?username=Alice")
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ available: true });
  });

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
