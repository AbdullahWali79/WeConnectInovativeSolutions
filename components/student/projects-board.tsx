"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, StudentProject } from "@/lib/supabase/types";

const emptyForm = { title: "", course_id: "", category: "", short_description: "", full_description: "", github_url: "", live_url: "", technologies: "", image_urls: [""] };

export function StudentProjectsBoard() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<StudentProject[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<Pick<Course, "id" | "title">[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    const [projectsResult, productsResult, enrollmentsResult, coursesResult] = await Promise.all([
      supabase.from("student_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("category").eq("status", "active").order("category"),
      supabase.from("enrollments").select("course_id"),
      supabase.from("courses").select("id,title").eq("status", "active").order("title"),
    ]);
    const error = projectsResult.error ?? productsResult.error ?? enrollmentsResult.error ?? coursesResult.error;
    if (error) setToast({ type: "error", message: error.message });
    setRows((projectsResult.data ?? []) as StudentProject[]);
    setCategories(Array.from(new Set((productsResult.data ?? []).map((product) => product.category.trim()).filter(Boolean))));
    const enrolledCourseIds = new Set((enrollmentsResult.data ?? []).map((enrollment) => enrollment.course_id));
    setCourseOptions((coursesResult.data ?? []).filter((course) => enrolledCourseIds.has(course.id)));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const githubUrl = form.github_url.trim();
    const liveUrl = form.live_url.trim();
    const imageUrls = form.image_urls.map((url) => url.trim()).filter(Boolean);
    if (!imageUrls.length) {
      return setToast({ type: "error", message: "At least one public Google Drive project image is required." });
    }
    if (imageUrls.some((url) => !url.includes("drive.google.com"))) return setToast({ type: "error", message: "Every image must use a public Google Drive URL." });
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("student_projects").insert({
      student_id: user?.id,
      course_id: form.course_id,
      title: form.title.trim(),
      category: form.category.trim(),
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      github_url: githubUrl,
      live_url: liveUrl || null,
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
    <PageHeader eyebrow="Portfolio" title="My Projects" description="Submit at least one public Google Drive screenshot. GitHub, YouTube, and live demo links can be added as optional proof." />
    <form onSubmit={submit} className="wc-card grid gap-4 p-5 md:grid-cols-2">
      <input className="wc-input" required placeholder="Project title" value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} />
      <div>
        <label className="wc-label" htmlFor="project-course">Course</label>
        <select id="project-course" className="wc-input mt-2" required value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} disabled={!courseOptions.length}>
          <option value="">{courseOptions.length ? "Select enrolled course" : "No active enrollment available"}</option>
          {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
      </div>
      <div>
        <label className="wc-label" htmlFor="project-category">Category</label>
        <select
          id="project-category"
          className="wc-input mt-2"
          required
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          disabled={!categories.length}
        >
          <option value="">{categories.length ? "Select a product category" : "No product categories available"}</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        {!categories.length ? <p className="mt-2 text-xs font-semibold text-error">Ask admin to add an active product category first.</p> : null}
      </div>
      <input className="wc-input md:col-span-2" type="url" placeholder="GitHub project URL (optional)" value={form.github_url} onChange={(e) => setForm({...form,github_url:e.target.value})} />
      <input className="wc-input md:col-span-2" type="url" placeholder="YouTube video or live demo URL (optional)" value={form.live_url} onChange={(e) => setForm({...form,live_url:e.target.value})} />
      <p className="md:col-span-2 text-xs leading-5 text-on-surface-variant">A public Google Drive project image is compulsory. GitHub, YouTube, and live demo links are optional.</p>
      <input className="wc-input md:col-span-2" placeholder="Technologies, comma separated" value={form.technologies} onChange={(e) => setForm({...form,technologies:e.target.value})} />
      <input className="wc-input md:col-span-2" required placeholder="Short description" value={form.short_description} onChange={(e) => setForm({...form,short_description:e.target.value})} />
      <div className="md:col-span-2">
        <textarea className="wc-input min-h-36" placeholder="Full project description" value={form.full_description} onChange={(e) => setForm({...form,full_description:e.target.value})} />
        <p className="mt-2 text-xs leading-5 text-on-surface-variant">Formatting is automatic. Paste headings, bullet or numbered lists, Markdown tables, or tab-separated tables copied from a sheet.</p>
      </div>
      <div className="md:col-span-2 rounded-xl bg-surface-container-low p-4">
        <p className="wc-label">Google Drive screenshots <span className="text-error">*</span></p>
        <div className="mt-3 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
          <Icon name="warning" className="mt-0.5 shrink-0 text-xl text-amber-600" />
          <div>
            <p className="text-sm font-black">Google Drive access must be: Anyone with the link</p>
            <p className="mt-1 text-xs leading-5">
              Before pasting each image URL, open Google Drive Sharing, change General access from Restricted to Anyone with the link, and keep the role as Viewer. Private or restricted images cannot be previewed by admin.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3">
          {form.image_urls.map((url,index) => <div key={index} className="flex gap-2"><input className="wc-input flex-1" type="url" required={index === 0} placeholder={"Public Google Drive image URL " + (index+1) + (index === 0 ? " (required)" : " (optional)")} value={url} onChange={(e)=>setForm({...form,image_urls:form.image_urls.map((item,i)=>i===index?e.target.value:item)})}/>{form.image_urls.length>1?<button type="button" className="wc-secondary-btn" onClick={()=>setForm({...form,image_urls:form.image_urls.filter((_,i)=>i!==index)})}><Icon name="delete"/></button>:null}</div>)}
        </div>
        <button type="button" className="wc-secondary-btn mt-3" onClick={()=>setForm({...form,image_urls:[...form.image_urls,""]})}><Icon name="add"/> Add Image URL</button>
      </div>
      <button disabled={saving} className="wc-primary-btn md:col-span-2"><Icon name="send"/> {saving ? "Submitting..." : "Submit Project"}</button>
    </form>
    <section className="wc-card overflow-hidden"><div className="border-b border-outline-variant p-4"><h2 className="text-lg font-black">Submission history</h2></div><div className="divide-y divide-outline-variant">{rows.length?rows.map(row=><article key={row.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><h3 className="font-black">{row.title}</h3><p className="text-sm text-on-surface-variant">{row.category} &middot; {[row.github_url ? "GitHub" : "", row.live_url ? "video/live link" : "", row.image_urls.length ? `${row.image_urls.length} images` : ""].filter(Boolean).join(" · ")}</p>{row.admin_feedback?<p className="mt-2 text-sm">{row.admin_feedback}</p>:null}</div><div className="flex items-center gap-2"><StatusPill value={row.status}/>{row.promoted_product_id?<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Published as product</span>:null}</div></article>):<p className="p-6 text-sm text-on-surface-variant">No projects submitted yet.</p>}</div></section>
    <Toast toast={toast} onClear={()=>setToast(null)} />
  </div>;
}
