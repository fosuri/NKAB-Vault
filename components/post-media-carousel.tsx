"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
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
                    src={item.secureUrl.replace(/\.mov$/i, ".mp4")}
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
      {/* Pagination Feedback */}
      {media.length > 1 && count > 0 && (
        <div className="mt-3 text-center text-sm font-medium text-muted-foreground">
          File {current} of {count}
        </div>
      )}
    </>
  );
}

