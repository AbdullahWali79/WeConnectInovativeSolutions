"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBlog, deleteBlog, getBlogs, updateBlog } from "@/app/admin/blogs/actions";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { normalizeBlogTags, slugifyBlogTitle, type BlogInput } from "@/lib/blogs";
import { normalizeImageUrl } from "@/lib/image-url";
import type { Blog } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
const defaultForm = {
  title: "",
  slug: "",
  target_keyword: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  cover_image_github_path: "",
  cover_image_github_url: "",
  cover_image_cdn_url: "",
  tags: "",
  seo_title: "",
  seo_description: "",
  display_order: "1",
  published_at: "",
  published: false,
  featured: false,
};

export function BlogsManager() {
  const [rows, setRows] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [slugEdited, setSlugEdited] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<ToastState>(null);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const coverPreviewUrl = useMemo(() => normalizeImageUrl(form.cover_image_url), [form.cover_image_url]);

  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getBlogs());
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Blogs could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !term || `${row.title} ${row.slug} ${row.target_keyword ?? ""} ${(row.tags ?? []).join(" ")}`.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && row.published) ||
        (statusFilter === "unpublished" && !row.published) ||
        (statusFilter === "featured" && row.featured);
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  function resetForm() {
    setEditingId(null);
    setSlugEdited(false);
    setForm(defaultForm);
    setPreviewStatus("idle");
  }

  function startEdit(row: Blog) {
    setEditingId(row.id);
    setSlugEdited(true);
    setPreviewStatus(row.cover_image_url ? "loading" : "idle");
    setForm({
      title: row.title,
      slug: row.slug,
      target_keyword: row.target_keyword ?? "",
      excerpt: row.excerpt ?? "",
      content: row.content,
      cover_image_url: row.cover_image_url ?? "",
      cover_image_github_path: row.cover_image_github_path ?? "",
      cover_image_github_url: row.cover_image_github_url ?? "",
      cover_image_cdn_url: row.cover_image_cdn_url ?? "",
      tags: (row.tags ?? []).join(", "),
      seo_title: row.seo_title ?? "",
      seo_description: row.seo_description ?? "",
      display_order: String(row.display_order ?? 1),
      published_at: row.published_at ? row.published_at.slice(0, 16) : "",
      published: row.published,
      featured: row.featured,
    });
  }

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

  function buildPayload(): BlogInput {
    return {
      title: form.title,
      slug: form.slug,
      target_keyword: form.target_keyword,
      excerpt: form.excerpt,
      content: form.content,
      cover_image_url: form.cover_image_url,
      cover_image_github_path: form.cover_image_github_path,
      cover_image_github_url: form.cover_image_github_url,
      cover_image_cdn_url: form.cover_image_cdn_url,
      tags: normalizeBlogTags(form.tags),
      seo_title: form.seo_title,
      seo_description: form.seo_description,
      display_order: Number(form.display_order),
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      published: form.published,
      featured: form.featured,
    };
  }

  async function saveRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = editingId ? await updateBlog(editingId, buildPayload()) : await createBlog(buildPayload());
    setSaving(false);

    if (!result.ok) {
      setToast({ type: "error", message: result.error ?? "Blog could not be saved." });
      return;
    }

    setToast({ type: "success", message: editingId ? "Blog updated." : "Blog created." });
    resetForm();
    await loadRows();
  }

  async function toggleFlag(row: Blog, key: "published" | "featured") {
    const result = await updateBlog(row.id, {
      ...row,
      [key]: !row[key],
      published_at: key === "published" && !row.published && !row.published_at ? new Date().toISOString() : row.published_at,
    });

    if (!result.ok) {
      setToast({ type: "error", message: result.error ?? "Blog could not be updated." });
      return;
    }

    await loadRows();
  }

  async function removeRow(id: string) {
    if (!window.confirm("Delete this blog?")) return;
    const result = await deleteBlog(id);
    if (!result.ok) {
      setToast({ type: "error", message: result.error ?? "Blog could not be deleted." });
      return;
    }
    setToast({ type: "success", message: "Blog deleted." });
    await loadRows();
  }

  if (loading) return <LoadingState label="Loading blogs..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Blogs"
        title="Manage blogs"
        description="Create Markdown articles, control publishing, and curate featured content for the public blog."
        action={<Link href="/blogs" className="wc-secondary-btn text-sm"><Icon name="preview" /> View Blogs</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <form onSubmit={saveRow} className="wc-card space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit Blog" : "Add Blog"}</h2>
            {editingId ? <button type="button" onClick={resetForm} className="wc-secondary-btn px-3 py-2 text-xs">Cancel</button> : null}
          </div>

          <div className="grid gap-3">
            <input className="wc-input" placeholder="Title" value={form.title} onChange={(event) => updateTitle(event.target.value)} required />
            <input className="wc-input" placeholder="Slug" value={form.slug} onChange={(event) => updateSlug(event.target.value)} required />
            <input className="wc-input" placeholder="Target keyword" value={form.target_keyword} onChange={(event) => setForm((current) => ({ ...current, target_keyword: event.target.value }))} />
            <textarea className="wc-input min-h-20" placeholder="Excerpt" value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} />
            <textarea className="wc-input min-h-64 font-mono text-sm" placeholder="# Markdown content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} required />
            <input className="wc-input" placeholder="Public image URL or Google Drive share link" value={form.cover_image_url} onChange={(event) => { setPreviewStatus(event.target.value.trim() ? "loading" : "idle"); setForm((current) => ({ ...current, cover_image_url: event.target.value, cover_image_github_path: "", cover_image_github_url: "", cover_image_cdn_url: "" })); }} />
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
              {coverPreviewUrl && previewStatus !== "error" ? <>
                <div className="aspect-[16/9] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreviewUrl} alt="Blog cover preview" className="h-full w-full object-cover" onLoad={() => setPreviewStatus("loaded")} onError={() => setPreviewStatus("error")} />
                </div>
                <p className={`flex items-center gap-2 border-t border-outline-variant px-3 py-2 text-xs font-bold ${previewStatus === "loaded" ? "text-emerald-700" : "text-on-surface-variant"}`}><Icon name={previewStatus === "loaded" ? "check_circle" : "progress_activity"} /> {previewStatus === "loaded" ? "Image preview loaded successfully" : "Loading image preview..."}</p>
              </> : <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-4 text-center text-on-surface-variant"><Icon name={previewStatus === "error" ? "broken_image" : "image"} className="text-3xl" /><p className="text-sm font-bold">{previewStatus === "error" ? "Image could not be previewed" : "Image preview will appear here"}</p><p className="text-xs">Google Drive access must be Anyone with the link - Viewer.</p></div>}
            </div>
            <input className="wc-input" placeholder="Tags (comma separated)" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
            <input className="wc-input" placeholder="SEO title" value={form.seo_title} onChange={(event) => setForm((current) => ({ ...current, seo_title: event.target.value }))} />
            <textarea className="wc-input min-h-20" maxLength={160} placeholder="SEO description (max 160 characters)" value={form.seo_description} onChange={(event) => setForm((current) => ({ ...current, seo_description: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="wc-input" type="number" placeholder="Display order" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
              <input className="wc-input" type="datetime-local" value={form.published_at} onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface">
                <input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} />
                Published
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface">
                <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
                Featured
              </label>
            </div>
          </div>

          <button disabled={saving} className="wc-primary-btn w-full">{saving ? "Saving..." : editingId ? "Update Blog" : "Create Blog"}</button>
        </form>

        <section className="wc-card overflow-hidden">
          <div className="grid gap-3 border-b border-outline-variant/50 bg-surface-container-low p-3 md:grid-cols-[1fr_220px]">
            <input className="wc-input" placeholder="Search title, slug, keyword, or tag" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Blogs</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="featured">Featured</option>
            </select>
          </div>

          {filtered.length === 0 ? <div className="p-4"><EmptyState title="No blogs found" description="Create a blog or change filters." icon="article" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Blog</th>
                    <th className="px-4 py-3">Tags</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Publish Date</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-on-surface">{row.title}</p>
                        <p className="text-xs text-on-surface-variant">/{row.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {(row.tags ?? []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">{tag}</span>)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.display_order}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(row.published_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => toggleFlag(row, "published")} className={`rounded-full px-3 py-1 text-xs font-bold ${row.published ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}>{row.published ? "Published" : "Unpublished"}</button>
                          <button onClick={() => toggleFlag(row, "featured")} className={`rounded-full px-3 py-1 text-xs font-bold ${row.featured ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>{row.featured ? "Featured" : "Normal"}</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link href={`/blogs/${row.slug}`} className="rounded-lg bg-surface-container p-2 text-primary" title="View"><Icon name="visibility" /></Link>
                          <button className="rounded-lg bg-surface-container p-2 text-primary" onClick={() => startEdit(row)} title="Edit"><Icon name="edit" /></button>
                          <button className="rounded-lg bg-error-container p-2 text-error" onClick={() => removeRow(row.id)} title="Delete"><Icon name="delete" /></button>
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



