"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { Icon } from "@/components/icon";
import { PUBLIC_CLIENT_HUNT_SERVICES, publicClientHuntServiceLabel, publicClientHuntSlug } from "@/lib/public-client-hunt";
import type { PublicClientHuntForm, PublicClientHuntKeyword, PublicClientHuntSubmission } from "@/lib/supabase/types";
import { addPublicClientHuntKeyword, deletePublicClientHuntForm, deletePublicClientHuntKeyword, deletePublicClientHuntSubmission, savePublicClientHuntForm, togglePublicClientHuntKeyword } from "@/app/admin/forms/client-hunt/actions";

export function PublicClientHuntFormsManager({ forms, keywords, submissions, setupError }: { forms: PublicClientHuntForm[]; keywords: PublicClientHuntKeyword[]; submissions: PublicClientHuntSubmission[]; setupError: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDraft, setFormDraft] = useState({ title: "External Client Hunt Form", slug: "external-client-hunt", description: "", isActive: true });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [keywordFilter, setKeywordFilter] = useState("all");
  const currentFormId = selectedFormId || forms[0]?.id || "";
  const currentKeywords = keywords.filter((item) => item.form_id === currentFormId);
  const filtered = useMemo(() => submissions.filter((item) => (!currentFormId || item.form_id === currentFormId) && (!nameFilter.trim() || item.submitter_name.toLowerCase().includes(nameFilter.toLowerCase().trim())) && (serviceFilter === "all" || item.service_required === serviceFilter) && (keywordFilter === "all" || item.keyword_snapshot === keywordFilter)), [currentFormId, keywordFilter, nameFilter, serviceFilter, submissions]);
  const run = (action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) => startTransition(async () => { const result = await action(); if (!result.success) setToast({ type: "error", message: result.error || "Action failed." }); else { setToast({ type: "success", message: successMessage }); router.refresh(); } });
  const shareUrl = (slug: string) => `${window.location.origin}/client-hunt-form/${slug}`;

  function edit(form: PublicClientHuntForm) { setEditingId(form.id); setSelectedFormId(form.id); setFormDraft({ title: form.title, slug: form.slug, description: form.description ?? "", isActive: form.is_active }); }
  function resetDraft() { setEditingId(null); setFormDraft({ title: "External Client Hunt Form", slug: "external-client-hunt", description: "", isActive: true }); }

  return <>
    <Toast toast={toast} onClear={() => setToast(null)} />
    <PageHeader eyebrow="Shareable tools" title="Forms · Client Hunt" description="Create public links for non-registered students, control search keywords, and review every submitted client lead." />
    {setupError ? <div className="mb-5 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm font-bold text-orange-800">Database migration is required: {setupError}</div> : null}
    <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
      <aside className="space-y-5">
        <section className="wc-card p-5"><h2 className="text-lg font-black">{editingId ? "Edit form" : "Create shareable form"}</h2><div className="mt-4 space-y-4">
          <label className="block"><span className="wc-label">Title</span><input className="wc-input mt-2" value={formDraft.title} onChange={(e) => setFormDraft((v) => ({ ...v, title: e.target.value, slug: editingId ? v.slug : publicClientHuntSlug(e.target.value) }))} /></label>
          <label className="block"><span className="wc-label">Share link slug</span><input className="wc-input mt-2" value={formDraft.slug} onChange={(e) => setFormDraft((v) => ({ ...v, slug: publicClientHuntSlug(e.target.value) }))} /></label>
          <label className="block"><span className="wc-label">Instructions</span><textarea className="wc-input mt-2 min-h-24" value={formDraft.description} onChange={(e) => setFormDraft((v) => ({ ...v, description: e.target.value }))} /></label>
          <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={formDraft.isActive} onChange={(e) => setFormDraft((v) => ({ ...v, isActive: e.target.checked }))} /> Accept submissions</label>
          <div className="flex gap-2"><button disabled={pending} className="wc-primary-btn flex-1" onClick={() => run(() => savePublicClientHuntForm({ id: editingId ?? undefined, ...formDraft }), editingId ? "Form updated." : "Form created.")}>Save Form</button>{editingId ? <button className="wc-secondary-btn" onClick={resetDraft}>Cancel</button> : null}</div>
        </div></section>
        <section className="wc-card p-5"><h2 className="text-lg font-black">Forms</h2><div className="mt-3 space-y-3">{forms.map((form) => <div key={form.id} className={`rounded-xl border p-3 ${currentFormId === form.id ? "border-primary bg-primary/5" : "border-outline-variant"}`}><button className="w-full text-left" onClick={() => setSelectedFormId(form.id)}><span className="font-black">{form.title}</span><span className={`ml-2 text-xs ${form.is_active ? "text-emerald-700" : "text-red-700"}`}>{form.is_active ? "Active" : "Closed"}</span></button><div className="mt-3 flex flex-wrap gap-2"><button className="text-xs font-bold text-primary" onClick={() => edit(form)}>Edit</button><button className="text-xs font-bold text-secondary" onClick={() => navigator.clipboard.writeText(shareUrl(form.slug)).then(() => setToast({ type: "success", message: "Share link copied." }))}>Copy link</button><a className="text-xs font-bold text-primary" href={`/client-hunt-form/${form.slug}`} target="_blank">Open</a><button className="text-xs font-bold text-red-700" onClick={() => confirm("Delete this form and all its submissions?") && run(() => deletePublicClientHuntForm(form.id), "Form deleted.")}>Delete</button></div></div>)}</div></section>
      </aside>
      <div className="space-y-6">
        <section className="wc-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Keywords</h2><p className="text-sm text-on-surface-variant">These options appear at the top of the shared form.</p></div><div className="flex gap-2"><input className="wc-input" value={keywordDraft} onChange={(e) => setKeywordDraft(e.target.value)} placeholder="e.g. dentist in Lahore" /><button disabled={!currentFormId || pending} className="wc-primary-btn" onClick={() => run(async () => { const result = await addPublicClientHuntKeyword(currentFormId, keywordDraft); if (result.success) setKeywordDraft(""); return result; }, "Keyword added.")}>Add</button></div></div><div className="mt-4 flex flex-wrap gap-2">{currentKeywords.map((keyword) => <span key={keyword.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold ${keyword.is_active ? "border-primary/20 bg-primary/5" : "opacity-50"}`}>{keyword.keyword}<button title={keyword.is_active ? "Disable" : "Enable"} onClick={() => run(() => togglePublicClientHuntKeyword(keyword.id, !keyword.is_active), "Keyword updated.")}><Icon name={keyword.is_active ? "visibility" : "visibility_off"} className="text-base" /></button><button title="Delete" className="text-red-700" onClick={() => run(() => deletePublicClientHuntKeyword(keyword.id), "Keyword deleted.")}><Icon name="close" className="text-base" /></button></span>)}</div></section>
        <section className="wc-card overflow-hidden"><div className="border-b border-outline-variant p-5"><h2 className="text-xl font-black">Guest submissions</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><input className="wc-input" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Filter by student name" /><select className="wc-input" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}><option value="all">All services</option>{PUBLIC_CLIENT_HUNT_SERVICES.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}</select><select className="wc-input" value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value)}><option value="all">All keywords</option>{currentKeywords.map((keyword) => <option key={keyword.id} value={keyword.keyword}>{keyword.keyword}</option>)}</select></div><p className="mt-3 text-sm font-bold text-on-surface-variant">Showing {filtered.length} of {submissions.filter((s) => !currentFormId || s.form_id === currentFormId).length}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-surface-container-low text-xs uppercase"><tr><th className="p-4">Student</th><th className="p-4">Client</th><th className="p-4">Website</th><th className="p-4">Service</th><th className="p-4">Keyword</th><th className="p-4">Submitted</th><th className="p-4"></th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-outline-variant"><td className="p-4"><strong>{row.submitter_name}</strong><div className="text-xs text-on-surface-variant">{row.submitter_phone}</div></td><td className="p-4">{row.client_name || "—"}</td><td className="p-4"><a className="font-bold text-primary underline" href={row.website_url} target="_blank" rel="noreferrer">Open website</a>{row.notes ? <div className="mt-1 max-w-xs text-xs text-on-surface-variant">{row.notes}</div> : null}</td><td className="p-4">{publicClientHuntServiceLabel(row.service_required)}</td><td className="p-4">{row.keyword_snapshot}</td><td className="p-4">{new Date(row.submitted_at).toLocaleString()}</td><td className="p-4"><button className="text-red-700" title="Delete" onClick={() => confirm("Delete this submission?") && run(() => deletePublicClientHuntSubmission(row.id), "Submission deleted.")}><Icon name="delete" /></button></td></tr>)}</tbody></table>{filtered.length === 0 ? <div className="p-10 text-center text-on-surface-variant">No submissions match these filters.</div> : null}</div>
        </section>
      </div>
    </div>
  </>;
}
