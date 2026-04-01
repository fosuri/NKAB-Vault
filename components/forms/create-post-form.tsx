"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileArchive, ImagePlus, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/actions/create-post";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/kibo-ui/dropzone";

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
const MAX_FILES = 12;

export function CreatePostForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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
            const formData = new FormData(event.currentTarget);

            for (const file of selectedFiles) {
              formData.append("files", file);
            }

            startTransition(async () => {
              const result = await createPost(formData);

              if (result.error) {
                toast.error(result.error);
                return;
              }

              toast.success("Post created");
              formRef.current?.reset();
              setSelectedFiles([]);
            });
          }}
        >
          <div className="rounded-xl border border-border p-4">
            <Dropzone
              className="h-105 rounded-lg border border-dashed border-border bg-background p-6 hover:bg-muted/40"
              src={selectedFiles.length ? selectedFiles : undefined}
              accept={ACCEPTED_MEDIA_TYPES}
              maxSize={MAX_FILE_SIZE}
              maxFiles={MAX_FILES}
              onDrop={(acceptedFiles) => {
                setSelectedFiles(acceptedFiles);
              }}
              onError={(error) => {
                toast.error(error.message || "Unable to add file");
              }}
            >
              <DropzoneEmptyState className="h-full text-center">
                <div className="flex h-full flex-col items-center justify-center gap-5">
                  <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <FileArchive className="size-8" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">Drop your file here</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG, WEBP, GIF, MP4, WEBM, MOV formats</p>
                    <p className="text-sm text-muted-foreground">Maximum file size: 25 MB</p>
                  </div>
                  <span className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-semibold text-foreground">Choose file</span>
                </div>
              </DropzoneEmptyState>

              <DropzoneContent className="h-full text-center">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Selected files: {selectedFiles.length}</p>
                    <div className="max-h-75 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-left">
                      {selectedFiles.map((file) => {
                        const isVideo = file.type.startsWith("video/");

                        return (
                          <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-muted-foreground">
                            {isVideo ? <Video className="size-4" /> : <ImagePlus className="size-4" />}
                            <span className="truncate text-xs">{file.name}</span>
                            <span className="ml-auto text-[11px]">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Drag and drop or click to replace your files.</p>
                </div>
              </DropzoneContent>
            </Dropzone>
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
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="public">Public - visible to everyone</option>
                <option value="private">Private - only you</option>
                <option value="paid">Paid - for subscribers</option>
              </select>
              <FieldDescription>
                Controls who can see this post in the feed.
              </FieldDescription>
            </Field>

            {!selectedFiles.length ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                Add one or more media files to publish your post.
              </p>
            ) : null}

            <Button
              type="submit"
              className="mt-2 h-10 w-full"
              disabled={isPending || !selectedFiles.length}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Create post"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Upload content according to <Link href="/" className="underline underline-offset-2">site rules</Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}