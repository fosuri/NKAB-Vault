"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

export function PostMediaPreview({ src, alt, isVideo }: { src: string; alt: string; isVideo: boolean }) {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isVideo) {
      const video = document.createElement("video");
      video.src = src;
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setDuration(video.duration);
      };
    }
  }, [src, isVideo]);

  const formatDuration = (d: number) => {
    if (!Number.isFinite(d)) return "0:00";
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const imageUrl = isVideo ? src.replace(/\.[^/.]+$/, ".jpg") : src;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/40 bg-black/5">
      <Image
        src={imageUrl}
        alt={alt}
        className="max-h-155 w-full object-cover"
        width={520}
        height={520}
      />
      {isVideo && (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 shadow-sm backdrop-blur transition-transform group-hover:scale-110">
              <Play className="ml-1 h-6 w-6 fill-white text-white" />
            </div>
          </div>
          {duration !== null && (
            <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-white backdrop-blur">
              {formatDuration(duration)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
