"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/icon";
import { ProductVideoPreview } from "@/components/product-video-preview";
import { getGoogleDriveThumbnailUrl, getPlayableVideoUrl, getYouTubeThumbnailUrl } from "@/lib/promo-media";

type VideoCardProps = {
  video: {
    id: string;
    title: string;
    video_url: string;
  };
};

export function VideoCard({ video }: VideoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageThumbnail = getYouTubeThumbnailUrl(video.video_url) ?? getGoogleDriveThumbnailUrl(video.video_url);
  const playableVideoUrl = getPlayableVideoUrl(video.video_url);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModalOpen(false);
    };
    
    if (isModalOpen) {
      window.addEventListener("keydown", closeOnEscape);
    }
    
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isModalOpen]);

  return (
    <>
      <article className="group overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-outline/10 transition hover:-translate-y-1 hover:shadow-lg hover:ring-primary/30">
        <button type="button" onClick={() => setIsModalOpen(true)} className="relative block aspect-video w-full overflow-hidden bg-slate-950 text-left" aria-label={`Play ${video.title}`}>
          {imageThumbnail ? (
            <span className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${JSON.stringify(imageThumbnail).slice(1, -1)})` }} />
          ) : playableVideoUrl ? (
            <video className="h-full w-full object-cover" src={playableVideoUrl} muted playsInline preload="metadata" />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-br from-primary/70 to-slate-950" />
          )}
          <span className="absolute inset-0 bg-black/10 transition group-hover:bg-black/25" />
          <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary shadow-lg transition group-hover:scale-110">
            <Icon name="play_arrow" className="text-2xl" />
          </span>
        </button>
        <button type="button" onClick={() => setIsModalOpen(true)} className="block min-h-16 w-full p-3 text-left">
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-on-surface transition-colors group-hover:text-primary">{video.title}</h3>
        </button>
      </article>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`video-title-${video.id}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/20">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
              <h2 id={`video-title-${video.id}`} className="text-sm font-bold text-white sm:text-base line-clamp-1">
                {video.title}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close video"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="w-full bg-black">
              {/* ProductVideoPreview will render the iframe or video tag taking full width */}
              <ProductVideoPreview url={video.video_url} title={video.title} className="rounded-none" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
