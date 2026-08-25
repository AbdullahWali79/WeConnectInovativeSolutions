"use client";
import { useCallback, useEffect, useState } from "react";
import { getMyAITools, submitAITool } from "@/app/student/ai-tools/actions";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { normalizeImageUrl } from "@/lib/image-url";
import type { AITool } from "@/lib/ai-tools";
import { AIToolsGrid } from "@/components/ai-tools/ai-tools-grid";

const empty = { name: "", url: "", benefits: "", image_url: "", youtube_url: "" };
export function AIToolsBoard() {
  const [form, setForm] = useState(empty); const [rows, setRows] = useState<AITool[]>([]); const [saving, setSaving] = useState(false); const [toast, setToast] = useState<ToastState>(null);
  const load = useCallback(async () => { try { setRows(await getMyAITools() as AITool[]); } catch (e) { setToast({ type: "error", message: e instanceof Error ? e.message : "Could not load submissions." }); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(e: React.FormEvent) { e.preventDefault(); setSaving(true); const result = await submitAITool(form); setSaving(false); if (!result.ok) return setToast({ type: "error", message: result.error }); setForm(empty); setToast({ type: "success", message: "AI tool sent to admin for approval." }); await load(); }
  const preview = normalizeImageUrl(form.image_url);
  return <div className="space-y-6"><Toast toast={toast} onClear={() => setToast(null)} /><PageHeader eyebrow="Community research" title="AI Tools" description="Share a useful AI tool. It will be published after admin verification." />
    <form onSubmit={submit} className="wc-card grid gap-4 p-5 md:grid-cols-2"><label className="space-y-1"><span className="wc-label">Tool name *</span><input required maxLength={120} className="wc-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Perplexity AI" /></label><label className="space-y-1"><span className="wc-label">Official tool URL *</span><input required type="url" className="wc-input" value={form.url} onChange={e => setForm({...form,url:e.target.value})} placeholder="https://..." /></label>
    <label className="space-y-1 md:col-span-2"><span className="wc-label">Benefits *</span><textarea required minLength={10} maxLength={2000} className="wc-input min-h-28" value={form.benefits} onChange={e => setForm({...form,benefits:e.target.value})} placeholder="Explain what this tool does and how students can benefit from it." /></label>
    <label className="space-y-1 md:col-span-2"><span className="wc-label">Public Google Drive image URL *</span><input required type="url" className="wc-input" value={form.image_url} onChange={e => setForm({...form,image_url:e.target.value})} placeholder="https://drive.google.com/file/d/.../view" /><span className="block text-xs text-on-surface-variant">Set Drive access to Anyone with the link — Viewer.</span></label>
    <label className="space-y-1 md:col-span-2"><span className="wc-label">YouTube learning video</span><input type="url" className="wc-input" value={form.youtube_url} onChange={e => setForm({...form,youtube_url:e.target.value})} placeholder="https://www.youtube.com/watch?v=..." /><span className="block text-xs text-on-surface-variant">Optional tutorial. It will only appear publicly after admin approval.</span></label>
    {preview && <div className="relative aspect-video max-w-md overflow-hidden rounded-xl bg-surface-container md:col-span-2"><img src={preview} alt="Tool preview" className="h-full w-full object-cover" /></div>}
    <button disabled={saving} className="wc-primary-btn md:col-span-2 md:w-fit"><Icon name="send" />{saving ? "Submitting..." : "Submit for approval"}</button></form>
    <details className="group wc-card overflow-hidden" open><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><h2 className="text-xl font-black">My Tool Submissions ({rows.length})</h2><p className="mt-1 text-sm text-on-surface-variant">Expand to search, filter videos, and view submission details.</p></div><Icon name="expand_more" className="text-2xl transition group-open:rotate-180" /></summary><div className="border-t border-outline-variant p-4 sm:p-5"><AIToolsGrid tools={rows} showStatus /></div></details>
  </div>;
}


