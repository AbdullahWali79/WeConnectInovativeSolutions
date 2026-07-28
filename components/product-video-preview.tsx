"use client";

import {
  getGoogleDrivePreviewUrl,
  getYouTubeEmbedUrl,
  isDirectVideoUrl,
} from "@/lib/promo-media";

type ProductVideoPreviewProps = {
  url: string | null | undefined;
  title: string;
  className?: string;
};

export function ProductVideoPreview({ url, title, className = "" }: ProductVideoPreviewProps) {
  const cleanUrl = url?.trim();
  if (!cleanUrl) return null;

  const embedUrl = getYouTubeEmbedUrl(cleanUrl) ?? getGoogleDrivePreviewUrl(cleanUrl);

  if (embedUrl) {
    return (
      <iframe
        className={`aspect-video w-full border-0 ${className}`}
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (isDirectVideoUrl(cleanUrl)) {
    return (
      <video
        className={`aspect-video w-full bg-black object-contain ${className}`}
        src={cleanUrl}
        controls
        preload="metadata"
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return (
    <a
      className={`flex aspect-video w-full items-center justify-center bg-slate-950 px-6 text-center font-semibold text-white underline ${className}`}
      href={cleanUrl}
      target="_blank"
      rel="noreferrer"
    >
      Open submitted video or live demo
    </a>
  );
}
