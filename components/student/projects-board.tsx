"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { cleanExternalUrl, getGoogleDriveFileId } from "@/lib/image-url";
import { uploadProjectFileToDrive } from "@/lib/media/google-drive-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, StudentProject } from "@/lib/supabase/types";

const emptyForm = { title: "", course_id: "", category: "", short_description: "", full_description: "", github_url: "", live_url: "", technologies: "", image_urls: [""] };

export function StudentProjectsBoard() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<StudentProject[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<Pick<Course, "id" | "title">[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [driveUpload, setDriveUpload] = useState({ configured: false, maxImageMb: 15, maxVideoMb: 500 });
  const [sharedFolder, setSharedFolder] = useState<{ enabled: boolean; url: string | null; instructions: string | null }>({ enabled: false, url: null, instructions: null });
  const [toast, setToast] = useState<ToastState>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sharedFolderActive = sharedFolder.enabled && Boolean(sharedFolder.url);

  const load = useCallback(async () => {
    const [projectsResult, productsResult, enrollmentsResult, coursesResult, driveResult, submissionSettings] = await Promise.all([
      supabase.from("student_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("category").eq("status", "active").order("category"),
      supabase.from("enrollments").select("course_id"),
      supabase.from("courses").select("id,title").eq("status", "active").order("title"),
      fetch("/api/uploads/google-drive/status", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/project-submissions/status", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]);
    const error = projectsResult.error ?? productsResult.error ?? enrollmentsResult.error ?? coursesResult.error;
    if (error) setToast({ type: "error", message: error.message });
    setRows((projectsResult.data ?? []) as StudentProject[]);
    setCategories(Array.from(new Set((productsResult.data ?? []).map((product) => product.category.trim()).filter(Boolean))));
    const enrolledCourseIds = new Set((enrollmentsResult.data ?? []).map((enrollment) => enrollment.course_id));
    setCourseOptions((coursesResult.data ?? []).filter((course) => enrolledCourseIds.has(course.id)));
    if (driveResult) setDriveUpload(driveResult);
    if (submissionSettings) setSharedFolder({ enabled: Boolean(submissionSettings.sharedFolderEnabled), url: submissionSettings.sharedFolderUrl, instructions: submissionSettings.sharedFolderInstructions });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  function editProject(row: StudentProject) {
    if (row.status !== "revision_required") return;
    setEditingId(row.id);
    setForm({
      title: row.title,
      course_id: row.course_id ?? "",
      category: row.category,
      short_description: row.short_description ?? "",
      full_description: row.full_description ?? "",
      github_url: row.github_url ?? "",
      live_url: row.live_url ?? "",
      technologies: row.technologies.join(", "),
      image_urls: row.image_urls.length ? row.image_urls : [""],
    });
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function uploadFiles(files: FileList | null, kind: "image" | "video") {
    if (!files?.length) return;
    if (!driveUpload.configured) return setToast({ type: "error", message: "Admin has not enabled Google Drive uploads yet." });
    const selected = Array.from(files);
    if (kind === "video" && selected.length > 1) return setToast({ type: "error", message: "Upload one project video at a time." });
    try {
      for (const file of selected) {
        setUploading(file.name); setUploadProgress(0);
        const uploaded = await uploadProjectFileToDrive(file, setUploadProgress);
        if (kind === "image") setForm((current) => ({ ...current, image_urls: [...current.image_urls.filter(Boolean), uploaded.url] }));
        else setForm((current) => ({ ...current, live_url: uploaded.url }));
      }
      setToast({ type: "success", message: `${selected.length} ${kind}${selected.length > 1 ? "s" : ""} uploaded to the admin Google Drive.` });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Google Drive upload failed." });
    } finally { setUploading(null); setUploadProgress(0); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const githubUrl = form.github_url.trim();
    const liveUrl = form.live_url.trim();
    const imageUrls = form.image_urls.map(cleanExternalUrl).filter(Boolean);
    if (!imageUrls.length) {
      return setToast({ type: "error", message: "At least one public Google Drive project image is required." });
    }
    if (imageUrls.some((url) => !getGoogleDriveFileId(url))) return setToast({ type: "error", message: "Every image must use a valid Google Drive file URL." });
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const projectPayload = {
      course_id: form.course_id,
      title: form.title.trim(),
      category: form.category.trim(),
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      github_url: githubUrl,
      live_url: liveUrl || null,
      technologies: form.technologies.split(",").map((item) => item.trim()).filter(Boolean),
      image_urls: imageUrls,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from("student_projects").update({
          ...projectPayload,
          status: "submitted",
          reviewed_at: null,
          reviewed_by: null,
        }).eq("id", editingId).eq("student_id", user?.id).eq("status", "revision_required")
      : await supabase.from("student_projects").insert({
          ...projectPayload,
          student_id: user?.id,
        });
    setSaving(false);
    if (result.error) return setToast({ type: "error", message: result.error.message });
    const wasEditing = Boolean(editingId);
    setEditingId(null);
    setForm(emptyForm);
    setToast({ type: "success", message: wasEditing ? "Improved project resubmitted for admin review." : "Project submitted for admin review." });
    await load();
  }

  if (loading) return <LoadingState label="Loading projects..." />;

  return <div className="space-y-6">
    <PageHeader eyebrow="Portfolio" title="My Projects" description="Submit at least one public Google Drive screenshot. GitHub, YouTube, and live demo links can be added as optional proof." />
    {sharedFolder.enabled && sharedFolder.url ? <section className="wc-card border-2 border-primary/30 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Icon name="folder_shared" className="text-primary" /><h2 className="font-black">Upload files to the shared project folder</h2></div><p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{sharedFolder.instructions || "Create a folder using your project name, upload images/videos, set each file to Anyone with the link — Viewer, then paste the links below."}</p></div><a className="wc-primary-btn shrink-0" href={sharedFolder.url} target="_blank" rel="noreferrer"><Icon name="open_in_new" /> Open Upload Folder</a></div>
    </section> : null}
    <form ref={formRef} onSubmit={submit} className="wc-card grid scroll-mt-6 gap-4 p-5 md:grid-cols-2">
      {editingId ? <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <div>
          <p className="font-black">Improve and resubmit this project</p>
          <p className="mt-1 text-sm">Update the project according to the admin comments shown in Submission history.</p>
        </div>
        <button type="button" className="wc-secondary-btn" onClick={cancelEdit}><Icon name="close" /> Cancel editing</button>
      </div> : null}
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
      <div className="md:col-span-2 space-y-3 rounded-xl bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="wc-label">Project video (optional)</p><p className="mt-1 text-xs text-on-surface-variant">{sharedFolderActive ? "Upload the video in your project folder, make it viewable by anyone with the link, then paste its URL below." : `Upload MP4, WEBM or MOV up to ${driveUpload.maxVideoMb} MB, or paste a YouTube/live demo URL.`}</p></div>{sharedFolderActive ? <a className="wc-secondary-btn" href={sharedFolder.url!} target="_blank" rel="noreferrer"><Icon name="open_in_new" /> Open Drive for Video</a> : <label className={`wc-secondary-btn cursor-pointer ${!driveUpload.configured || uploading ? "pointer-events-none opacity-60" : ""}`}><Icon name="video_file" /> Upload Video<input className="hidden" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={!driveUpload.configured || Boolean(uploading)} onChange={(e) => { void uploadFiles(e.target.files, "video"); e.currentTarget.value = ""; }} /></label>}</div>
        <input className="wc-input" type="url" placeholder="Google Drive video, YouTube, or live demo URL (optional)" value={form.live_url} onChange={(e) => setForm({...form,live_url:e.target.value})} />
      </div>
      <p className="md:col-span-2 text-xs leading-5 text-on-surface-variant">
        At least one project image is compulsory. {sharedFolderActive ? <>After uploading to the shared folder, set every file to <strong>Anyone with the link — Viewer</strong> and paste its file URL in this form.</> : <>Files uploaded here are stored in the admin Drive and automatically shared as <strong>Anyone with the link — Viewer</strong>.</>}
      </p>
      <input className="wc-input md:col-span-2" placeholder="Technologies, comma separated" value={form.technologies} onChange={(e) => setForm({...form,technologies:e.target.value})} />
      <input className="wc-input md:col-span-2" required placeholder="Short description" value={form.short_description} onChange={(e) => setForm({...form,short_description:e.target.value})} />
      <div className="md:col-span-2">
        <textarea className="wc-input min-h-36" placeholder="Full project description" value={form.full_description} onChange={(e) => setForm({...form,full_description:e.target.value})} />
        <p className="mt-2 text-xs leading-5 text-on-surface-variant">Formatting is automatic. Paste headings, bullet or numbered lists, Markdown tables, or tab-separated tables copied from a sheet.</p>
      </div>
      <div className="md:col-span-2 rounded-xl bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="wc-label">Project screenshots <span className="text-error">*</span></p><p className="mt-1 text-xs text-on-surface-variant">{sharedFolderActive ? "Create your project folder in Drive, upload JPG/PNG/WEBP/GIF images, then paste each public file URL below." : `JPG, PNG, WEBP or GIF, maximum ${driveUpload.maxImageMb} MB each.`}</p></div>{sharedFolderActive ? <a className="wc-primary-btn" href={sharedFolder.url!} target="_blank" rel="noreferrer"><Icon name="open_in_new" /> Open Drive & Upload Images</a> : <label className={`wc-primary-btn cursor-pointer ${!driveUpload.configured || uploading ? "pointer-events-none opacity-60" : ""}`}><Icon name="cloud_upload" /> Upload Images<input className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={!driveUpload.configured || Boolean(uploading)} onChange={(e) => { void uploadFiles(e.target.files, "image"); e.currentTarget.value = ""; }} /></label>}</div>
        {!driveUpload.configured && !sharedFolderActive ? <div className="mt-3 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950"><Icon name="warning" className="shrink-0 text-amber-600" /><p className="text-sm">Uploads are currently unavailable. Ask admin to connect and mount Google Drive.</p></div> : null}
        {uploading ? <div className="mt-3"><div className="flex justify-between text-xs font-bold"><span className="truncate">Uploading {uploading}</span><span>{uploadProgress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} /></div></div> : null}
        <div className="mt-3 grid gap-3">
          {form.image_urls.map((url,index) => <div key={index} className="flex gap-2"><input className="wc-input flex-1" type="url" readOnly={driveUpload.configured && !sharedFolderActive} required={index === 0} placeholder={driveUpload.configured && !sharedFolderActive ? "Upload an image using the button above" : "Paste public Google Drive image URL"} value={url} onChange={(e)=>setForm({...form,image_urls:form.image_urls.map((item,i)=>i===index?e.target.value:item)})}/>{url || form.image_urls.length>1?<button type="button" className="wc-secondary-btn" aria-label="Remove image" onClick={()=>setForm({...form,image_urls:form.image_urls.filter((_,i)=>i!==index).length ? form.image_urls.filter((_,i)=>i!==index) : [""]})}><Icon name="delete"/></button>:null}</div>)}
        </div>
        {sharedFolderActive || !driveUpload.configured ? <button type="button" className="wc-secondary-btn mt-3" onClick={()=>setForm({...form,image_urls:[...form.image_urls,""]})}><Icon name="add"/> Add Image URL</button> : null}
      </div>
      <button disabled={saving || Boolean(uploading)} className="wc-primary-btn md:col-span-2"><Icon name="send"/> {saving ? "Submitting..." : editingId ? "Update & Resubmit Project" : "Submit Project"}</button>
    </form>
    {rows.some((row) => row.status === "revision_required") ? <section className="wc-card overflow-hidden border border-amber-300">
      <div className="border-b border-amber-300 bg-amber-50 p-4">
        <h2 className="text-lg font-black text-amber-950">Projects needing improvement</h2>
        <p className="mt-1 text-sm text-amber-900">Read the admin comments, update your project, and resubmit it for review.</p>
      </div>
      <div className="divide-y divide-amber-200">
        {rows.filter((row) => row.status === "revision_required").map((row) => <article key={row.id} className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h3 className="font-black">{row.title}</h3><p className="text-sm text-on-surface-variant">{row.category} &middot; {row.image_urls.length} images</p></div>
            <StatusPill value={row.status}/>
          </div>
          <div className="mt-3 rounded-lg border border-amber-300 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-wide text-on-surface-variant">Admin comments</p>
            <p className="mt-1 text-sm leading-6">{row.admin_feedback}</p>
          </div>
          <button type="button" className="wc-primary-btn mt-3" onClick={() => editProject(row)}><Icon name="edit" /> Improve Project</button>
        </article>)}
      </div>
    </section> : null}
    <section className="wc-card overflow-hidden"><div className="border-b border-outline-variant p-4"><h2 className="text-lg font-black">Submission history</h2></div><div className="divide-y divide-outline-variant">{rows.length?rows.map(row=><article key={row.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><h3 className="font-black">{row.title}</h3><p className="text-sm text-on-surface-variant">{row.category} &middot; {[row.github_url ? "GitHub" : "", row.live_url ? "video/live link" : "", row.image_urls.length ? `${row.image_urls.length} images` : ""].filter(Boolean).join(" · ")}</p>{row.admin_feedback?<p className="mt-2 text-sm">{row.admin_feedback}</p>:null}</div><div className="flex items-center gap-2"><StatusPill value={row.status}/>{row.promoted_product_id?<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Published as product</span>:null}</div></article>):<p className="p-6 text-sm text-on-surface-variant">No projects submitted yet.</p>}</div></section>
    <Toast toast={toast} onClear={()=>setToast(null)} />
  </div>;
}
