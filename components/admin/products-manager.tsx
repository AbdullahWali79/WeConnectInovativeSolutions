"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as XLSX from "xlsx";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Product, Profile } from "@/lib/supabase/types";
import { normalizeImageUrl } from "@/lib/image-url";
import { formatDate } from "@/lib/utils";


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
  gallery_urls: [""],
  related_links: [""],
  features: "",
  status: "active",
  display_order: "0",
};

function excelText(value: string | null | undefined) {
  const text = value ?? "";
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function ProductsManager({
  currentRole = "admin",
  permissions = [],
  defaultWhatsAppNumber = "923270728950",
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
  defaultWhatsAppNumber?: string;
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
  const [formOpen, setFormOpen] = useState(false);
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
    setFormOpen(true);
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
      gallery_urls: row.gallery_urls?.length ? row.gallery_urls : [row.image_url ?? ""],
      related_links: row.related_links?.length ? row.related_links : row.product_link ? [row.product_link] : [""],
      features: (row.features ?? []).join(", "),
      status: row.status,
      display_order: String(row.display_order ?? 0),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
    setFormOpen(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...defaultForm, product_link: `https://wa.me/${defaultWhatsAppNumber.replace(/\D/g, "")}`, gallery_urls: [""], related_links: [""] });
    setFormOpen(true);
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
    const galleryUrls = form.gallery_urls.map((value) => normalizeImageUrl(value)).filter((value): value is string => Boolean(value));
    const relatedLinks = form.related_links.map((value) => value.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      image_url: galleryUrls[0] ?? normalizeImageUrl(form.image_url),
      image_github_path: form.image_github_path || null,
      image_github_url: form.image_github_url || null,
      image_cdn_url: form.image_cdn_url || null,
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      price_or_access_type: form.price_or_access_type.trim() || null,
      badge: form.badge,
      product_link: `https://wa.me/${defaultWhatsAppNumber.replace(/\D/g, "")}`,
      gallery_urls: galleryUrls,
      related_links: relatedLinks,
      features: form.features.trim() ? form.features.split(",").map((item) => item.trim()).filter(Boolean) : [],
      status: form.status,
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    const request = editingId ? supabase.from("products").update(payload).eq("id", editingId) : supabase.from("products").insert(payload);
    let { error } = await request;

    if (error && /image_github_path|image_github_url|image_cdn_url|related_links|column/i.test(error.message)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.image_github_path;
      delete fallbackPayload.image_github_url;
      delete fallbackPayload.image_cdn_url;
      delete fallbackPayload.related_links;
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

  function downloadProducts() {
    if (rows.length === 0) {
      setToast({ type: "error", message: "There are no products to download." });
      return;
    }

    const productsSheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
      "Product ID": row.id,
      "Product Name": excelText(row.name),
      Category: excelText(row.category),
      "Short Description": excelText(row.short_description),
      "Full Description": excelText(row.full_description),
      "Price / Access": excelText(row.price_or_access_type),
      Badge: row.badge,
      Status: row.status,
      Features: (row.features ?? []).map(excelText).join(", "),
      "Cover Image URL": excelText(row.image_cdn_url ?? row.image_url),
      "Public Access Link": excelText(row.product_link),
      "Student Name": excelText(row.student_name),
      "Source Project ID": row.source_project_id ?? "",
      "Display Order": row.display_order,
      "Created At": formatDate(row.created_at),
      "Updated At": formatDate(row.updated_at),
    })));
    productsSheet["!cols"] = [
      { wch: 38 }, { wch: 38 }, { wch: 22 }, { wch: 48 }, { wch: 70 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 45 }, { wch: 60 },
      { wch: 48 }, { wch: 24 }, { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    ];

    const imageRows = rows.flatMap((row) => {
      const urls = row.gallery_urls?.length
        ? row.gallery_urls
        : [row.image_cdn_url ?? row.image_url].filter((url): url is string => Boolean(url));
      return urls.map((url, index) => ({
        "Product ID": row.id,
        "Product Name": excelText(row.name),
        "Image Number": index + 1,
        "Image URL": excelText(url),
        "Cover Image": index === 0 ? "Yes" : "No",
      }));
    });
    const imagesSheet = XLSX.utils.json_to_sheet(imageRows.length ? imageRows : [{ "Product ID": "", "Product Name": "No image links", "Image Number": "", "Image URL": "", "Cover Image": "" }]);
    imagesSheet["!cols"] = [{ wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 70 }, { wch: 14 }];

    const relatedLinkRows = rows.flatMap((row) => (row.related_links ?? []).map((url, index) => ({
      "Product ID": row.id,
      "Product Name": excelText(row.name),
      "Link Number": index + 1,
      "Private Related Link": excelText(url),
    })));
    const linksSheet = XLSX.utils.json_to_sheet(relatedLinkRows.length ? relatedLinkRows : [{ "Product ID": "", "Product Name": "No private links", "Link Number": "", "Private Related Link": "" }]);
    linksSheet["!cols"] = [{ wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 70 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
    XLSX.utils.book_append_sheet(workbook, imagesSheet, "Product Images");
    XLSX.utils.book_append_sheet(workbook, linksSheet, "Private Links");

    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `weconnect-products-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    setToast({ type: "success", message: `${rows.length} products downloaded in Excel format.` });
  }

  if (loading) return <LoadingState label="Loading products..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Products"
        title="Manage products"
        description="Create and maintain digital products shown in the public Products catalog."
        action={<div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadProducts} className="wc-secondary-btn text-sm"><Icon name="download" /> Download Products</button>
          {canCreate ? <button type="button" onClick={startCreate} className="wc-primary-btn text-sm"><Icon name="add" /> Add Product</button> : null}
          <Link href="/products" className="wc-secondary-btn text-sm"><Icon name="preview" /> View Products</Link>
        </div>}
      />

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

      {formOpen ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) resetForm(); }}>
        <form onSubmit={saveRow} className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4 sm:px-6">
            <div>
              <p className="wc-label">Product Catalog</p>
              <h2 className="mt-1 text-xl font-black text-on-surface">{editingId ? "Edit Product" : "Add Product"}</h2>
            </div>
            <button type="button" onClick={resetForm} disabled={saving} className="grid h-10 w-10 place-items-center rounded-lg bg-surface-container text-on-surface" title="Close"><Icon name="close" /></button>
          </div>

          <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
            <label><span className="wc-label">Product name</span><input className="wc-input mt-2" placeholder="Product name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label><span className="wc-label">Category</span><input className="wc-input mt-2" list="product-category-options" placeholder="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required /><datalist id="product-category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
            <div className="sm:col-span-2">
              <span className="wc-label">Product images</span>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Add direct image or public Google Drive URLs. All images appear in the public product slider; the first image is the cover.</p>
              <div className="mt-2 grid gap-2">
                {form.gallery_urls.map((url, index) => <div key={index} className="flex gap-2">
                  <input className="wc-input flex-1" type="url" placeholder={`Image URL ${index + 1}`} value={url} onChange={(event) => setForm((current) => ({ ...current, gallery_urls: current.gallery_urls.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />
                  {form.gallery_urls.length > 1 ? <button type="button" className="wc-secondary-btn px-3" title="Remove image" onClick={() => setForm((current) => ({ ...current, gallery_urls: current.gallery_urls.filter((_, itemIndex) => itemIndex !== index) }))}><Icon name="delete" /></button> : null}
                </div>)}
              </div>
              <button type="button" className="wc-secondary-btn mt-2 text-sm" onClick={() => setForm((current) => ({ ...current, gallery_urls: [...current.gallery_urls, ""] }))}><Icon name="add" /> Add Image</button>
            </div>
            <label className="sm:col-span-2"><span className="wc-label">Short description</span><input className="wc-input mt-2" placeholder="Short description" value={form.short_description} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} /></label>
            <label className="sm:col-span-2"><span className="wc-label">Full description</span><textarea className="wc-input mt-2 min-h-40" placeholder="Full description" value={form.full_description} onChange={(event) => setForm((current) => ({ ...current, full_description: event.target.value }))} /><span className="mt-2 block text-xs leading-5 text-on-surface-variant">Formatting is automatic for headings, lists, and pasted tables.</span></label>
            <label><span className="wc-label">Price / access</span><input className="wc-input mt-2" placeholder="Price / access type" value={form.price_or_access_type} onChange={(event) => setForm((current) => ({ ...current, price_or_access_type: event.target.value }))} /></label>
            <div><span className="wc-label">Public access destination</span><div className="wc-input mt-2 flex items-center gap-2 bg-surface-container-low"><Icon name="chat" /> WhatsApp: +{defaultWhatsAppNumber.replace(/\D/g, "")}</div><span className="mt-2 block text-xs leading-5 text-on-surface-variant">Change this number from Admin Settings → WhatsApp Alerts. Every public product inquiry uses it automatically.</span></div>
            <div className="sm:col-span-2 rounded-xl border border-outline-variant p-4">
              <span className="wc-label">Private client links</span>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Save YouTube, demo, download, Google Drive, documentation, or other URLs here. These links never appear on the public Products page.</p>
              <div className="mt-3 grid gap-2">
                {form.related_links.map((url, index) => <div key={index} className="flex gap-2">
                  <input className="wc-input flex-1" type="url" placeholder={`Private related link ${index + 1}`} value={url} onChange={(event) => setForm((current) => ({ ...current, related_links: current.related_links.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />
                  <button type="button" className="wc-secondary-btn px-3" title="Copy link" disabled={!url.trim()} onClick={async () => { await navigator.clipboard.writeText(url.trim()); setToast({ type: "success", message: "Link copied." }); }}><Icon name="content_copy" /></button>
                  {form.related_links.length > 1 ? <button type="button" className="wc-secondary-btn px-3" title="Remove link" onClick={() => setForm((current) => ({ ...current, related_links: current.related_links.filter((_, itemIndex) => itemIndex !== index) }))}><Icon name="delete" /></button> : null}
                </div>)}
              </div>
              <button type="button" className="wc-secondary-btn mt-2 text-sm" onClick={() => setForm((current) => ({ ...current, related_links: [...current.related_links, ""] }))}><Icon name="add" /> Add Private Link</button>
            </div>
            <label className="sm:col-span-2"><span className="wc-label">Features</span><input className="wc-input mt-2" placeholder="Features (comma separated)" value={form.features} onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))} /></label>
            <label><span className="wc-label">Badge</span><select className="wc-input mt-2" value={form.badge} onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}><option value="premium">Premium</option><option value="hot">Hot</option><option value="new">New</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
            <label><span className="wc-label">Status</span><select className="wc-input mt-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label><span className="wc-label">Display order</span><input className="wc-input mt-2" type="number" placeholder="Display order" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} /></label>
          </div>

          <div className="flex justify-end gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6">
            <button type="button" onClick={resetForm} disabled={saving} className="wc-secondary-btn">Cancel</button>
            <button disabled={saving} className="wc-primary-btn"><Icon name="save" /> {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}</button>
          </div>
        </form>
      </div> : null}
    </>
  );
}
