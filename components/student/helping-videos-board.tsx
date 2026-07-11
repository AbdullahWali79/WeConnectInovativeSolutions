"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { HelpingVideo } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/youtube";

type HelpingVideoRow = Pick<HelpingVideo, "id" | "title" | "youtube_url" | "description" | "display_order" | "created_at">;

export function HelpingVideosBoard() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<HelpingVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [query, setQuery] = useState("");
  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("helping_videos")
      .select("id,title,youtube_url,description,display_order,created_at")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) setToast({ type: "error", message: error.message });
    setRows((data ?? []) as HelpingVideoRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((video) => {
      const haystacks = [video.title, video.description, video.youtube_url].filter(Boolean);
      return haystacks.some((value) => value.toLowerCase().includes(needle));
    });
  }, [query, rows]);

  if (loading) return <LoadingState label="Loading helping videos..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Student Hub"
        title="Helping Videos"
        description="Curated YouTube guides and walkthroughs added by the admin for every student."
        action={<Link href="/student" className="wc-secondary-btn w-full justify-center sm:w-auto"><Icon name="arrow_back" /> Back to Tasks</Link>}
      />

      <div className="wc-card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-on-surface">Search videos</p>
          <p className="text-xs text-on-surface-variant">Find a video by title, description, or YouTube link.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            className="wc-input w-full sm:w-80"
            type="search"
            placeholder="Search video..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="wc-secondary-btn whitespace-nowrap" onClick={() => setQuery("")}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No helping videos yet" : "No videos match your search"}
          description={rows.length === 0 ? "Admin will add useful videos here for students." : "Try a different keyword or clear the search."}
          icon="smart_display"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((video) => {
            const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
            const thumbnail = getYouTubeThumbnailUrl(video.youtube_url);
            return (
              <article key={video.id} className="overflow-hidden rounded-[24px] border border-outline-variant/60 bg-white shadow-[0_18px_40px_rgba(8,24,64,0.08)]">
                <div className="aspect-video bg-slate-100">
                  {embedUrl ? (
                    <iframe
                      title={video.title}
                      src={embedUrl}
                      className="h-full w-full"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={thumbnail} alt={video.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-on-surface-variant">
                      <Icon name="smart_display" className="text-4xl" />
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                      Video {String(video.display_order).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] font-semibold text-on-surface-variant">{formatDate(video.created_at)}</span>
                  </div>
                  <h3 className="text-lg font-black leading-tight text-on-surface sm:text-xl">{video.title}</h3>
                  <p className="text-sm leading-6 text-on-surface-variant">{video.description ?? "Helpful video shared by admin."}</p>
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <a href={video.youtube_url} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 sm:w-auto">
                      <Icon name="play_circle" />
                      Watch on YouTube
                    </a>
                    <span className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#91A3C7] sm:text-right">For all students</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
