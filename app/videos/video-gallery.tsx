"use client";
import { CmsElement, CmsInstance } from "@/components/cms/cms-element";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { getVideoSource, type VideoSource } from "@/lib/promo-media";
import { VideoCard } from "./video-card";

type PublicVideo = { id: string; title: string; video_url: string };

const sourceOptions: Array<{ value: "all" | VideoSource; label: string }> = [
  { value: "all", label: "All sources" },
  { value: "youtube", label: "YouTube" },
  { value: "google-drive", label: "Google Drive" },
  { value: "github", label: "GitHub" },
  { value: "direct", label: "Direct video" },
  { value: "other", label: "Other" },
];

export function VideoGallery({ videos }: { videos: PublicVideo[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | VideoSource>("all");
  const filteredVideos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return videos.filter((video) =>
      (!needle || video.title.toLowerCase().includes(needle))
      && (source === "all" || getVideoSource(video.video_url) === source),
    );
  }, [query, source, videos]);

  return (
    <>
      <CmsElement cmsId="11fef5de-0" as="div" className="mb-8 flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-outline/10 sm:flex-row">
        <CmsElement cmsId="11fef5de-1" as="label" className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input className="wc-input w-full pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos by title..." aria-label="Search videos" />
        </CmsElement>
        <select className="wc-input sm:w-52" value={source} onChange={(event) => setSource(event.target.value as "all" | VideoSource)} aria-label="Filter videos by source">
          {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </CmsElement>

      {filteredVideos.length ? (
        <CmsElement cmsId="11fef5de-2" as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredVideos.map((video) => <CmsInstance key={video.id} instance={String(video.id)}><VideoCard key={video.id} video={video} /></CmsInstance>)}
        </CmsElement>
      ) : (
        <CmsElement cmsId="11fef5de-3" as="div" className="rounded-3xl bg-surface p-12 text-center shadow-sm ring-1 ring-outline/10">
          <Icon name="search_off" className="text-4xl text-primary" />
          <CmsElement cmsId="11fef5de-4" as="h2" className="mt-3 text-xl font-bold text-on-surface">No matching videos</CmsElement>
          <CmsElement cmsId="11fef5de-5" as="p" className="mt-1 text-on-surface-variant">Try another title or source filter.</CmsElement>
        </CmsElement>
      )}
    </>
  );
}
