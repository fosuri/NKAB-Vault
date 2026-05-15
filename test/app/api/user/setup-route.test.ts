import { POST } from "../../../../app/api/user/setup/route";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
}));

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/cloudinary", () => ({
  cloudinary: {
    uploader: {
      destroy: jest.fn(),
      upload: jest.fn(),
    },
  },
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    query: {
      user: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  user: {
    id: "user.id",
    name: "user.name",
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

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("user setup API", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const uploadMock = cloudinary.uploader.upload as jest.MockedFunction<
    typeof cloudinary.uploader.upload
  >;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findUserMock.mockResolvedValue(undefined);
    updateMock.mockReturnValue(createUpdateBuilder());
    uploadMock.mockResolvedValue({ secure_url: "https://cdn.example.com/avatar.png" } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/user/setup", {
        body: JSON.stringify({ username: "Alice" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({
      error: "Unauthorized",
      success: false,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects usernames already owned by another user", async () => {
    findUserMock.mockResolvedValue({ id: "user-2" });

    const response = await POST(
      new Request("http://localhost/api/user/setup", {
        body: JSON.stringify({ username: "Alice" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "Username is already taken",
      success: false,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("marks setup as completed and stores the resolved avatar", async () => {
    const updateBuilder = createUpdateBuilder();
    updateMock.mockReturnValue(updateBuilder);

    const response = await POST(
      new Request("http://localhost/api/user/setup", {
        body: JSON.stringify({
          avatar: "data:image/png;base64,abc123",
          description: "Ready",
          username: "Alice",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ success: true });
    expect(uploadMock).toHaveBeenCalledWith("data:image/png;base64,abc123", {
      folder: "nkab-vault/avatars/user-1",
      overwrite: true,
      public_id: "avatar",
      resource_type: "image",
    });
    expect(updateBuilder.set).toHaveBeenCalledWith({
      image: "https://cdn.example.com/avatar.png",
      name: "Alice",
      profileDescription: "Ready",
      setupCompleted: true,
    });
  });
});
