import { FileArchive, CheckIcon, ImagePlus, Video, CropIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/kibo-ui/dropzone";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { toast } from "sonner";
import { ACCEPTED_MEDIA_TYPES, type FileEntry } from "./types";
import Image from "next/image";

interface MediaSectionProps {
  entries: FileEntry[];
  current: number;
  count: number;
  setApi: (api: any) => void;
  handleDrop: (files: File[]) => void;
  handleRemove: (index: number) => void;
  setCropIndex: (index: number) => void;
  isPro?: boolean;
}

/**
 * Post Media Section.
 * Handles the upload, preview, and management of media files (Images/Videos) for a post.
 */
export function MediaSection({
  entries,
  current,
  count,
  setApi,
  handleDrop,
  handleRemove,
  setCropIndex,
  isPro,
}: MediaSectionProps) {
  // Subscription-based file size limits
  const maxSize = isPro ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
  const maxSizeMB = isPro ? 20 : 10;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="rounded-xl border border-border p-4">
        {/* Dropzone for multi-file selection (Max 3) */}
        <Dropzone
          className="h-52 whitespace-normal rounded-lg border border-dashed border-border bg-background p-6 hover:bg-muted/40"
          accept={ACCEPTED_MEDIA_TYPES}
          maxSize={maxSize}
          maxFiles={3}
          onDrop={handleDrop}
          onError={(error) => {
            let message = error.message || "Unable to add file";
            if (message.includes("bytes")) {
              message = message.replace(/(\d+)\s*bytes/, (match, bytes) => {
                return `${Math.round(Number(bytes) / 1024 / 1024)} MB`;
              });
            }
            toast.error(message);
          }}
        >
          <DropzoneEmptyState className="h-full text-center">
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                <FileArchive className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  Drop your files here
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (Max 3 files)
                </p>
                <p className="text-xs text-muted-foreground">Max {maxSizeMB} MB</p>
              </div>
              <span className="rounded-lg border border-border bg-background px-5 py-2 text-sm font-semibold text-foreground">
                Choose files
              </span>
            </div>
          </DropzoneEmptyState>

          <DropzoneContent className="h-full text-center">
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {entries.length} file{entries.length !== 1 ? "s" : ""} selected
                </p>
                {/* List of currently selected files with quick metadata */}
                <div className="flex flex-col gap-2 max-h-[100px] overflow-y-auto">
                  {entries.map((entry, idx) => {
                    const isVideo = entry.original.type.startsWith("video/");
                    return (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 text-left text-muted-foreground">
                        {isVideo ? (
                          <Video className="size-4 shrink-0" />
                        ) : (
                          <ImagePlus className="size-4 shrink-0" />
                        )}
                        <span className="truncate text-xs flex-1 min-w-0">
                          {entry.original.name}
                        </span>
                        {entry.croppedDataUrl && (
                          <CheckIcon className="size-3 shrink-0 text-green-500" />
                        )}
                        <span className="ml-auto text-[11px] shrink-0">
                          {(entry.original.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {entries.length >= 3 ? (
                <p className="text-xs font-medium text-destructive">
                  Maximum 3 files reached.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Drag and drop to add more files.
                </p>
              )}
            </div>
          </DropzoneContent>
        </Dropzone>
      </div>

      {/* Media Carousel: Allows detailed preview, cropping, and removal */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2 min-w-0">
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {entries.map((entry, idx) => {
                const isImage = entry.original.type.startsWith("image/");
                const isStaticImage = isImage && entry.original.type !== "image/gif";
                const isVideo = entry.original.type.startsWith("video/");
                // Handle formats with limited browser preview support (e.g., MOV)
                const isMov = isVideo && (entry.original.type === "video/quicktime" || entry.original.name.toLowerCase().endsWith(".mov"));
                
                return (
                  <CarouselItem key={idx}>
                    <div className="rounded-xl border border-border overflow-hidden bg-background">
                      {/* Media Item Header: Controls and status */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                        {isVideo ? (
                          <Video className="size-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ImagePlus className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate text-xs font-medium text-foreground flex-1 min-w-0">
                          {entry.original.name}
                        </span>
                        {entry.croppedDataUrl && (
                          <span className="flex items-center gap-1 text-[11px] text-green-500 shrink-0">
                            <CheckIcon className="size-3" /> Cropped
                          </span>
                        )}
                        {/* Only allow cropping for static images */}
                        {isStaticImage && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 px-2 text-xs shrink-0"
                            onClick={() => setCropIndex(idx)}
                          >
                            <CropIcon className="size-3" />
                            {entry.croppedDataUrl ? "Re-crop" : "Crop"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground shrink-0"
                          onClick={() => handleRemove(idx)}
                        >
                          <XIcon className="size-3" />
                        </Button>
                      </div>

                      {/* Content Preview Area */}
                      <div className="p-3">
                        {isImage ? (
                          <Image
                            src={entry.croppedDataUrl ?? entry.previewUrl}
                            alt={entry.original.name}
                            className="mx-auto max-h-64 h-64 max-w-full rounded-md object-contain bg-muted/40"
                            width={500}
                            height={500}
                            unoptimized
                          />
                        ) : isVideo ? (
                          isMov ? (
                            <div className="mx-auto flex h-64 w-full flex-col items-center justify-center rounded-md bg-muted/40 p-4 text-center">
                              <Video className="mb-2 size-10 text-muted-foreground opacity-50" />
                              <p className="text-sm font-medium text-foreground">Preview not supported</p>
                              <p className="text-xs text-muted-foreground">This .mov file will be converted to a playable format upon upload.</p>
                            </div>
                          ) : (
                            <video
                              src={entry.previewUrl}
                              controls
                              className="mx-auto max-h-64 h-64 w-full rounded-md bg-muted/40 object-contain"
                            />
                          )
                        ) : null}
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {entries.length > 1 && (
              <>
                <CarouselPrevious className="left-2" type="button" />
                <CarouselNext className="right-2" type="button" />
              </>
            )}
          </Carousel>
          {entries.length > 1 && count > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              File {current} of {count} (Max 3 files)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

