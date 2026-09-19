"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { Icon } from "@/components/icon";
import type { PublicAIToolForm, PublicAIToolCategory, PublicAIToolSubmission } from "@/lib/supabase/types";
import { createAIToolCategory, createAIToolForm, deleteAIToolCategory, deleteAIToolForm, reviewAIToolSubmission, toggleAIToolCategory, updateAIToolForm } from "@/app/admin/forms/ai-tools/actions";

type Modal = "editor" | "forms" | null;

const normalizePhone = (value: string) => value.replace(/\D/g, "");

export function PublicAIToolFormsManager({ forms, categories, submissions }: { forms: PublicAIToolForm[]; categories: PublicAIToolCategory[]; submissions: PublicAIToolSubmission[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDraft, setFormDraft] = useState({ title: "AI Tools Submission Form", description: "", is_active: true, daily_target: 50 });
  const [categoryDraft, setCategoryDraft] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const currentFormId = selectedFormId || forms[0]?.id || "";
  const currentForm = forms.find((form) => form.id === currentFormId) ?? forms[0];
  const currentCategories = categories.filter((item) => item.form_id === currentFormId);
  
  const filtered = useMemo(() => {
    const search = nameFilter.toLowerCase().trim();
    const phoneSearch = normalizePhone(nameFilter);

    return submissions.filter((item) => {
      const matchesStudent = !search
        || item.submitter_name.toLowerCase().includes(search)
        || (phoneSearch.length > 0 && normalizePhone(item.submitter_phone).includes(phoneSearch));

      return (!currentFormId || item.form_id === currentFormId)
        && matchesStudent
        && (statusFilter === "all" || item.status === statusFilter)
        && (categoryFilter === "all" || item.category_snapshot === categoryFilter);
    });
  }, [currentFormId, categoryFilter, nameFilter, statusFilter, submissions]);
  
  const run = (action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string, done?: () => void) => startTransition(async () => { const result = await action(); if (!result.ok) setToast({ type: "error", message: result.error || "Action failed." }); else { setToast({ type: "success", message: successMessage }); done?.(); router.refresh(); } });
  const shareUrl = (slug: string) => `${window.location.origin}/forms/ai-tools/${slug}`;

  function createForm() { setEditingId(null); setFormDraft({ title: "AI Tools Submission Form", description: "", is_active: true, daily_target: 50 }); setModal("editor"); }
  function edit(form: PublicAIToolForm) { setEditingId(form.id); setSelectedFormId(form.id); setFormDraft({ title: form.title, description: form.description ?? "", is_active: form.is_active, daily_target: form.daily_target || 50 }); setModal("editor"); }
  function copyLink(form: PublicAIToolForm) { void navigator.clipboard.writeText(shareUrl(form.slug)).then(() => setToast({ type: "success", message: "Shareable link copied." })); }

  return <>
    <Toast toast={toast} onClear={() => setToast(null)} />
    <PageHeader eyebrow="Shareable tools" title="Forms · AI Tools" description="Create public links for non-registered students to submit AI tools, manage categories, and review submissions." action={<div className="flex flex-wrap gap-2"><button className="wc-primary-btn" onClick={createForm}><Icon name="add" /> Create Form</button><button className="wc-secondary-btn" onClick={() => setModal("forms")}><Icon name="dynamic_form" /> Manage Forms</button>{currentForm ? <><button className="wc-secondary-btn" onClick={() => copyLink(currentForm)}><Icon name="content_copy" /> Copy Shareable Link</button></> : null}</div>} />

    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
      <label className="min-w-[260px] flex-1"><span className="wc-label">Working form</span><select className="wc-input mt-2" value={currentFormId} onChange={(e) => { setSelectedFormId(e.target.value); setCategoryFilter("all"); }}>{forms.length ? forms.map((form) => <option key={form.id} value={form.id}>{form.title} · {form.is_active ? "Active" : "Closed"}</option>) : <option value="">Create a form first</option>}</select></label>
      {currentForm ? <div className="mt-5 flex flex-wrap gap-2"><a className="wc-secondary-btn" href={`/forms/ai-tools/${currentForm.slug}`} target="_blank" rel="noreferrer"><Icon name="open_in_new" /> Open Public Form</a><button className="wc-primary-btn" onClick={() => copyLink(currentForm)}><Icon name="share" /> Share Link</button></div> : null}
    </div>

    <div className="space-y-6">
      <section className="wc-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-black">Categories</h2><p className="text-sm text-on-surface-variant">These categories appear on the selected shared form.</p></div>
          <div className="flex min-w-[300px] flex-1 justify-end gap-2 sm:flex-none"><input className="wc-input max-w-sm" value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)} placeholder="e.g. Video Editing" /><button disabled={!currentFormId || pending} className="wc-primary-btn" onClick={() => run(async () => { const result = await createAIToolCategory(currentFormId, categoryDraft); if (result.ok) setCategoryDraft(""); return result; }, "Category added.")}>Add</button></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {currentCategories.map((cat) => <span key={cat.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold ${cat.is_active ? "border-primary/20 bg-primary/5" : "opacity-50"}`}>{cat.category}<button title={cat.is_active ? "Disable" : "Enable"} onClick={() => run(() => toggleAIToolCategory(cat.id, !cat.is_active), "Category updated.")}><Icon name={cat.is_active ? "visibility" : "visibility_off"} className="text-base" /></button><button title="Delete" className="text-red-700" onClick={() => run(() => deleteAIToolCategory(cat.id), "Category deleted.")}><Icon name="close" className="text-base" /></button></span>)}
        </div>
      </section>

      <section className="wc-card w-full overflow-hidden">
        <div className="border-b border-outline-variant p-5">
          <h2 className="text-xl font-black">Guest submissions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="wc-input" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Filter by student name or phone" />
            <select className="wc-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved / Published</option><option value="rejected">Rejected</option><option value="all">All</option></select>
            <select className="wc-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{currentCategories.map((cat) => <option key={cat.id} value={cat.category}>{cat.category}</option>)}</select>
          </div>
          <p className="mt-3 text-sm font-bold text-on-surface-variant">Showing {filtered.length} of {submissions.filter((s) => !currentFormId || s.form_id === currentFormId).length}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-surface-container-low text-xs uppercase"><tr><th className="p-4">Student</th><th className="p-4">Tool</th><th className="p-4">Benefits & Category</th><th className="p-4">Media</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead>
            <tbody>
              {filtered.map((row) => <tr key={row.id} className="border-t border-outline-variant align-top">
                <td className="p-4"><strong>{row.submitter_name}</strong><div className="text-xs text-on-surface-variant">{row.submitter_phone}</div><div className="mt-2 text-xs text-on-surface-variant">{new Date(row.submitted_at).toLocaleDateString()}</div></td>
                <td className="p-4"><div className="font-bold">{row.tool_name}</div><a className="text-xs font-bold text-primary underline" href={row.tool_url} target="_blank" rel="noreferrer">Visit Tool</a></td>
                <td className="p-4"><div className="mb-2 inline-block rounded-md bg-surface-container-low px-2 py-1 text-xs font-bold">{row.category_snapshot}</div><p className="text-xs text-on-surface-variant max-w-xs whitespace-pre-wrap">{row.benefits}</p></td>
                <td className="p-4"><div className="flex max-w-xs flex-col gap-2"><a href={row.image_url} target="_blank" className="font-bold text-secondary underline text-xs" rel="noreferrer">View Image</a>{row.youtube_url ? <a href={row.youtube_url} target="_blank" className="font-bold text-red-600 underline text-xs" rel="noreferrer">YouTube</a> : null}</div></td>
                <td className="p-4">
                  {row.status === "pending" && <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-1 text-xs font-bold">Pending</span>}
                  {row.status === "approved" && <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-1 text-xs font-bold">Published</span>}
                  {row.status === "rejected" && <span className="rounded-md bg-red-100 text-red-800 px-2 py-1 text-xs font-bold">Rejected</span>}
                </td>
                <td className="p-4">
                  {row.status === "pending" && <div className="flex flex-col gap-2">
                    <button disabled={pending} className="wc-primary-btn text-xs py-1.5 min-h-0" onClick={() => run(() => reviewAIToolSubmission(row.id, "publish"), "Tool published.")}><Icon name="publish" className="text-[16px]" /> Publish</button>
                    <button disabled={pending} className="wc-secondary-btn text-xs py-1.5 min-h-0 text-red-700" onClick={() => confirm("Reject this submission?") && run(() => reviewAIToolSubmission(row.id, "reject"), "Tool rejected.")}><Icon name="close" className="text-[16px]" /> Reject</button>
                  </div>}
                </td>
              </tr>)}
            </tbody>
          </table>
          {filtered.length === 0 ? <div className="p-10 text-center text-on-surface-variant">No submissions match these filters.</div> : null}
        </div>
      </section>
    </div>

    {modal ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-surface-container-lowest p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{modal === "editor" ? editingId ? "Edit shareable form" : "Create shareable form" : "Manage forms"}</h2><button className="rounded-full p-2 hover:bg-surface-container" onClick={() => setModal(null)}><Icon name="close" /></button></div>
        {modal === "editor" ? <div className="mt-5 space-y-4">
          <label className="block"><span className="wc-label">Title</span><input className="wc-input mt-2" value={formDraft.title} onChange={(e) => setFormDraft((v) => ({ ...v, title: e.target.value }))} /></label>
          <label className="block"><span className="wc-label">Student Target (Total)</span><input className="wc-input mt-2" type="number" min={1} max={1000} value={formDraft.daily_target} onChange={(e) => setFormDraft((v) => ({ ...v, daily_target: Number(e.target.value) }))} /></label>
          <label className="block"><span className="wc-label">Instructions</span><textarea className="wc-input mt-2 min-h-28" value={formDraft.description} onChange={(e) => setFormDraft((v) => ({ ...v, description: e.target.value }))} /></label>
          <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={formDraft.is_active} onChange={(e) => setFormDraft((v) => ({ ...v, is_active: e.target.checked }))} /> Accept submissions</label>
          <div className="flex justify-end gap-2">
            <button className="wc-secondary-btn" onClick={() => setModal(null)}>Cancel</button>
            <button disabled={pending} className="wc-primary-btn" onClick={() => run(() => editingId ? updateAIToolForm(editingId, formDraft) : createAIToolForm(formDraft.title).then(r => { if (!r.ok) return r; return updateAIToolForm(r.data.id, formDraft); }), editingId ? "Form updated." : "Form created.", () => setModal(null))}>Save Form</button>
          </div>
        </div> : <div className="mt-5 space-y-3">
          {forms.map((form) => <div key={form.id} className={`rounded-2xl border p-4 ${currentFormId === form.id ? "border-primary bg-primary/5" : "border-outline-variant"}`}>
            <button className="w-full text-left" onClick={() => { setSelectedFormId(form.id); setModal(null); }}>
              <span className="font-black">{form.title}</span><span className={`ml-2 text-xs ${form.is_active ? "text-emerald-700" : "text-red-700"}`}>{form.is_active ? "Active" : "Closed"}</span>
              <div className="mt-1 text-xs text-on-surface-variant">Target submissions: {form.daily_target} · /forms/ai-tools/{form.slug}</div>
            </button>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="text-xs font-bold text-primary" onClick={() => edit(form)}>Edit</button>
              <button className="text-xs font-bold text-secondary" onClick={() => copyLink(form)}>Copy shareable link</button>
              <a className="text-xs font-bold text-primary" href={`/forms/ai-tools/${form.slug}`} target="_blank" rel="noreferrer">Open form</a>
              <button className="text-xs font-bold text-red-700" onClick={() => confirm("Delete this form and all its submissions?") && run(() => deleteAIToolForm(form.id), "Form deleted.")}>Delete</button>
            </div>
          </div>)}
          {forms.length === 0 ? <p className="py-8 text-center text-on-surface-variant">No forms created yet.</p> : null}
        </div>}
      </div>
    </div> : null}
  </>;
}
