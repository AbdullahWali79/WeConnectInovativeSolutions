"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteService, getAdminServices, saveService, type ServiceInput } from "@/app/admin/services/actions";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { serviceSlug } from "@/lib/services";
import type { Service } from "@/lib/supabase/types";

const icons = ["design_services", "language", "shopping_cart", "smartphone", "auto_awesome", "campaign", "draw", "science", "school", "cloud", "analytics", "support_agent"];
const emptyForm = {
  title: "", slug: "", category: "", icon: "design_services", short_description: "", description: "",
  highlights: "", cta_label: "Discuss your project", cta_link: "/contact", featured: false, status: "active" as Service["status"], display_order: "0",
};

export function ServicesManager() {
  const [rows, setRows] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getAdminServices());
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Services could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => !term || `${row.title} ${row.category} ${row.short_description}`.toLowerCase().includes(term));
  }, [query, rows]);

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function edit(row: Service) {
    setEditingId(row.id);
    setForm({
      title: row.title, slug: row.slug, category: row.category, icon: row.icon,
      short_description: row.short_description, description: row.description,
      highlights: row.highlights.join("\n"), cta_label: row.cta_label, cta_link: row.cta_link,
      featured: row.featured, status: row.status, display_order: String(row.display_order),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const input: ServiceInput = {
      title: form.title, slug: form.slug, category: form.category, icon: form.icon,
      short_description: form.short_description, description: form.description,
      highlights: form.highlights.split("\n"), cta_label: form.cta_label, cta_link: form.cta_link,
      featured: form.featured, status: form.status, display_order: Number(form.display_order),
    };
    const result = await saveService(editingId, input);
    setSaving(false);
    if (!result.ok) return setToast({ type: "error", message: result.error ?? "Service could not be saved." });
    setToast({ type: "success", message: editingId ? "Service updated." : "Service created." });
    reset();
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this service permanently?")) return;
    const result = await deleteService(id);
    if (!result.ok) return setToast({ type: "error", message: result.error ?? "Service could not be deleted." });
    setToast({ type: "success", message: "Service deleted." });
    if (editingId === id) reset();
    await load();
  }

  if (loading) return <LoadingState label="Loading services..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader eyebrow="Company services" title="Manage services" description="Create and curate the capabilities shown on the public Services page." action={<Link href="/services" target="_blank" className="wc-secondary-btn"><Icon name="open_in_new" /> View page</Link>} />
      <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
        <form onSubmit={submit} className="wc-card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">{editingId ? "Edit service" : "Add service"}</h2>
            {editingId ? <button type="button" onClick={reset} className="wc-secondary-btn px-3 py-2 text-xs">Cancel</button> : null}
          </div>
          <div className="grid gap-3">
            <input className="wc-input" placeholder="Service title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: editingId ? current.slug : serviceSlug(event.target.value) }))} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="wc-input" placeholder="URL slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: serviceSlug(event.target.value) }))} required />
              <input className="wc-input" placeholder="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required />
            </div>
            <label>
              <span className="wc-label">Service icon</span>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {icons.map((icon) => <button key={icon} type="button" title={icon} onClick={() => setForm((current) => ({ ...current, icon }))} className={`grid aspect-square place-items-center rounded-xl border transition ${form.icon === icon ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-low text-on-surface hover:border-primary"}`}><Icon name={icon} className="text-xl" /></button>)}
              </div>
            </label>
            <textarea className="wc-input min-h-20" maxLength={180} placeholder="Short card description" value={form.short_description} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} required />
            <textarea className="wc-input min-h-32" placeholder="Full service description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
            <textarea className="wc-input min-h-24" placeholder={"Highlights — one per line\nWeb applications\nPerformance optimization"} value={form.highlights} onChange={(event) => setForm((current) => ({ ...current, highlights: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="wc-input" placeholder="CTA label" value={form.cta_label} onChange={(event) => setForm((current) => ({ ...current, cta_label: event.target.value }))} />
              <input className="wc-input" placeholder="/contact" value={form.cta_link} onChange={(event) => setForm((current) => ({ ...current, cta_link: event.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="wc-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Service["status"] }))}><option value="active">Active</option><option value="inactive">Inactive</option></select>
              <input className="wc-input" type="number" placeholder="Display order" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm font-bold"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /> Feature in hero</label>
          </div>
          <button disabled={saving} className="wc-primary-btn w-full">{saving ? "Saving..." : editingId ? "Update Service" : "Add Service"}</button>
        </form>

        <section className="wc-card overflow-hidden">
          <div className="border-b border-outline-variant bg-surface-container-low p-4"><input className="wc-input" placeholder="Search services..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          {filtered.length === 0 ? <div className="p-5"><EmptyState title="No services found" description="Add your first service or adjust the search." icon="design_services" /></div> : (
            <div className="divide-y divide-outline-variant">
              {filtered.map((row) => (
                <article key={row.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"><Icon name={row.icon} className="text-2xl" /></span>
                    <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{row.title}</h3>{row.featured ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">Featured</span> : null}<span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${row.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{row.status}</span></div><p className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">{row.category} · Order {row.display_order}</p><p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">{row.short_description}</p></div>
                  </div>
                  <div className="flex shrink-0 gap-2"><button onClick={() => edit(row)} className="wc-secondary-btn px-3 py-2 text-xs"><Icon name="edit" /> Edit</button><button onClick={() => void remove(row.id)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Icon name="delete" /> Delete</button></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
