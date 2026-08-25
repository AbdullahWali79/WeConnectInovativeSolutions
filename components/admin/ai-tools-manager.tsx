"use client";

import { useCallback, useEffect, useState } from "react";
import { createAdminAITool, deleteAITool, getAllAITools, reviewAITool, updateAIToolVideo } from "@/app/admin/ai-tools/actions";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { normalizeImageUrl } from "@/lib/image-url";
import type { AITool } from "@/lib/ai-tools";

const empty = { name: "", url: "", benefits: "", image_url: "", youtube_url: "" };

export function AIToolsManager() {
  const [rows, setRows] = useState<AITool[]>([]);
  const [form, setForm] = useState(empty);
  const [studentFilter, setStudentFilter] = useState("pending");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    try { setRows(await getAllAITools() as AITool[]); }
    catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Could not load AI tools." }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const result = await createAdminAITool(form); setSaving(false);
    if (!result.ok) return setToast({ type: "error", message: result.error });
    setForm(empty); setToast({ type: "success", message: "AI tool published and added to the Admin Published Tools list." }); await load();
  }
  async function review(id: string, status: "approved" | "rejected") {
    const note = window.prompt(status === "rejected" ? "Reason for rejection (shown to student):" : "Optional note for student:") ?? "";
    const result = await reviewAITool(id, status, note);
    if (!result.ok) return setToast({ type: "error", message: result.error });
    setToast({ type: "success", message: `Student tool ${status}.` }); await load();
  }
  async function editVideo(row: AITool) {
    const value = window.prompt("YouTube learning video URL (leave empty to remove):", row.youtube_url ?? "");
    if (value === null) return;
    const result = await updateAIToolVideo(row.id, value);
    if (!result.ok) return setToast({ type: "error", message: result.error });
    setToast({ type: "success", message: "Learning video updated." }); await load();
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this AI tool permanently?")) return;
    const result = await deleteAITool(id);
    if (!result.ok) return setToast({ type: "error", message: result.error });
    await load();
  }

  const adminTools = rows.filter((row) => row.submitter_role === "admin");
  const studentTools = rows.filter((row) => row.submitter_role !== "admin");
  const shownStudents = studentFilter === "all" ? studentTools : studentTools.filter((row) => row.status === studentFilter);

  return <div className="space-y-8">
    <Toast toast={toast} onClear={() => setToast(null)} />
    <PageHeader eyebrow="Research directory" title="AI Tools" description="Publish admin research and review student suggestions in separate lists." />

    <form onSubmit={add} className="wc-card grid gap-4 p-5 md:grid-cols-2">
      <h2 className="text-xl font-black md:col-span-2">Add and publish tool</h2>
      <input required className="wc-input" placeholder="Tool name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="url" className="wc-input" placeholder="Official URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      <textarea required minLength={10} className="wc-input min-h-24 md:col-span-2" placeholder="Benefits for students" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
      <input required type="url" className="wc-input md:col-span-2" placeholder="Public image or Google Drive URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
      <input type="url" className="wc-input md:col-span-2" placeholder="YouTube learning video URL (optional)" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
      <button disabled={saving} className="wc-primary-btn md:w-fit"><Icon name="publish" />{saving ? "Publishing..." : "Publish tool"}</button>
    </form>

    <ToolSection title="Admin Published Tools" subtitle="Tools added directly by administrators." rows={adminTools} empty="No admin tools published yet." onReview={review} onEditVideo={editVideo} onDelete={remove} />

    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-2xl font-black">Student Submissions</h2><p className="mt-1 text-sm text-on-surface-variant">Student suggestions requiring admin review.</p></div>
        <select className="wc-input w-auto" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select>
      </div>
      <ToolCards rows={shownStudents} empty={`No ${studentFilter} student submissions.`} onReview={review} onEditVideo={editVideo} onDelete={remove} />
    </section>
  </div>;
}

function ToolSection({ title, subtitle, rows, empty, onReview, onEditVideo, onDelete }: { title: string; subtitle: string; rows: AITool[]; empty: string; onReview: (id: string, status: "approved" | "rejected") => Promise<void>; onEditVideo: (row: AITool) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  return <section><div className="mb-4"><h2 className="text-2xl font-black">{title} ({rows.length})</h2><p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p></div><ToolCards rows={rows} empty={empty} onReview={onReview} onEditVideo={onEditVideo} onDelete={onDelete} /></section>;
}

function ToolCards({ rows, empty, onReview, onEditVideo, onDelete }: { rows: AITool[]; empty: string; onReview: (id: string, status: "approved" | "rejected") => Promise<void>; onEditVideo: (row: AITool) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  if (!rows.length) return <div className="wc-card p-10 text-center text-on-surface-variant">{empty}</div>;
  return <div className="grid gap-4">{rows.map((row) => <article key={row.id} className="wc-card grid overflow-hidden md:grid-cols-[180px_1fr]">
    <div className="relative min-h-40 bg-surface-container"><img src={normalizeImageUrl(row.image_url) ?? row.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /></div>
    <div className="p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-xl font-black">{row.name}</h3><p className="text-xs text-on-surface-variant">{row.submitter_role === "admin" ? "Published by Admin" : `Submitted by ${row.submitter_email ?? "Student"}`}</p></div><span className="text-xs font-black uppercase">{row.status}</span></div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-on-surface-variant">{row.benefits}</p><a className="mt-2 inline-block text-sm font-bold text-secondary" href={row.url} target="_blank" rel="noreferrer">Open tool ↗</a>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void onEditVideo(row)} className="wc-secondary-btn text-sm"><Icon name="play_circle" />{row.youtube_url ? "Edit video" : "Add video"}</button>{row.submitter_role !== "admin" && row.status !== "approved" && <button onClick={() => void onReview(row.id, "approved")} className="wc-primary-btn text-sm"><Icon name="check" />Approve</button>}{row.submitter_role !== "admin" && row.status !== "rejected" && <button onClick={() => void onReview(row.id, "rejected")} className="wc-secondary-btn text-sm"><Icon name="close" />Reject</button>}<button onClick={() => void onDelete(row.id)} className="wc-secondary-btn text-sm text-error"><Icon name="delete" />Delete</button></div>
    </div>
  </article>)}</div>;
}
