/**
 * Accepted Media Types.
 * Defines the MIME types and associated file extensions allowed for post uploads.
 */
export const ACCEPTED_MEDIA_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

/**
 * File Entry Structure.
 * Represents a media file being prepared for upload, tracking both the 
 * original file and any client-side modifications (e.g., cropping).
 */
export type FileEntry = {
  original: File;
  croppedDataUrl: string | null;
  previewUrl: string;
};

/**
 * Data URL to File Utility.
 * Converts a base64 data URL (typically from the image cropper) into a standard 
 * File object compatible with form submissions and Cloudinary uploads.
 */
export function dataUrlToFile(dataUrl: string, originalFile: File): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  const ext = mime.split("/")[1] ?? "png";
  const baseName = originalFile.name.replace(/\.[^.]+$/, "");
  return new File([u8arr], `${baseName}-cropped.${ext}`, { type: mime });
}

