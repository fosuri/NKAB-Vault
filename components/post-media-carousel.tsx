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

export function PostMediaCarousel({ media }: PostMediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (!api) return;

    const updateSlideInfo = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);
    };

    const onSelect = () => {
      updateSlideInfo();
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
        {media.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
      {media.length > 1 && count > 0 && (
        <div className="mt-3 text-center text-sm font-medium text-muted-foreground">
          File {current} of {count}
        </div>
      )}
    </>
  );
}
