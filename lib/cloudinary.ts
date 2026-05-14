import { v2 } from "cloudinary";

/**
 * Initializes and exports the Cloudinary SDK for secure media asset orchestration.
 */

v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const cloudinary = v2;