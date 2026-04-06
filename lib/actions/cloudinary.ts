"use server";

import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";

export async function getCloudinarySignature() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = `nkab-vault/${session.user.id}`;
  
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
