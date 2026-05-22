"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";

type MediaItem = {
  id: string;
  resourceType: string;
  secureUrl: string;
  originalFilename?: string | null;
};

interface PostMediaCarouselProps {
  media: MediaItem[];
}

function getDisplayUrl(item: MediaItem) {
  return item.resourceType === "video" ? item.secureUrl.replace(/\.mov$/i, ".mp4") : item.secureUrl;
}

function getDownloadUrl(item: MediaItem) {
  return getDisplayUrl(item).replace("/upload/", "/upload/fl_attachment/");
}

function getDownloadFilename(item: MediaItem, index: number) {
  const filename = item.originalFilename?.trim() || `post-file-${index + 1}`;

  return filename.replace(/[\\/:*?"<>|]+/g, "-");
}

/**
 * Post Media Carousel.
 * Provides a paginated interface for viewing multiple media items (images/videos) in a post.
 * Features: Native video controls and automatic resource management (pausing off-screen videos).
 */
export function PostMediaCarousel({ media }: PostMediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  /**
   * Carousel API Effect:
   * 1. Synchronizes local state with carousel slide info (current/total).
   * 2. Performance: Pauses any active video when the user slides to a different item.
   */
  useEffect(() => {
    if (!api) return;

    const updateSlideInfo = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);
    };

    const onSelect = () => {
      updateSlideInfo();
      // Ensure videos don't keep playing in the background when not visible
      videoRefs.current.forEach((video) => {
        if (video && !video.paused) {
          video.pause();
        }
      });
    };

    updateSlideInfo();
    api.on("select", onSelect);
    api.on("reInit", updateSlideInfo);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", updateSlideInfo);
    };
  }, [api]);

  if (!media || media.length === 0) {
    return null;
  }

  const currentIndex = current > 0 ? current - 1 : 0;
  const currentMedia = media[currentIndex] ?? media[0];

  return (
    <>
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent className="items-center">
          {media.map((item, index) => (
            <CarouselItem key={item.id}>
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-black/5 flex items-center justify-center">
                {/* Content: Video with native controls or Next.js optimized Image */}
                {item.resourceType === "video" ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={getDisplayUrl(item)}
                    controls
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <Image
                    src={item.secureUrl}
                    alt={item.originalFilename ?? "Post image"}
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="object-contain"
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Navigation: Visible only when multi-media content is present */}
        {media.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
      <div className="mt-3 flex items-center justify-between gap-3">
        {/* Pagination Feedback */}
        {media.length > 1 && count > 0 ? (
          <div className="text-sm font-medium text-muted-foreground">
            File {current} of {count}
          </div>
        ) : (
          <div />
        )}
        <Button asChild variant="outline" size="sm">
          <a
            href={getDownloadUrl(currentMedia)}
            download={getDownloadFilename(currentMedia, currentIndex)}
            aria-label={`Download ${getDownloadFilename(currentMedia, currentIndex)}`}
          >
            <Download className="size-4" />
            Download
          </a>
        </Button>
      </div>
    </>
  );
}

