"use client";

import { useCallback, useEffect, useState } from "react";
import { createAdminAITool, deleteAITool, getAllAITools, reviewAITool, updateAIToolVideo } from "@/app/admin/ai-tools/actions";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import type { AITool } from "@/lib/ai-tools";
import { AIToolsGrid } from "@/components/ai-tools/ai-tools-grid";

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

    <CollapsibleToolSection title="Admin Published Tools" subtitle="Tools added directly by administrators." rows={adminTools} defaultOpen renderActions={(row) => <><button onClick={() => void editVideo(row)} className="wc-secondary-btn text-sm"><Icon name="play_circle" />{row.youtube_url ? "Edit video" : "Add video"}</button><button onClick={() => void remove(row.id)} className="wc-secondary-btn text-sm text-error"><Icon name="delete" />Delete</button></>} />

    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-2xl font-black">Student Submissions</h2><p className="mt-1 text-sm text-on-surface-variant">Student suggestions requiring admin review.</p></div>
        <select className="wc-input w-auto" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select>
      </div>
      <CollapsibleToolSection title={`${studentFilter === "all" ? "All" : studentFilter[0].toUpperCase() + studentFilter.slice(1)} Student Tools`} subtitle="Click a card to view complete details and review it." rows={shownStudents} defaultOpen renderActions={(row) => <><button onClick={() => void editVideo(row)} className="wc-secondary-btn text-sm"><Icon name="play_circle" />{row.youtube_url ? "Edit video" : "Add video"}</button>{row.status !== "approved" && <button onClick={() => void review(row.id, "approved")} className="wc-primary-btn text-sm"><Icon name="check" />Approve</button>}{row.status !== "rejected" && <button onClick={() => void review(row.id, "rejected")} className="wc-secondary-btn text-sm"><Icon name="close" />Reject</button>}<button onClick={() => void remove(row.id)} className="wc-secondary-btn text-sm text-error"><Icon name="delete" />Delete</button></>} />
    </section>
  </div>;
}

function CollapsibleToolSection({ title, subtitle, rows, defaultOpen = false, renderActions }: { title: string; subtitle: string; rows: AITool[]; defaultOpen?: boolean; renderActions: (row: AITool) => React.ReactNode }) {
  return <details className="group wc-card overflow-hidden" open={defaultOpen}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><h3 className="text-xl font-black">{title} ({rows.length})</h3><p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p></div><Icon name="expand_more" className="text-2xl transition group-open:rotate-180" /></summary><div className="border-t border-outline-variant p-4 sm:p-5"><AIToolsGrid tools={rows} showStatus renderActions={renderActions} /></div></details>;
}
