"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreatePost } from "./create-post/use-create-post";
import { MediaSection } from "./create-post/media-section";
import { DetailsSection } from "./create-post/details-section";
import { CropModal } from "./create-post/crop-modal";

/**
 * Create Post Form.
 * The primary container for the post publishing workflow. 
 * Coordinates the Media Section, Details Section, and Crop Modal using a centralized state hook.
 */
export function CreatePostForm({ isPro }: { isPro?: boolean }) {
  // Centralized state management for the entire workflow
  const { state, actions, handlers } = useCreatePost();
  const { entries, cropIndex, current, count, access, addPassword, password, isPending, formRef } = state;
  const [showPassword, setShowPassword] = useState(false);

  // Identify the specific file currently being cropped
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
          onSubmit={handlers.handleSubmit}
        >
          {/* Left Column: Media upload and carousel preview */}
          <MediaSection
            entries={entries}
            current={current}
            count={count}
            setApi={actions.setApi}
            handleDrop={handlers.handleDrop}
            handleRemove={handlers.handleRemove}
            setCropIndex={actions.setCropIndex}
            isPro={isPro}
          />
          
          {/* Right Column: Title, Description, and Access settings */}
          <DetailsSection
            entriesLength={entries.length}
            access={access}
            handleAccessChange={actions.handleAccessChange}
            addPassword={addPassword}
            setAddPassword={actions.setAddPassword}
            passwordValue={password}
            setPasswordValue={actions.setPassword}
            isPending={isPending}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isPro={isPro}
          />
        </form>
      </CardContent>

      {/* Overlay: Image cropping tool */}
      <CropModal
        cropIndex={cropIndex}
        setCropIndex={actions.setCropIndex}
        entryToCrop={entryToCrop}
        handleCropApplied={handlers.handleCropApplied}
      />
    </Card>
  );
}

