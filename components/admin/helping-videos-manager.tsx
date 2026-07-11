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

const defaultForm = {
  title: "",
  youtube_url: "",
  description: "",
  status: "active",
  display_order: "0",
};

type HelpingVideoRow = Pick<HelpingVideo, "id" | "title" | "youtube_url" | "description" | "status" | "display_order" | "created_at">;

export function HelpingVideosManager() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<HelpingVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("helping_videos")
      .select("id,title,youtube_url,description,status,display_order,created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) setToast({ type: "error", message: error.message });
    setRows((data ?? []) as HelpingVideoRow[]);
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
        return queryMatch && statusMatch;
      }),
    [rows, query, statusFilter],
  );

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  function startEdit(row: HelpingVideoRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      youtube_url: row.youtube_url,
      description: row.description ?? "",
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
      status: form.status,
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    const request = editingId ? supabase.from("helping_videos").update(payload).eq("id", editingId) : supabase.from("helping_videos").insert(payload);
    const { error } = await request;
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
        action={<Link href="/student/helping-videos" className="wc-secondary-btn text-sm"><Icon name="visibility" /> View Student Page</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={saveRow} className="wc-card space-y-4 p-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit Helping Video" : "Add Helping Video"}</h2>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">Add a clear title and a valid YouTube link. Students will see approved videos in their portal.</p>
          </div>

          <label className="block">
            <span className="wc-label">Title</span>
            <input className="wc-input mt-2" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="How to submit a task" required />
          </label>

          <label className="block">
            <span className="wc-label">YouTube Link</span>
            <input className="wc-input mt-2" value={form.youtube_url} onChange={(event) => setForm((current) => ({ ...current, youtube_url: event.target.value }))} placeholder="https://www.youtube.com/watch?v=..." required />
          </label>

          <label className="block">
            <span className="wc-label">Description</span>
            <textarea className="wc-input mt-2 min-h-24" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what the student will learn" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="wc-label">Status</span>
              <select className="wc-input mt-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="block">
              <span className="wc-label">Display Order</span>
              <input className="wc-input mt-2" type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
            </label>
          </div>

          {previewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
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
              <div className="flex items-center justify-between gap-3 p-3 text-xs text-on-surface-variant">
                <span>Live preview</span>
                <a href={form.youtube_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                  Open link
                </a>
              </div>
            </div>
          ) : previewThumb ? (
            <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewThumb} alt="YouTube preview" className="aspect-video w-full object-cover" />
              <div className="p-3 text-xs text-on-surface-variant">Paste a valid YouTube link to see the preview here.</div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button disabled={saving} className="wc-primary-btn flex-1">{saving ? "Saving..." : editingId ? "Update Video" : "Create Video"}</button>
            {editingId ? <button type="button" onClick={resetForm} className="wc-secondary-btn">Cancel</button> : null}
          </div>
        </form>

        <section className="wc-card overflow-hidden">
          <div className="grid gap-2 border-b border-outline-variant/50 bg-surface-container-low p-3 md:grid-cols-2">
            <input className="wc-input" placeholder="Search title or link" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No helping videos found" description="Create a helpful YouTube video for students to view." icon="smart_display" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">YouTube Link</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-on-surface">{row.title}</p>
                        <p className="text-xs text-on-surface-variant line-clamp-2">{row.description ?? "No description"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        <a href={row.youtube_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                          Open YouTube
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{row.display_order}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <a className="rounded-lg bg-surface-container p-2 text-primary" href={row.youtube_url} target="_blank" rel="noreferrer" title="Open">
                            <Icon name="open_in_new" />
                          </a>
                          <button className="rounded-lg bg-surface-container p-2 text-primary" onClick={() => startEdit(row)} title="Edit">
                            <Icon name="edit" />
                          </button>
                          <button className="rounded-lg bg-error-container p-2 text-error" onClick={() => deleteRow(row.id)} title="Delete">
                            <Icon name="delete" />
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
      </div>
    </>
  );
}
