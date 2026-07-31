"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/icon";
import { ProductVideoPreview } from "@/components/product-video-preview";

type VideoCardProps = {
  video: {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    student: unknown;
  };
};

export function VideoCard({ video }: VideoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div className="group relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-outline/10 transition-all hover:shadow-md hover:ring-primary/20">
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="text-xl font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
          </div>
          
          {video.description && (
            <p className="mb-6 text-sm text-on-surface-variant line-clamp-3">
              {video.description}
            </p>
          )}

          <div className="mt-auto border-t border-outline/10 pt-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {(((video.student as unknown) as { full_name: string | null })?.full_name || "S")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{((video.student as unknown) as { full_name: string | null })?.full_name || "Student"}</p>
                <p className="text-xs text-on-surface-variant">WeConnect Student</p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-110"
            >
              <Icon name="play_arrow" className="text-[20px]" />
              Watch Video
            </button>
          </div>
        </div>
      </div>

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
