import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type CarouselApi } from "@/components/ui/carousel";
import { getCloudinarySignature } from "@/lib/actions/cloudinary";
import { createPost } from "@/lib/actions/create-post";
import { type FileEntry, dataUrlToFile } from "./types";
import { ACCESS_TYPES } from "@/lib/db/auth-schema";

/**
 * Custom Hook: useCreatePost.
 * Manages the multi-step state of the post creation form, including 
 * media selection, cropping, Cloudinary uploads, and final submission.
 */
export function useCreatePost() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Media state
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);

  // Carousel and UI state
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [access, setAccess] = useState<number>(ACCESS_TYPES.PUBLIC);
  const [addPassword, setAddPassword] = useState(false);
  const [password, setPassword] = useState("");

  // Sync access changes and reset password if not private
  const handleAccessChange = (newAccess: number) => {
    setAccess(newAccess);
    if (newAccess !== ACCESS_TYPES.PRIVATE) {
      setAddPassword(false);
      setPassword("");
    }
  };

  // Keep track of the current slide in the media carousel
  useEffect(() => {
    if (!api) return;
    const updateSlideInfo = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);
    };
    updateSlideInfo();
    api.on("select", updateSlideInfo);
    api.on("reInit", updateSlideInfo);
  }, [api]);

  // Handle file drops with duplicate prevention and limit (Max 3)
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

  // Update a specific entry with cropped data
  const handleCropApplied = useCallback((dataUrl: string) => {
    if (cropIndex === null) return;
    setEntries((prev) => {
      const next = [...prev];
      next[cropIndex] = { ...next[cropIndex], croppedDataUrl: dataUrl };
      return next;
    });
    setCropIndex(null);
  }, [cropIndex]);

  // Remove a media entry and revoke its blob preview URL to prevent memory leaks
  const handleRemove = useCallback((indexToRemove: number) => {
    setEntries((prev) => {
      const removed = prev[indexToRemove];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== indexToRemove);
    });
  }, []);

  /**
   * Final Submission Handler:
   * 1. Fetches Cloudinary signed signature.
   * 2. Uploads each file (original or cropped) sequentially.
   * 3. Sends the resulting media metadata and post info to the server action.
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (entries.length === 0) return;
    const formData = new FormData(event.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const formAccess = Number(formData.get("access"));

    const effectivePassword = formAccess === ACCESS_TYPES.PRIVATE && addPassword && password.trim() ? password.trim() : null;

    startTransition(async () => {
      try {
        const sig = await getCloudinarySignature();

        const uploadedMedia = [];
        for (const entry of entries) {
          // Use cropped file if available, otherwise original
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

        // Persist the post in the database
        const result = await createPost({
          title,
          description,
          access: formAccess,
          password: effectivePassword,
          media: uploadedMedia,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Post created");
        
        // Cleanup local state
        formRef.current?.reset();
        entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
        setEntries([]);
        setCropIndex(null);
        setAddPassword(false);
        setPassword("");
        
        // View the new post
        router.push(`/post/${result.postId}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create post");
      }
    });
  };

  return {
    state: {
      entries,
      cropIndex,
      api,
      current,
      count,
      access,
      addPassword,
      password,
      isPending,
      formRef,
    },
    actions: {
      setEntries,
      setCropIndex,
      setApi,
      setAccess,
      setAddPassword,
      setPassword,
      handleAccessChange,
    },
    handlers: {
      handleDrop,
      handleRemove,
      handleCropApplied,
      handleSubmit,
    },
  };
}

