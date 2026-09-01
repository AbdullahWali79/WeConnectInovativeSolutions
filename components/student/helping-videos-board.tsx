"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { HelpingVideo } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/youtube";

type HelpingVideoRow = Pick<HelpingVideo, "id" | "title" | "youtube_url" | "description" | "display_order" | "created_at" | "course_id" | "is_must_watch"> & { course_ids: string[] };

export function HelpingVideosBoard() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<HelpingVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"course" | "must_watch">("course");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const studentId = authData.user?.id;
    const enrollmentsRequest = studentId
      ? supabase.from("enrollments").select("course_id").eq("student_id", studentId).eq("status", "active")
      : Promise.resolve({ data: [], error: null });
    const [videosResult, enrollmentsResult] = await Promise.all([
      supabase
      .from("helping_videos")
      .select("id,title,youtube_url,description,display_order,created_at,course_id,is_must_watch,helping_video_courses(course_id)")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
      enrollmentsRequest,
    ]);

    if (videosResult.error) setToast({ type: "error", message: videosResult.error.message });
    else if (enrollmentsResult.error) setToast({ type: "error", message: enrollmentsResult.error.message });
    setRows((videosResult.data ?? []).map((row) => ({
      ...row,
      course_ids: (row.helping_video_courses ?? []).map((assignment: { course_id: string }) => assignment.course_id),
    })) as HelpingVideoRow[]);
    setCourseIds([...(new Set((enrollmentsResult.data ?? []).map((item) => item.course_id)))].filter(Boolean));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((video) => {
      const belongsToTab = activeTab === "must_watch"
        ? video.is_must_watch
        : !video.is_must_watch && video.course_ids.some((courseId) => courseIds.includes(courseId));
      if (!belongsToTab) return false;
      if (!needle) return true;
      const haystacks = [video.title, video.description, video.youtube_url].filter(Boolean);
      return haystacks.some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeTab, courseIds, query, rows]);

  const courseCount = rows.filter((video) => !video.is_must_watch && video.course_ids.some((courseId) => courseIds.includes(courseId))).length;
  const mustWatchCount = rows.filter((video) => video.is_must_watch).length;

  if (loading) return <LoadingState label="Loading helping videos..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-on-surface">Helping Videos</h1>
          <p className="text-sm text-on-surface-variant">Curated YouTube guides and walkthroughs.</p>
        </div>
        <Link href="/student" className="wc-secondary-btn py-1.5 px-3 text-xs"><Icon name="arrow_back" className="text-[16px]" /> Back to Tasks</Link>
      </div>

      <div className="wc-card mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-on-surface">Search videos</p>
          <p className="text-xs text-on-surface-variant">Find a video by title, description, or YouTube link.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            className="wc-input w-full sm:w-64 py-1.5 text-sm"
            type="search"
            placeholder="Search video..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="wc-secondary-btn whitespace-nowrap py-1.5 text-sm" onClick={() => setQuery("")}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-outline-variant bg-surface p-2 sm:inline-grid sm:min-w-[480px]">
        <button type="button" onClick={() => setActiveTab("course")} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${activeTab === "course" ? "bg-primary text-white shadow-sm" : "text-on-surface-variant hover:bg-surface-container"}`}>
          <Icon name="school" /> My Course Videos <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{courseCount}</span>
        </button>
        <button type="button" onClick={() => setActiveTab("must_watch")} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${activeTab === "must_watch" ? "bg-primary text-white shadow-sm" : "text-on-surface-variant hover:bg-surface-container"}`}>
          <Icon name="priority_high" /> Must Watch <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{mustWatchCount}</span>
        </button>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={query ? "No videos match your search" : activeTab === "course" ? "No videos for your course yet" : "No must-watch videos yet"}
          description={query ? "Try a different keyword or clear the search." : activeTab === "course" ? "Only videos assigned to your active course appear here." : "Universal guidance videos will appear in this tab."}
          icon="smart_display"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((video) => {
            const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
            const thumbnail = getYouTubeThumbnailUrl(video.youtube_url);
            return (
              <article key={video.id} className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-sm">
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
                      <Icon name="smart_display" className="text-3xl" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-primary">
                      Video {String(video.display_order).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-semibold text-on-surface-variant">{formatDate(video.created_at)}</span>
                  </div>
                  <h3 className="text-base font-bold leading-tight text-on-surface line-clamp-2">{video.title}</h3>
                  <p className="text-xs leading-5 text-on-surface-variant line-clamp-2">{video.description ?? "Helpful video shared by admin."}</p>
                  <div className="flex items-center justify-between pt-1">
                    <a href={video.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110">
                      <Icon name="play_circle" className="text-[16px]" />
                      Watch
                    </a>
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
