"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";\nimport { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, HelpingVideo } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/youtube";

const defaultForm = {
  title: "",
  youtube_url: "",
  description: "",
  audience: "must_watch",
  course_ids: [] as string[],
  status: "active",
  display_order: "0",
};

type HelpingVideoRow = Pick<HelpingVideo, "id" | "title" | "youtube_url" | "description" | "status" | "display_order" | "created_at" | "course_id" | "is_must_watch"> & { course_ids: string[] };

export function HelpingVideosManager({ courses = [] }: { courses?: Course[] }) {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<HelpingVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const [videosResult, assignmentsResult] = await Promise.all([
      supabase
        .from("helping_videos")
        .select("id,title,youtube_url,description,status,display_order,created_at,course_id,is_must_watch")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("helping_video_courses").select("video_id,course_id"),
    ]);

    if (videosResult.error) setToast({ type: "error", message: videosResult.error.message });
    else if (assignmentsResult.error) setToast({ type: "error", message: assignmentsResult.error.message });
    const assignmentsByVideo = new Map<string, string[]>();
    for (const assignment of assignmentsResult.data ?? []) {
      const courseAssignments = assignmentsByVideo.get(assignment.video_id) ?? [];
      courseAssignments.push(assignment.course_id);
      assignmentsByVideo.set(assignment.video_id, courseAssignments);
    }
    setRows((videosResult.data ?? []).map((row) => ({
      ...row,
      course_ids: assignmentsByVideo.get(row.id) ?? (row.course_id ? [row.course_id] : []),
    })) as HelpingVideoRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const text = `${row.title} ${row.description ?? ""} ${row.youtube_url}`.toLowerCase();
        const queryMatch = text.includes(query.trim().toLowerCase());
        const statusMatch = statusFilter === "all" || row.status === statusFilter;
        const audienceMatch = audienceFilter === "all" || (audienceFilter === "must_watch" ? row.is_must_watch : row.course_ids.includes(audienceFilter));
        return queryMatch && statusMatch && audienceMatch;
      }),
    [rows, query, statusFilter, audienceFilter],
  );

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(false);
  }

  function startEdit(row: HelpingVideoRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      youtube_url: row.youtube_url,
      description: row.description ?? "",
      audience: row.is_must_watch ? "must_watch" : "course",
      course_ids: row.course_ids,
      status: row.status,
      display_order: String(row.display_order ?? 0),
    });
  }

  async function saveRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() || !form.youtube_url.trim()) {
      setToast({ type: "error", message: "Title and YouTube link are required." });
      return;
    }
    if (form.audience === "course" && form.course_ids.length === 0) {
      setToast({ type: "error", message: "Please select at least one course for this video." });
      return;
    }

    const embedUrl = getYouTubeEmbedUrl(form.youtube_url);
    if (!embedUrl) {
      setToast({ type: "error", message: "Please add a valid YouTube watch, short, embed, or youtu.be link." });
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      youtube_url: form.youtube_url.trim(),
      description: form.description.trim() || null,
      is_must_watch: form.audience === "must_watch",
      course_id: null,
      status: form.status,
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    const request = editingId
      ? supabase.from("helping_videos").update(payload).eq("id", editingId).select("id").single()
      : supabase.from("helping_videos").insert(payload).select("id").single();
    const { data: savedVideo, error } = await request;
    if (!error && savedVideo) {
      const { error: clearError } = await supabase.from("helping_video_courses").delete().eq("video_id", savedVideo.id);
      if (clearError) {
        setSaving(false);
        setToast({ type: "error", message: clearError.message });
        return;
      }
      if (form.audience === "course") {
        const { error: assignmentError } = await supabase.from("helping_video_courses").insert(
          form.course_ids.map((courseId) => ({ video_id: savedVideo.id, course_id: courseId })),
        );
        if (assignmentError) {
          setSaving(false);
          setToast({ type: "error", message: assignmentError.message });
          return;
        }
      }
    }
    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: editingId ? "Helping video updated." : "Helping video created." });
    resetForm();
    await loadRows();
  }

  async function deleteRow(id: string) {
    if (!window.confirm("Delete this helping video?")) return;
    const { error } = await supabase.from("helping_videos").delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Helping video deleted." });
    await loadRows();
  }

  if (loading) return <LoadingState label="Loading helping videos..." />;

  const previewUrl = getYouTubeEmbedUrl(form.youtube_url);
  const previewThumb = getYouTubeThumbnailUrl(form.youtube_url);

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Student Resources"
        title="Helping Videos"
        description="Add useful YouTube tutorials and walkthroughs for every student inside the portal."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/student/helping-videos" className="wc-secondary-btn text-sm">
              <Icon name="visibility" /> View Student Page
            </Link>
            <button type="button" onClick={() => setShowModal(true)} className="wc-primary-btn text-sm">
              <Icon name="add" /> Add Video
            </button>
          </div>
        }
      />

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={resetForm}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl pointer-events-auto"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-on-surface">{editingId ? "Edit Helping Video" : "Add Helping Video"}</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Add a clear title and a valid YouTube link. Students will see approved videos in their portal.
                    </p>
                  </div>
                  <button type="button" onClick={resetForm} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Icon name="close" />
                  </button>
                </div>

                <form onSubmit={saveRow} className="space-y-4">
                  <label className="block">
                    <span className="wc-label">Title</span>
                    <input className="wc-input mt-1.5" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="How to submit a task" required />
                  </label>

                  <label className="block">
                    <span className="wc-label">YouTube Link</span>
                    <input className="wc-input mt-1.5" value={form.youtube_url} onChange={(event) => setForm((current) => ({ ...current, youtube_url: event.target.value }))} placeholder="https://www.youtube.com/watch?v=..." required />
                  </label>

                  <label className="block">
                    <span className="wc-label">Description</span>
                    <textarea className="wc-input mt-1.5 min-h-24" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what the student will learn" />
                  </label>

                  <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Who should see this video?</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setForm((current) => ({ ...current, audience: "must_watch" }))} className={ounded-lg border px-3 py-2 text-sm font-bold transition }>
                        Must Watch — Everyone
                      </button>
                      <button type="button" onClick={() => setForm((current) => ({ ...current, audience: "course" }))} className={ounded-lg border px-3 py-2 text-sm font-bold transition }>
                        Course Specific
                      </button>
                    </div>

                    {form.audience === "course" ? (
                      <div className="mt-3 space-y-1 rounded-lg border border-outline-variant/50 bg-surface p-3 max-h-[200px] overflow-y-auto">
                        <p className="mb-2 text-xs font-bold text-on-surface-variant">Select all courses that should receive this video:</p>
                        {courses.map((course) => (
                          <label key={course.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container">
                            <input type="checkbox" checked={form.course_ids.includes(course.id)} onChange={(event) => setForm((current) => ({ ...current, course_ids: event.target.checked ? [...current.course_ids, course.id] : current.course_ids.filter((id) => id !== course.id) }))} className="rounded border-outline-variant text-primary focus:ring-primary" />
                            <span className="text-sm font-medium text-on-surface">{course.title}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-on-surface-variant">This video will appear in every student's Must Watch tab.</p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="wc-label">Status</span>
                      <select className="wc-input mt-1.5" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="wc-label">Display Order</span>
                      <input className="wc-input mt-1.5" type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
                    </label>
                  </div>

                  {previewUrl ? (
                    <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container shadow-sm">
                      <div className="aspect-video bg-black">
                        <iframe
                          title="YouTube preview"
                          src={previewUrl}
                          className="h-full w-full"
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3 text-xs text-on-surface-variant bg-surface">
                        <span className="font-semibold uppercase tracking-wider">Live preview</span>
                        <a href={form.youtube_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1">
                          Open link <Icon name="open_in_new" className="text-[14px]" />
                        </a>
                      </div>
                    </div>
                  ) : previewThumb ? (
                    <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container shadow-sm">
                      <img src={previewThumb} alt="YouTube preview" className="aspect-video w-full object-cover" />
                      <div className="p-3 text-xs text-on-surface-variant bg-surface">Paste a valid YouTube link to see the preview here.</div>
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/50 mt-6">
                    <button type="button" onClick={resetForm} className="wc-secondary-btn px-6 font-bold">
                      Cancel
                    </button>
                    <button disabled={saving} className="wc-primary-btn px-6 font-bold">
                      {saving ? "Saving..." : editingId ? "Update Video" : "Create Video"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm task-analytics-print-hidden">
        <div className="flex flex-col gap-3 border-b border-outline-variant/50 bg-surface-container-low p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
            <input className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-9 pr-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Search title or link..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="flex flex-1 gap-3 sm:max-w-md">
            <select className="wc-input py-2 text-sm w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="wc-input py-2 text-sm w-full" value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
              <option value="all">All Audiences</option>
              <option value="must_watch">Must Watch</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No helping videos found" description="Create a helpful YouTube video for students to view." icon="smart_display" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-separate border-spacing-0">
              <thead className="bg-surface-container-low text-[11px] font-black uppercase tracking-wider text-primary">
                <tr>
                  <th className="px-5 py-3 border-b border-outline-variant/50">Title</th>
                  <th className="px-5 py-3 border-b border-outline-variant/50">Link</th>
                  <th className="px-5 py-3 border-b border-outline-variant/50">Status</th>
                  <th className="px-5 py-3 border-b border-outline-variant/50">Audience</th>
                  <th className="px-5 py-3 border-b border-outline-variant/50">Order</th>
                  <th className="px-5 py-3 border-b border-outline-variant/50">Created</th>
                  <th className="px-5 py-3 border-b border-outline-variant/50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-container/30">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-on-surface">{row.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant line-clamp-2 max-w-xs">{row.description ?? "No description"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <a href={row.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary">
                        <Icon name="play_arrow" className="text-[16px]" /> Open
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <span className={inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider }>{row.status}</span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-on-surface-variant">
                      {row.is_must_watch ? (
                        <span className="inline-flex items-center gap-1 text-primary"><Icon name="star" className="text-[14px]" /> Must Watch</span>
                      ) : (
                        <span className="line-clamp-2 max-w-[150px]">{row.course_ids.map((id) => courses.find((course) => course.id === id)?.title).filter(Boolean).join(", ") || "None"}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-on-surface-variant">{row.display_order}</td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10" onClick={() => startEdit(row)} title="Edit">
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-error transition-colors hover:bg-error/10" onClick={() => deleteRow(row.id)} title="Delete">
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
);
}

