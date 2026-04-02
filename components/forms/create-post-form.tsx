"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CropIcon,
  FileArchive,
  ImagePlus,
  Loader2,
  RotateCcwIcon,
  Video,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/actions/create-post";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/kibo-ui/dropzone";
import {
  ImageCrop,
  ImageCropContent,
  ImageCropApply,
  ImageCropReset,
} from "@/components/kibo-ui/image-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACCEPTED_MEDIA_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;


function dataUrlToFile(dataUrl: string, originalFile: File): File {
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

type FileEntry = {
  original: File;
  croppedDataUrl: string | null;
  previewUrl: string;
};

export function CreatePostForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const [entry, setEntry] = useState<FileEntry | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setEntry((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return {
        original: file,
        croppedDataUrl: null,
        previewUrl: URL.createObjectURL(file),
      };
    });
    setCropOpen(false);
  }, []);

  const handleCropApplied = useCallback((dataUrl: string) => {
    setEntry((prev) => (prev ? { ...prev, croppedDataUrl: dataUrl } : prev));
    setCropOpen(false);
  }, []);

  const handleRemove = useCallback(() => {
    setEntry((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setCropOpen(false);
  }, []);

  const isImage = entry?.original.type.startsWith("image/") ?? false;
  const isVideo = entry?.original.type.startsWith("video/") ?? false;

  return (
    <Card className="px-2 py-6 shadow-[0_0_400px] shadow-card-foreground/10">
      <CardHeader>
        <CardTitle className="text-xl">Create post</CardTitle>
        <CardDescription>
          Upload media with a richer drag-and-drop workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!entry) return;
            const formData = new FormData(event.currentTarget);

            if (entry.croppedDataUrl) {
              formData.append("files", dataUrlToFile(entry.croppedDataUrl, entry.original));
            } else {
              formData.append("files", entry.original);
            }

            startTransition(async () => {
              const result = await createPost(formData);

              if (result.error) {
                toast.error(result.error);
                return;
              }

              toast.success("Post created");
              formRef.current?.reset();
              if (entry) URL.revokeObjectURL(entry.previewUrl);
              setEntry(null);
              setCropOpen(false);
            });
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border p-4">
              <Dropzone
                className="h-52 rounded-lg border border-dashed border-border bg-background p-6 hover:bg-muted/40"
                src={entry ? [entry.original] : undefined}
                accept={ACCEPTED_MEDIA_TYPES}
                maxSize={MAX_FILE_SIZE}
                maxFiles={1}
                onDrop={handleDrop}
                onError={(error) => {
                  toast.error(error.message || "Unable to add file");
                }}
              >
                <DropzoneEmptyState className="h-full text-center">
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <FileArchive className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        Drop your file here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP, GIF, MP4, WEBM, MOV
                      </p>
                      <p className="text-xs text-muted-foreground">Max 25 MB</p>
                    </div>
                    <span className="rounded-lg border border-border bg-background px-5 py-2 text-sm font-semibold text-foreground">
                      Choose file
                    </span>
                  </div>
                </DropzoneEmptyState>

                <DropzoneContent className="h-full text-center">
                  <div className="flex h-full flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        1 file selected
                      </p>
                      {entry && (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-left text-muted-foreground">
                          {isVideo ? (
                            <Video className="size-4 shrink-0" />
                          ) : (
                            <ImagePlus className="size-4 shrink-0" />
                          )}
                          <span className="truncate text-xs">
                            {entry.original.name}
                          </span>
                          {entry.croppedDataUrl && (
                            <CheckIcon className="size-3 shrink-0 text-green-500" />
                          )}
                          <span className="ml-auto text-[11px] shrink-0">
                            {(entry.original.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Drag and drop or click to replace.
                    </p>
                  </div>
                </DropzoneContent>
              </Dropzone>
            </div>

            {entry && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  {isVideo ? (
                    <Video className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ImagePlus className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate text-xs font-medium text-foreground flex-1">
                    {entry.original.name}
                  </span>
                  {entry.croppedDataUrl && (
                    <span className="flex items-center gap-1 text-[11px] text-green-500 shrink-0">
                      <CheckIcon className="size-3" /> Cropped
                    </span>
                  )}
                  {isImage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2 text-xs shrink-0"
                      onClick={() => setCropOpen(true)}
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
                    onClick={handleRemove}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>

                <div className="p-3">
                  {isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={entry.croppedDataUrl ?? entry.previewUrl}
                      alt={entry.original.name}
                      className="mx-auto max-h-64 max-w-full rounded-md object-contain bg-muted/40"
                    />
                  ) : isVideo ? (
                    <video
                      src={entry.previewUrl}
                      controls
                      className="w-full max-h-64 rounded-md bg-muted/40"
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>

          
          <FieldGroup className="gap-4 rounded-xl border border-border p-4">
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <input
                id="title"
                name="title"
                maxLength={120}
                required
                placeholder="Give your post a short title"
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldDescription>
                A title helps users quickly understand your post.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <textarea
                id="description"
                name="description"
                maxLength={500}
                required
                placeholder="Describe what you are sharing"
                className="min-h-40 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldDescription>
                One description is attached to the whole post.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="access">Access type</FieldLabel>
              <select
                id="access"
                name="access"
                defaultValue="public"
                className="h-10 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option className="bg-background text-foreground" value="public">
                  Public - visible to everyone
                </option>
                <option className="bg-background text-foreground" value="private">
                  Private - only you
                </option>
                <option className="bg-background text-foreground" value="paid">
                  Paid - for subscribers
                </option>
              </select>
              <FieldDescription>
                Controls who can see this post in the feed.
              </FieldDescription>
            </Field>

            {!entry && (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                Add a media file to publish your post.
              </p>
            )}

            <Button
              type="submit"
              className="mt-2 h-10 w-full"
              disabled={isPending || !entry}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Create post"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Upload content according to <Link href="/" className="underline underline-offset-2">site rules</Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>

      {entry && isImage && (
        <Dialog open={cropOpen} onOpenChange={setCropOpen}>
          <DialogContent
            className="sm:max-w-lg"
            showCloseButton={false}

            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Crop image</DialogTitle>
            </DialogHeader>

            <ImageCrop file={entry.original} onCrop={handleCropApplied}>
              <div className="flex flex-col items-center gap-4">
                <ImageCropContent className="max-h-[400px] rounded-md" />
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <ImageCropReset asChild>
                  <Button type="button" variant="outline" className="gap-1.5">
                    <RotateCcwIcon className="size-4" />
                    Reset
                  </Button>
                </ImageCropReset>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCropOpen(false)}
                >
                  Cancel
                </Button>
                <ImageCropApply asChild>
                  <Button type="button" className="gap-1.5">
                    <CheckIcon className="size-4" />
                    Apply crop
                  </Button>
                </ImageCropApply>
              </div>
            </ImageCrop>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}