"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { StudentProject } from "@/lib/supabase/types";

const emptyForm = { title: "", category: "", short_description: "", full_description: "", github_url: "", live_url: "", technologies: "", image_urls: [""] };

export function StudentProjectsBoard() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<StudentProject[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("student_projects").select("*").order("created_at", { ascending: false });
    if (error) setToast({ type: "error", message: error.message });
    setRows((data ?? []) as StudentProject[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const imageUrls = form.image_urls.map((url) => url.trim()).filter(Boolean);
    if (!imageUrls.length) return setToast({ type: "error", message: "Add at least one public Google Drive image URL." });
    if (imageUrls.some((url) => !url.includes("drive.google.com"))) return setToast({ type: "error", message: "Every image must use a public Google Drive URL." });
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("student_projects").insert({
      student_id: user?.id,
      title: form.title.trim(),
      category: form.category.trim(),
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      github_url: form.github_url.trim(),
      live_url: form.live_url.trim() || null,
      technologies: form.technologies.split(",").map((item) => item.trim()).filter(Boolean),
      image_urls: imageUrls,
    });
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setForm(emptyForm);
    setToast({ type: "success", message: "Project submitted for admin review." });
    await load();
  }

  if (loading) return <LoadingState label="Loading projects..." />;

  return <div className="space-y-6">
    <PageHeader eyebrow="Portfolio" title="My Projects" description="Submit completed projects with GitHub, live demo, and public Google Drive screenshots." />
    <form onSubmit={submit} className="wc-card grid gap-4 p-5 md:grid-cols-2">
      <input className="wc-input" required placeholder="Project title" value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} />
      <input className="wc-input" required placeholder="Category (Web App, Mobile App...)" value={form.category} onChange={(e) => setForm({...form,category:e.target.value})} />
      <input className="wc-input md:col-span-2" required type="url" placeholder="GitHub project URL" value={form.github_url} onChange={(e) => setForm({...form,github_url:e.target.value})} />
      <input className="wc-input md:col-span-2" type="url" placeholder="Live demo URL (optional)" value={form.live_url} onChange={(e) => setForm({...form,live_url:e.target.value})} />
      <input className="wc-input md:col-span-2" placeholder="Technologies, comma separated" value={form.technologies} onChange={(e) => setForm({...form,technologies:e.target.value})} />
      <input className="wc-input md:col-span-2" required placeholder="Short description" value={form.short_description} onChange={(e) => setForm({...form,short_description:e.target.value})} />
      <textarea className="wc-input min-h-28 md:col-span-2" placeholder="Full project description" value={form.full_description} onChange={(e) => setForm({...form,full_description:e.target.value})} />
      <div className="md:col-span-2 rounded-xl bg-surface-container-low p-4">
        <p className="wc-label">Google Drive screenshots</p>
        <p className="mt-1 text-xs text-on-surface-variant">Set every image to “Anyone with the link”. Add as many image URLs as needed.</p>
        <div className="mt-3 grid gap-3">
          {form.image_urls.map((url,index) => <div key={index} className="flex gap-2"><input className="wc-input flex-1" required type="url" placeholder={"Public Google Drive image URL " + (index+1)} value={url} onChange={(e)=>setForm({...form,image_urls:form.image_urls.map((item,i)=>i===index?e.target.value:item)})}/>{form.image_urls.length>1?<button type="button" className="wc-secondary-btn" onClick={()=>setForm({...form,image_urls:form.image_urls.filter((_,i)=>i!==index)})}><Icon name="delete"/></button>:null}</div>)}
        </div>
        <button type="button" className="wc-secondary-btn mt-3" onClick={()=>setForm({...form,image_urls:[...form.image_urls,""]})}><Icon name="add"/> Add Image URL</button>
      </div>
      <button disabled={saving} className="wc-primary-btn md:col-span-2"><Icon name="send"/> {saving ? "Submitting..." : "Submit Project"}</button>
    </form>
    <section className="wc-card overflow-hidden"><div className="border-b border-outline-variant p-4"><h2 className="text-lg font-black">Submission history</h2></div><div className="divide-y divide-outline-variant">{rows.length?rows.map(row=><article key={row.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><h3 className="font-black">{row.title}</h3><p className="text-sm text-on-surface-variant">{row.category} · {row.image_urls.length} images</p>{row.admin_feedback?<p className="mt-2 text-sm">{row.admin_feedback}</p>:null}</div><div className="flex items-center gap-2"><StatusPill value={row.status}/>{row.promoted_product_id?<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Published as product</span>:null}</div></article>):<p className="p-6 text-sm text-on-surface-variant">No projects submitted yet.</p>}</div></section>
    <Toast toast={toast} onClose={()=>setToast(null)} />
  </div>;
}