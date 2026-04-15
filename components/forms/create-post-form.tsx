"use client";

import { useCallback, useRef, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
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
import { getCloudinarySignature } from "@/lib/actions/cloudinary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { POST_ACCESS_OPTIONS } from "@/lib/config/post-access";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);

  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [access, setAccess] = useState<"public" | "private" | "paid">("public");

  const selectedAccess = POST_ACCESS_OPTIONS.find((a) => a.value === access) || POST_ACCESS_OPTIONS[0];

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateSlideInfo = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);
    };

    updateSlideInfo();

    api.on("select", updateSlideInfo);
    api.on("reInit", updateSlideInfo);
  }, [api]);

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      for (const file of acceptedFiles) {
        if (newEntries.length >= 3) break;
        newEntries.push({
          original: file,
          croppedDataUrl: null,
          previewUrl: URL.createObjectURL(file),
        });
      }
      return newEntries;
    });
  }, []);

  const handleCropApplied = useCallback((dataUrl: string) => {
    if (cropIndex === null) return;
    setEntries((prev) => {
      const next = [...prev];
      next[cropIndex] = { ...next[cropIndex], croppedDataUrl: dataUrl };
      return next;
    });
    setCropIndex(null);
  }, [cropIndex]);

  const handleRemove = useCallback((indexToRemove: number) => {
    setEntries((prev) => {
      const removed = prev[indexToRemove];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== indexToRemove);
    });
  }, []);

  const entryToCrop = cropIndex !== null ? entries[cropIndex] : null;

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
            if (entries.length === 0) return;
            const formData = new FormData(event.currentTarget);
            const title = formData.get("title") as string;
            const description = formData.get("description") as string;
            const access = formData.get("access") as "public" | "private" | "paid";

            startTransition(async () => {
              try {
                const sig = await getCloudinarySignature();
                
                const uploadedMedia = [];
                for (const entry of entries) {
                  const file = entry.croppedDataUrl ? dataUrlToFile(entry.croppedDataUrl, entry.original) : entry.original;
                  
                  const uploadData = new FormData();
                  uploadData.append("file", file);
                  uploadData.append("api_key", sig.apiKey);
                  uploadData.append("timestamp", sig.timestamp.toString());
                  uploadData.append("signature", sig.signature);
                  uploadData.append("folder", sig.folder);
                  
                  const uploadRes = await fetch(
                    `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
                    { method: "POST", body: uploadData }
                  );
                  
                  if (!uploadRes.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                  }
                  
                  const data = await uploadRes.json();
                  uploadedMedia.push({
                    publicId: data.public_id,
                    secureUrl: data.secure_url,
                    resourceType: data.resource_type,
                    format: data.format,
                    width: data.width,
                    height: data.height,
                    bytes: data.bytes,
                    originalFilename: data.original_filename ?? file.name,
                  });
                }

                const result = await createPost({
                  title,
                  description,
                  access,
                  media: uploadedMedia,
                });

                if (result.error) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Post created");
                formRef.current?.reset();
                entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
                setEntries([]);
                setCropIndex(null);
                router.push(`/post/${result.postId}`);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to create post");
              }
            });
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border p-4">
              <Dropzone
                className="h-52 rounded-lg border border-dashed border-border bg-background p-6 hover:bg-muted/40"
                accept={ACCEPTED_MEDIA_TYPES}
                maxSize={MAX_FILE_SIZE}
                maxFiles={3}
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
                        Drop your files here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (Max 3 files)
                      </p>
                      <p className="text-xs text-muted-foreground">Max 25 MB</p>
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
                              <span className="truncate text-xs flex-1">
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

            {entries.length > 0 && (
              <div className="flex flex-col gap-2">
                <Carousel className="w-full" setApi={setApi}>
                  <CarouselContent>
                    {entries.map((entry, idx) => {
                      const isImage = entry.original.type.startsWith("image/");
                      const isStaticImage = isImage && entry.original.type !== "image/gif";
                      const isVideo = entry.original.type.startsWith("video/");
                      return (
                        <CarouselItem key={idx}>
                          <div className="rounded-xl border border-border overflow-hidden bg-background">
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

                            <div className="p-3">
                              {isImage ? (
                                <img
                                  src={entry.croppedDataUrl ?? entry.previewUrl}
                                  alt={entry.original.name}
                                  className="mx-auto max-h-64 h-64 max-w-full rounded-md object-contain bg-muted/40"
                                />
                              ) : isVideo ? (
                                <video
                                  src={entry.previewUrl}
                                  controls
                                  className="mx-auto max-h-64 h-64 w-full rounded-md bg-muted/40 object-contain"
                                />
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

          
          <FieldGroup className="gap-4 p-0">
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
              <Textarea
                id="description"
                name="description"
                maxLength={500}
                required
                placeholder="Describe what you are sharing"
                className="min-h-40 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                showCount
              />
              <FieldDescription>
                One description is attached to the whole post.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="access">Access type</FieldLabel>
              <input type="hidden" name="access" value={access} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal h-10 border-input bg-background hover:bg-background/90 px-3" disabled={isPending}>
                    <span className="flex items-center gap-2">
                      <selectedAccess.icon className="size-4" />
                      {selectedAccess.label} - {selectedAccess.description}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {POST_ACCESS_OPTIONS.map((option) => (
                    <DropdownMenuItem 
                      key={option.value}
                      onClick={() => setAccess(option.value)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <option.icon className="size-4" />
                        {option.label}
                      </span>
                      {access === option.value && <Check className="size-4 text-emerald-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FieldDescription>
                Controls who can see this post in the feed.
              </FieldDescription>
            </Field>

            {entries.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                Add at least one media file to publish your post.
              </p>
            )}

            <Button
              type="submit"
              className="mt-2 h-10 w-full hover:bg-primary/80"
              disabled={isPending || entries.length === 0}
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

      {entryToCrop && entryToCrop.original.type.startsWith("image/") && (
        <Dialog open={cropIndex !== null} onOpenChange={(open) => !open && setCropIndex(null)}>
          <DialogContent
            className="sm:max-w-lg"
            showCloseButton={false}

            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Crop image</DialogTitle>
            </DialogHeader>

            <ImageCrop file={entryToCrop.original} onCrop={handleCropApplied}>
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
                  onClick={() => setCropIndex(null)}
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
