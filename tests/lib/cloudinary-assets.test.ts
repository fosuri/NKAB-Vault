import {
  destroyUserCloudinaryAsset,
  getUserCloudinaryFolder,
  isUserCloudinaryPublicId,
  validateUserCloudinaryAsset,
} from "../../lib/cloudinary-assets";
import { cloudinary } from "@/lib/cloudinary";

jest.mock("@/lib/cloudinary", () => ({
  cloudinary: {
    api: {
      resource: jest.fn(),
    },
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

describe("cloudinary asset ownership", () => {
  const resourceMock = cloudinary.api.resource as jest.MockedFunction<typeof cloudinary.api.resource>;
  const destroyMock = cloudinary.uploader.destroy as jest.MockedFunction<typeof cloudinary.uploader.destroy>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("scopes user uploads to their folder", () => {
    expect(getUserCloudinaryFolder("user-1")).toBe("nkab-vault/user-1");
    expect(isUserCloudinaryPublicId("user-1", "nkab-vault/user-1/media")).toBe(true);
    expect(isUserCloudinaryPublicId("user-1", "nkab-vault/user-2/media")).toBe(false);
  });

  it("rejects assets outside the user's folder before calling Cloudinary", async () => {
    await expect(validateUserCloudinaryAsset("user-1", {
      publicId: "nkab-vault/user-2/media",
      resourceType: "image",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/nkab-vault/user-2/media.jpg",
    })).resolves.toEqual({ error: "Invalid media asset" });

    expect(resourceMock).not.toHaveBeenCalled();
  });

  it("accepts assets when Cloudinary metadata matches the client payload", async () => {
    resourceMock.mockResolvedValue({
      public_id: "nkab-vault/user-1/media",
      resource_type: "image",
      secure_url: "https://res.cloudinary.com/demo/image/upload/nkab-vault/user-1/media.jpg",
      bytes: 1234,
    } as never);

    await expect(validateUserCloudinaryAsset("user-1", {
      publicId: "nkab-vault/user-1/media",
      resourceType: "image",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/nkab-vault/user-1/media.jpg",
    })).resolves.toMatchObject({
      asset: {
        bytes: 1234,
        publicId: "nkab-vault/user-1/media",
        resourceType: "image",
      },
    });
  });

  it("only destroys assets owned by the expected user", async () => {
    await destroyUserCloudinaryAsset("user-1", "nkab-vault/user-2/media", "image");
    expect(destroyMock).not.toHaveBeenCalled();

    await destroyUserCloudinaryAsset("user-1", "nkab-vault/user-1/media", "image");
    expect(destroyMock).toHaveBeenCalledWith("nkab-vault/user-1/media", {
      resource_type: "image",
    });
  });
});
