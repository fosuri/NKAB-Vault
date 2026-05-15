import { getCloudinarySignature } from "../../../lib/actions/cloudinary";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/cloudinary", () => ({
  cloudinary: {
    utils: {
      api_sign_request: jest.fn(),
    },
  },
}));

describe("getCloudinarySignature", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const signMock = cloudinary.utils.api_sign_request as jest.MockedFunction<
    typeof cloudinary.utils.api_sign_request
  >;
  const originalEnv = {
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "api-secret";
    process.env.CLOUDINARY_CLOUD_NAME = "cloud-name";
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    signMock.mockReturnValue("signed-request");
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.CLOUDINARY_API_KEY = originalEnv.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_SECRET = originalEnv.CLOUDINARY_API_SECRET;
    process.env.CLOUDINARY_CLOUD_NAME = originalEnv.CLOUDINARY_CLOUD_NAME;
    jest.clearAllMocks();
  });

  // Ensures that anonymous users cannot get permission to upload files.
  it("throws when the user is not authenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(getCloudinarySignature()).rejects.toThrow("Unauthorized");
    expect(signMock).not.toHaveBeenCalled();
  });

  // Checks that an authenticated user receives the correct secure credentials for uploading their files to Cloudinary.
  it("returns a signed upload payload scoped to the current user", async () => {
    await expect(getCloudinarySignature()).resolves.toEqual({
      apiKey: "api-key",
      cloudName: "cloud-name",
      folder: "nkab-vault/user-1",
      signature: "signed-request",
      timestamp: 1778846400,
    });
    expect(signMock).toHaveBeenCalledWith(
      {
        folder: "nkab-vault/user-1",
        timestamp: 1778846400,
      },
      "api-secret"
    );
  });
});
