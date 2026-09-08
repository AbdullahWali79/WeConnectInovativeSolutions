"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Blog } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

import { BlogsExcelTools } from "./blogs-excel-tools";

export function BlogsManager() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("blogs").select("*").order("created_at", { ascending: false });
    if (error) setToast({ type: "error", message: error.message });
    else setRows(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows
      .filter((row) => {
        if (statusFilter === "published") return row.published;
        if (statusFilter === "unpublished") return !row.published;
        if (statusFilter === "featured") return row.featured;
        return true;
      })
      .filter((row) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          row.title.toLowerCase().includes(q) ||
          row.slug.toLowerCase().includes(q) ||
          (row.target_keyword ?? "").toLowerCase().includes(q) ||
          (row.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
        );
      });
  }, [rows, statusFilter, query]);

  async function removeRow(id: string) {
    if (!confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) return;
    const { error } = await supabase.from("blogs").delete().eq("id", id);
    if (error) setToast({ type: "error", message: error.message });
    else {
      setToast({ type: "success", message: "Blog deleted successfully." });
      setRows((current) => current.filter((r) => r.id !== id));
    }
  }

  async function toggleFlag(row: Blog, field: "published" | "featured") {
    const next = !row[field];
    setRows((current) => current.map((r) => (r.id === row.id ? { ...r, [field]: next } : r)));
    const { error } = await supabase.from("blogs").update({ [field]: next }).eq("id", row.id);
    if (error) {
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, [field]: !next } : r)));
      setToast({ type: "error", message: error.message });
    }
  }

  if (loading) return <LoadingState label="Loading blogs..." />;

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="Blogs"
        title="Manage blogs"
        description="Create rich articles, control publishing, and curate featured content for the public blog."
        action={<Link href="/admin/blogs/editor" className="wc-primary-btn text-sm"><Icon name="add" /> Add New Blog</Link>}
      />

      <div className="mt-6 space-y-6">
        <BlogsExcelTools />

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
                          <Link href={`/admin/blogs/editor?id=${row.id}`} className="rounded-lg bg-surface-container p-2 text-primary" title="Edit"><Icon name="edit" /></Link>
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
