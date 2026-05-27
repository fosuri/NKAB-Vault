import { cloudinary } from "@/lib/cloudinary";

type CloudinaryAssetInput = {
  publicId: string;
  resourceType: string;
  secureUrl: string;
};

type CloudinaryResource = {
  bytes?: number;
  format?: string;
  height?: number;
  public_id?: string;
  resource_type?: string;
  secure_url?: string;
  width?: number;
};

export type ValidatedCloudinaryAsset = {
  bytes: number | null;
  format: string | null;
  height: number | null;
  publicId: string;
  resourceType: "image" | "video";
  secureUrl: string;
  width: number | null;
};

export function getUserCloudinaryFolder(userId: string): string {
  return `nkab-vault/${userId}`;
}

export function isUserCloudinaryPublicId(userId: string, publicId: string | null | undefined): boolean {
  return typeof publicId === "string" && publicId.startsWith(`${getUserCloudinaryFolder(userId)}/`);
}

function toCloudinaryResourceType(resourceType: string): "image" | "video" | null {
  if (resourceType === "image" || resourceType === "video") return resourceType;
  return null;
}

export async function validateUserCloudinaryAsset(userId: string, input: CloudinaryAssetInput) {
  const resourceType = toCloudinaryResourceType(input.resourceType);
  if (!resourceType || !isUserCloudinaryPublicId(userId, input.publicId)) {
    return { error: "Invalid media asset" as const };
  }

  try {
    const asset = await cloudinary.api.resource(input.publicId, {
      resource_type: resourceType,
    }) as CloudinaryResource;

    if (
      asset.public_id !== input.publicId ||
      asset.resource_type !== resourceType ||
      asset.secure_url !== input.secureUrl
    ) {
      return { error: "Invalid media asset" as const };
    }

    return {
      asset: {
        bytes: asset.bytes ?? null,
        format: asset.format ?? null,
        height: asset.height ?? null,
        publicId: asset.public_id,
        resourceType: asset.resource_type,
        secureUrl: asset.secure_url,
        width: asset.width ?? null,
      } as ValidatedCloudinaryAsset,
    };
  } catch {
    return { error: "Invalid media asset" as const };
  }
}

export async function destroyUserCloudinaryAsset(
  ownerUserId: string,
  publicId: string | null | undefined,
  resourceType: "image" | "video",
) {
  if (typeof publicId !== "string" || !isUserCloudinaryPublicId(ownerUserId, publicId)) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
