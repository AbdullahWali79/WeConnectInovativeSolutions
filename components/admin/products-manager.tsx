"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { uploadFileToGithubCdn } from "@/lib/media/client-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Product, Profile } from "@/lib/supabase/types";
import { normalizeImageUrl } from "@/lib/image-url";
import { formatDate } from "@/lib/utils";
type GithubUploadResult = Awaited<ReturnType<typeof uploadFileToGithubCdn>>;


const defaultForm = {
  name: "",
  category: "",
  image_url: "",
  image_github_path: "",
  image_github_url: "",
  image_cdn_url: "",
  short_description: "",
  full_description: "",
  price_or_access_type: "",
  badge: "new",
  product_link: "",
  features: "",
  status: "active",
  display_order: "0",
};

export function ProductsManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const canCreate = canUse("products.create");
  const canEdit = canUse("products.edit");
  const canDelete = canUse("products.delete");
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("display_order", { ascending: true });
    if (error) setToast({ type: "error", message: error.message });
    setRows(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const text = `${row.name} ${row.short_description ?? ""}`.toLowerCase();
    const queryMatch = text.includes(query.trim().toLowerCase());
    const categoryMatch = categoryFilter === "all" || row.category === categoryFilter;
    const badgeMatch = badgeFilter === "all" || row.badge === badgeFilter;
    const statusMatch = statusFilter === "all" || row.status === statusFilter;
    return queryMatch && categoryMatch && badgeMatch && statusMatch;
  }), [rows, query, categoryFilter, badgeFilter, statusFilter]);

  function startEdit(row: Product) {
    if (!canEdit) {
      setToast({ type: "error", message: "You do not have permission to edit products." });
      return;
    }
    setEditingId(row.id);
    setForm({
      name: row.name,
      category: row.category,
      image_url: row.image_url ?? "",
      image_github_path: row.image_github_path ?? "",
      image_github_url: row.image_github_url ?? "",
      image_cdn_url: row.image_cdn_url ?? "",
      short_description: row.short_description ?? "",
      full_description: row.full_description ?? "",
      price_or_access_type: row.price_or_access_type ?? "",
      badge: row.badge,
      product_link: row.product_link ?? "",
      features: (row.features ?? []).join(", "),
      status: row.status,
      display_order: String(row.display_order ?? 0),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  async function saveImageToEditingProduct(upload: GithubUploadResult) {
    if (!editingId) return false;

    const imageFields = {
      image_url: upload.githubCdnUrl,
      image_github_path: upload.githubPath,
      image_github_url: upload.githubUrl,
      image_cdn_url: upload.githubCdnUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("products").update(imageFields).eq("id", editingId);
    if (error) {
      const migrationMissing = /image_github_path|image_github_url|image_cdn_url|column/i.test(error.message);
      if (!migrationMissing) throw error;
      const { error: fallbackError } = await supabase.from("products").update({ image_url: upload.githubCdnUrl, updated_at: imageFields.updated_at }).eq("id", editingId);
      if (fallbackError) throw fallbackError;
    }

    setRows((current) => current.map((row) => row.id === editingId ? { ...row, ...imageFields } : row));
    return true;
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const upload = await uploadFileToGithubCdn(file, "product");
      setForm((current) => ({ ...current, image_url: upload.githubCdnUrl, image_github_path: upload.githubPath, image_github_url: upload.githubUrl, image_cdn_url: upload.githubCdnUrl }));
      const saved = await saveImageToEditingProduct(upload);
      setToast({ type: "success", message: saved ? "Product image uploaded and saved to this product." : "Product image uploaded. Fill the product form and click Create to save it." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Product image upload failed." });
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }
  async function saveRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canSave = editingId ? canEdit : canCreate;

    if (!canSave) {
      setToast({ type: "error", message: "You do not have permission to save products." });
      return;
    }
    if (!form.name.trim() || !form.category.trim()) {
      setToast({ type: "error", message: "Product name and category are required." });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      image_url: normalizeImageUrl(form.image_url),
      image_github_path: form.image_github_path || null,
      image_github_url: form.image_github_url || null,
      image_cdn_url: form.image_cdn_url || null,
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      price_or_access_type: form.price_or_access_type.trim() || null,
      badge: form.badge,
      product_link: form.product_link.trim() || null,
      features: form.features.trim() ? form.features.split(",").map((item) => item.trim()).filter(Boolean) : [],
      status: form.status,
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    const request = editingId ? supabase.from("products").update(payload).eq("id", editingId) : supabase.from("products").insert(payload);
    let { error } = await request;

    if (error && /image_github_path|image_github_url|image_cdn_url|column/i.test(error.message)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.image_github_path;
      delete fallbackPayload.image_github_url;
      delete fallbackPayload.image_cdn_url;
      const fallbackRequest = editingId ? supabase.from("products").update(fallbackPayload).eq("id", editingId) : supabase.from("products").insert(fallbackPayload);
      const fallback = await fallbackRequest;
      error = fallback.error;
    }

    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: editingId ? "Product updated." : "Product created." });
    resetForm();
    await loadRows();
  }

  async function deleteRow(id: string) {
    if (!canDelete) {
      setToast({ type: "error", message: "You do not have permission to delete products." });
      return;
    }
    if (!window.confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Product deleted." });
    await loadRows();
  }

  if (loading) return <LoadingState label="Loading products..." />;

  const productAccessMessage = canEdit || canDelete
    ? "Use the action buttons in the table to manage products enabled for this account."
    : "You can view products, but edit and delete actions are not enabled for this account.";

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Products"
        title="Manage products"
        description="Create and maintain digital products shown in the public Products catalog."
        action={<Link href="/products" className="wc-secondary-btn text-sm"><Icon name="preview" /> View Products</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {(canCreate || editingId) ? <form onSubmit={saveRow} className="wc-card space-y-3 p-4">
          <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit Product" : "Add Product"}</h2>
          <input className="wc-input" placeholder="Product name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <input className="wc-input" list="product-category-options" placeholder="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required />
          <datalist id="product-category-options">
            {categories.map((category) => <option key={category} value={category} />)}
          </datalist>
          <input className="wc-input" placeholder="Image/Banner URL or Google Drive share link" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} />
          <p className="text-xs leading-5 text-on-surface-variant">Paste a normal image URL or a Google Drive share link. Drive links are converted automatically when saved.</p>
          <input className="wc-input" type="file" accept="image/*" onChange={onPickImage} />
          <input className="wc-input" placeholder="Short description" value={form.short_description} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} />
          <textarea className="wc-input min-h-24" placeholder="Full description" value={form.full_description} onChange={(event) => setForm((current) => ({ ...current, full_description: event.target.value }))} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="wc-input" placeholder="Price / access type" value={form.price_or_access_type} onChange={(event) => setForm((current) => ({ ...current, price_or_access_type: event.target.value }))} />
            <input className="wc-input" placeholder="Product link / download URL" value={form.product_link} onChange={(event) => setForm((current) => ({ ...current, product_link: event.target.value }))} />
          </div>
          <input className="wc-input" placeholder="Features (comma separated)" value={form.features} onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))} />
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="wc-input" value={form.badge} onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}>
              <option value="premium">Premium</option>
              <option value="hot">Hot</option>
              <option value="new">New</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
            <select className="wc-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input className="wc-input" type="number" placeholder="Display order" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
          </div>

          <div className="flex gap-2">
            <button disabled={saving} className="wc-primary-btn flex-1">{saving ? "Saving..." : editingId ? "Update" : "Create"}</button>
            {editingId ? <button type="button" onClick={resetForm} className="wc-secondary-btn">Cancel</button> : null}
          </div>
        </form> : (
          <section className="wc-card p-4">
            <h2 className="text-base font-bold text-on-surface">{canEdit || canDelete ? "Product actions" : "Read-only product access"}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{productAccessMessage}</p>
          </section>
        )}

        <section className="wc-card overflow-hidden">
          <div className="grid gap-2 border-b border-outline-variant/50 bg-surface-container-low p-3 md:grid-cols-4">
            <input className="wc-input" placeholder="Search product name" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="wc-input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All Categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            <select className="wc-input" value={badgeFilter} onChange={(event) => setBadgeFilter(event.target.value)}><option value="all">All Badges</option><option value="premium">Premium</option><option value="hot">Hot</option><option value="new">New</option><option value="free">Free</option><option value="paid">Paid</option></select>
            <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </div>

          {filtered.length === 0 ? <div className="p-4"><EmptyState title="No products found" description="Try changing filters." icon="inventory_2" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Badge</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-surface-container">
                          {(row.image_cdn_url ?? row.image_url) ? <Image src={normalizeImageUrl(row.image_cdn_url ?? row.image_url ?? "") ?? row.image_cdn_url ?? row.image_url ?? ""} alt={row.name} width={40} height={40} unoptimized className="h-full w-full object-cover" /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-sm font-bold text-on-surface">{row.name}</p><p className="text-xs text-on-surface-variant line-clamp-1">{row.short_description ?? "-"}</p></td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.category}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary">{row.badge}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}>{row.status}</span></td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-2"><Link className="rounded-lg bg-surface-container p-2 text-primary" href="/products" title="View"><Icon name="visibility" /></Link>{canEdit ? <button className="rounded-lg bg-surface-container p-2 text-primary" onClick={() => startEdit(row)} title="Edit"><Icon name="edit" /></button> : null}{canDelete ? <button className="rounded-lg bg-error-container p-2 text-error" onClick={() => deleteRow(row.id)} title="Delete"><Icon name="delete" /></button> : null}</div></td>
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





