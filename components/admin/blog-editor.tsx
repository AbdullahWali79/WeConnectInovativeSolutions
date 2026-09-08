"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import "react-quill-new/dist/quill.snow.css";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/types";

type BlogInput = Database["public"]["Tables"]["blogs"]["Insert"];

// Dynamic import for React Quill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false, loading: () => <div className="min-h-[500px] w-full animate-pulse rounded-xl bg-surface-container-low" /> });

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote", "code-block", "link", "image"],
    ["clean"],
  ],
};

function slugifyBlogTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function normalizeBlogTags(tagsString: string) {
  return tagsString
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function BlogEditor({ initialId }: { initialId?: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(Boolean(initialId));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    target_keyword: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    tags: "",
    seo_title: "",
    seo_description: "",
    display_order: "1",
    published_at: "",
    published: false,
    featured: false,
  });

  const [slugEdited, setSlugEdited] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  const loadBlog = useCallback(async () => {
    if (!initialId) return;
    const { data, error } = await supabase.from("blogs").select("*").eq("id", initialId).single();
    if (error) {
      setToast({ type: "error", message: error.message });
      setLoading(false);
      return;
    }
    setForm({
      title: data.title,
      slug: data.slug,
      target_keyword: data.target_keyword ?? "",
      excerpt: data.excerpt ?? "",
      content: data.content ?? "",
      cover_image_url: data.cover_image_cdn_url ?? data.cover_image_url ?? "",
      tags: (data.tags ?? []).join(", "),
      seo_title: data.seo_title ?? "",
      seo_description: data.seo_description ?? "",
      display_order: String(data.display_order ?? 1),
      published_at: data.published_at ? data.published_at.slice(0, 16) : "",
      published: data.published,
      featured: data.featured,
    });
    setSlugEdited(true);
    if (data.cover_image_cdn_url || data.cover_image_url) setPreviewStatus("loading");
    setLoading(false);
  }, [initialId, supabase]);

  useEffect(() => {
    void loadBlog();
  }, [loadBlog]);

  function updateTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugEdited ? current.slug : slugifyBlogTitle(value),
    }));
  }

  function updateSlug(value: string) {
    setSlugEdited(true);
    setForm((current) => ({ ...current, slug: slugifyBlogTitle(value) }));
  }

  async function saveBlog(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      return setToast({ type: "error", message: "Title, slug, and content are required." });
    }

    setSaving(true);
    
    const payload: BlogInput = {
      title: form.title,
      slug: form.slug,
      target_keyword: form.target_keyword,
      excerpt: form.excerpt,
      content: form.content,
      cover_image_url: form.cover_image_url,
      tags: normalizeBlogTags(form.tags),
      seo_title: form.seo_title,
      seo_description: form.seo_description,
      display_order: Number(form.display_order),
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      published: form.published,
      featured: form.featured,
    };

    if (initialId) {
      const { error } = await supabase.from("blogs").update(payload).eq("id", initialId);
      if (error) setToast({ type: "error", message: error.message });
      else {
        setToast({ type: "success", message: "Blog updated successfully!" });
        router.push("/admin/blogs");
      }
    } else {
      const { error } = await supabase.from("blogs").insert(payload);
      if (error) setToast({ type: "error", message: error.message });
      else {
        setToast({ type: "success", message: "Blog created successfully!" });
        router.push("/admin/blogs");
      }
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-on-surface-variant"><Icon name="progress_activity" className="animate-spin text-4xl" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      <PageHeader 
        eyebrow="Blog Editor" 
        title={initialId ? "Edit Blog Post" : "Compose New Blog"} 
        description="Write and format your blog post. Changes are live instantly upon saving." 
        action={<button type="button" onClick={() => router.push("/admin/blogs")} className="wc-secondary-btn"><Icon name="arrow_back" /> Back to Manage Blogs</button>}
      />

      <form onSubmit={saveBlog} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        
        {/* Main Editor Column */}
        <div className="space-y-6">
          <div className="wc-card space-y-4 p-5">
            <input className="w-full bg-transparent text-3xl font-black text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none" placeholder="Blog Title..." value={form.title} onChange={(e) => updateTitle(e.target.value)} required />
            <input className="w-full bg-transparent text-sm font-bold text-primary placeholder:text-primary/40 focus:outline-none" placeholder="url-slug-goes-here" value={form.slug} onChange={(e) => updateSlug(e.target.value)} required />
          </div>

          <div className="wc-card overflow-hidden bg-white">
            <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${viewMode === "visual" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high"}`}
              >
                <Icon name="visibility" className="mr-2 inline-block align-bottom" />
                Visual View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("html")}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${viewMode === "html" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high"}`}
              >
                <Icon name="code" className="mr-2 inline-block align-bottom" />
                HTML View
              </button>
            </div>
            
            {viewMode === "visual" ? (
              <ReactQuill 
                theme="snow" 
                value={form.content} 
                onChange={(value) => setForm((current) => ({ ...current, content: value }))} 
                modules={QUILL_MODULES} 
                className="min-h-[500px]"
                placeholder="Write your amazing post here..."
              />
            ) : (
              <textarea
                className="w-full min-h-[500px] resize-y p-5 font-mono text-sm text-on-surface focus:outline-none"
                placeholder="<!-- Paste your raw HTML or Markdown code here -->"
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              />
            )}
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            .ql-editor { min-height: 500px; font-size: 16px; font-family: inherit; line-height: 1.8; color: #1e293b; }
            .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; padding: 12px !important; background: #f8fafc; }
            .ql-container.ql-snow { border: none !important; }
          `}} />
        </div>

        {/* Sidebar Settings Column */}
        <div className="space-y-6">
          
          <div className="wc-card p-5 space-y-4">
            <h3 className="font-black text-on-surface">Publishing Options</h3>
            <button disabled={saving} type="submit" className="wc-primary-btn w-full text-base"><Icon name="publish" /> {saving ? "Saving..." : initialId ? "Update Blog Post" : "Publish Blog Post"}</button>
            <div className="pt-2 grid gap-3">
              <label className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} />
                Published (Visible to public)
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
                Featured Post
              </label>
              <div>
                <label className="wc-label mb-2 block">Publish Date (Optional)</label>
                <input className="wc-input" type="datetime-local" value={form.published_at} onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))} />
              </div>
              <div>
                <label className="wc-label mb-2 block">Display Order</label>
                <input className="wc-input" type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
              </div>
            </div>
          </div>

          <div className="wc-card p-5 space-y-4">
            <h3 className="font-black text-on-surface">Cover Image</h3>
            <input className="wc-input" placeholder="Public image URL or Google Drive share link" value={form.cover_image_url} onChange={(event) => { setPreviewStatus(event.target.value.trim() ? "loading" : "idle"); setForm((current) => ({ ...current, cover_image_url: event.target.value })); }} />
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
              {form.cover_image_url && previewStatus !== "error" ? <>
                <div className="aspect-[16/9] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.cover_image_url} alt="Blog cover preview" className="h-full w-full object-cover" onLoad={() => setPreviewStatus("loaded")} onError={() => setPreviewStatus("error")} />
                </div>
                <p className={`flex items-center gap-2 border-t border-outline-variant px-3 py-2 text-xs font-bold ${previewStatus === "loaded" ? "text-emerald-700" : "text-on-surface-variant"}`}><Icon name={previewStatus === "loaded" ? "check_circle" : "progress_activity"} /> {previewStatus === "loaded" ? "Image loaded" : "Loading preview..."}</p>
              </> : <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-4 text-center text-on-surface-variant"><Icon name={previewStatus === "error" ? "broken_image" : "image"} className="text-3xl" /><p className="text-sm font-bold">{previewStatus === "error" ? "Image could not be previewed" : "Preview will appear here"}</p></div>}
            </div>
          </div>

          <div className="wc-card p-5 space-y-4">
            <h3 className="font-black text-on-surface">SEO & Meta</h3>
            <div>
              <label className="wc-label mb-2 block">Tags</label>
              <input className="wc-input" placeholder="react, business, tech" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
            </div>
            <div>
              <label className="wc-label mb-2 block">Target Keyword</label>
              <input className="wc-input" placeholder="e.g. best saas tools" value={form.target_keyword} onChange={(event) => setForm((current) => ({ ...current, target_keyword: event.target.value }))} />
            </div>
            <div>
              <label className="wc-label mb-2 block">SEO Title</label>
              <input className="wc-input" placeholder="Custom SEO Title" value={form.seo_title} onChange={(event) => setForm((current) => ({ ...current, seo_title: event.target.value }))} />
            </div>
            <div>
              <label className="wc-label mb-2 block">Excerpt / Meta Description</label>
              <textarea className="wc-input min-h-24" maxLength={160} placeholder="Brief summary (max 160 characters)" value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} />
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
