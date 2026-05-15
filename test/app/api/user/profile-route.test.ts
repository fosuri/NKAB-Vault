import { PUT } from "../../../../app/api/user/profile/route";
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

describe("profile update API", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const uploadMock = cloudinary.uploader.upload as jest.MockedFunction<
    typeof cloudinary.uploader.upload
  >;
  const destroyMock = cloudinary.uploader.destroy as jest.MockedFunction<
    typeof cloudinary.uploader.destroy
  >;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    findUserMock.mockResolvedValue(undefined);
    updateMock.mockReturnValue(createUpdateBuilder());
    uploadMock.mockResolvedValue({ secure_url: "https://cdn.example.com/avatar.png" } as never);
    destroyMock.mockResolvedValue({ result: "ok" } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/user/profile", {
        body: JSON.stringify({ username: "Alice" }),
        method: "PUT",
      })
    );

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({
      error: "Unauthorized",
      success: false,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid profile data", async () => {
    const response = await PUT(
      new Request("http://localhost/api/user/profile", {
        body: JSON.stringify({ username: "al" }),
        method: "PUT",
      })
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "Username must be at least 3 characters",
      success: false,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("uploads a base64 avatar and updates the current profile", async () => {
    const updateBuilder = createUpdateBuilder();
    updateMock.mockReturnValue(updateBuilder);

    const response = await PUT(
      new Request("http://localhost/api/user/profile", {
        body: JSON.stringify({
          avatar: "data:image/png;base64,abc123",
          description: "Hello",
          username: "Alice",
        }),
        method: "PUT",
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
      profileDescription: "Hello",
    });
  });

  it("removes an avatar when an empty avatar value is provided", async () => {
    const updateBuilder = createUpdateBuilder();
    updateMock.mockReturnValue(updateBuilder);

    const response = await PUT(
      new Request("http://localhost/api/user/profile", {
        body: JSON.stringify({ avatar: "", username: "Alice" }),
        method: "PUT",
      })
    );

    expect(response.status).toBe(200);
    expect(destroyMock).toHaveBeenCalledWith("nkab-vault/avatars/user-1/avatar", {
      resource_type: "image",
    });
    expect(updateBuilder.set).toHaveBeenCalledWith({
      image: null,
      name: "Alice",
      profileDescription: "",
    });
  });
});
