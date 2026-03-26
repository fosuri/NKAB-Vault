"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/actions/create-post";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function CreatePostForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  return (
    <Card className="border-border/60 bg-card/80 shadow-[0_20px_80px_rgba(0,0,0,0.08)] backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl">Create post</CardTitle>
        <CardDescription>
          Upload images, GIFs, or videos and publish them to the main page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

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
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <textarea
                id="description"
                name="description"
                maxLength={500}
                required
                placeholder="Describe what you are sharing"
                className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldDescription>
                One description is attached to the whole post.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="files">Media files</FieldLabel>
              <Input
                id="files"
                name="files"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                required
                onChange={(event) => {
                  setSelectedFiles(Array.from(event.target.files ?? []));
                }}
              />
              <FieldDescription>
                Supported: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV. Max 25MB per file.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {selectedFiles.length ? (
            <div className="grid gap-2 rounded-xl border border-dashed border-border/70 bg-muted/40 p-3 text-sm">
              {selectedFiles.map((file) => {
                const isVideo = file.type.startsWith("video/");

                return (
                  <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-muted-foreground">
                    {isVideo ? <Video className="size-4" /> : <ImagePlus className="size-4" />}
                    <span className="truncate">{file.name}</span>
                    <span className="ml-auto text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          <Button type="submit" className="w-full sm:w-fit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Create post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}