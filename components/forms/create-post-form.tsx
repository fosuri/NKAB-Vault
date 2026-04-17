"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreatePost } from "./create-post/use-create-post";
import { MediaSection } from "./create-post/media-section";
import { DetailsSection } from "./create-post/details-section";
import { CropModal } from "./create-post/crop-modal";

export function CreatePostForm() {
  const { state, actions, handlers } = useCreatePost();
  const [showPassword, setShowPassword] = useState(false);

  const entryToCrop = state.cropIndex !== null ? state.entries[state.cropIndex] : null;

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
          ref={state.formRef}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          onSubmit={handlers.handleSubmit}
        >
          <MediaSection
            entries={state.entries}
            current={state.current}
            count={state.count}
            setApi={actions.setApi}
            handleDrop={handlers.handleDrop}
            handleRemove={handlers.handleRemove}
            setCropIndex={actions.setCropIndex}
          />
          <DetailsSection
            entriesLength={state.entries.length}
            access={state.access}
            handleAccessChange={actions.handleAccessChange}
            addPassword={state.addPassword}
            setAddPassword={actions.setAddPassword}
            passwordValue={state.password}
            setPasswordValue={actions.setPassword}
            isPending={state.isPending}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </form>
      </CardContent>

      <CropModal
        cropIndex={state.cropIndex}
        setCropIndex={actions.setCropIndex}
        entryToCrop={entryToCrop}
        handleCropApplied={handlers.handleCropApplied}
      />
    </Card>
  );
}
