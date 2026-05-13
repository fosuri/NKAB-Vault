export const ACCEPTED_MEDIA_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};


export type FileEntry = {
  original: File;
  croppedDataUrl: string | null;
  previewUrl: string;
};

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
