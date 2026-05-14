import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ImageCrop,
  ImageCropContent,
  ImageCropApply,
  ImageCropReset,
} from "@/components/kibo-ui/image-crop";
import { RotateCcwIcon, CheckIcon } from "lucide-react";
import { type FileEntry } from "./types";

interface CropModalProps {
  cropIndex: number | null;
  setCropIndex: (idx: number | null) => void;
  entryToCrop: FileEntry | null;
  handleCropApplied: (dataUrl: string) => void;
}

/**
 * Image Crop Modal.
 * Provides a UI for users to crop their images before final upload.
 * Uses client-side processing to generate the cropped version as a data URL.
 */
export function CropModal({
  cropIndex,
  setCropIndex,
  entryToCrop,
  handleCropApplied,
}: CropModalProps) {
  // Only allow cropping for valid image files
  if (!entryToCrop || !entryToCrop.original.type.startsWith("image/")) {
    return null;
  }

  return (
    <Dialog open={cropIndex !== null} onOpenChange={(open) => !open && setCropIndex(null)}>
      <DialogContent
        className="w-[95vw] sm:max-w-lg max-h-[95vh] overflow-y-auto"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
        </DialogHeader>

        {/* ImageCrop provider from Kibo UI */}
        <ImageCrop file={entryToCrop.original} onCrop={handleCropApplied}>
          <div className="flex flex-col items-center gap-4">
            <ImageCropContent className="max-h-[50vh] sm:max-h-[400px] w-full rounded-md object-contain" />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 pt-4">
            <ImageCropReset asChild>
              <Button type="button" variant="outline" className="gap-1.5 w-full sm:w-auto order-2 sm:order-1">
                <RotateCcwIcon className="size-4" />
                Reset
              </Button>
            </ImageCropReset>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCropIndex(null)}
              className="w-full sm:w-auto order-3 sm:order-2"
            >
              Cancel
            </Button>
            <ImageCropApply asChild>
              <Button type="button" className="gap-1.5 w-full sm:w-auto order-1 sm:order-3">
                <CheckIcon className="size-4" />
                Apply crop
              </Button>
            </ImageCropApply>
          </div>
        </ImageCrop>
      </DialogContent>
    </Dialog>
  );
}

