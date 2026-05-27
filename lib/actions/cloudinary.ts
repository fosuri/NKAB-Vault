"use server";

import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { getUserCloudinaryFolder } from "@/lib/cloudinary-assets";

/**
 * Cloudinary Security Configuration Actions.
 */

/**
 * Generates secure cryptographic credentials for client-side uploads.
 */
export async function getCloudinarySignature() {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // 1. Generate Unix timestamp in seconds (Cloudinary requirement)
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // 2. Isolate uploads in user-specific folders for security
  const folder = getUserCloudinaryFolder(session.user.id);

  // 3. Cryptographic signature generation (Server-side secret)
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}
