"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { uploadFileToGithubCdn } from "@/lib/media/client-upload";
import { EmptyState } from "@/components/empty-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SoftwareHouse } from "@/lib/supabase/types";
import {
  createSoftwareHouse,
  updateSoftwareHouse,
  deleteSoftwareHouse,
  type SoftwareHouseInput,
} from "@/app/admin/actions";

function buildDefault(): SoftwareHouseInput {
  return {
    name: "",
    tagline: "",
    logo_url: "",
    watermark_url: "",
    website_url: "",
    facebook_url: "",
    phone: "",
    phone2: "",
    email: "",
    address: "",
    hr_manager_name: "",
    ceo_name: "",
    header_color1: "#1e40af",
    header_color2: "#92400e",
    is_active: true,
    display_order: 0,
  };
}

function fromHouse(h: SoftwareHouse): SoftwareHouseInput {
  return {
    name: h.name,
    tagline: h.tagline ?? "",
    logo_url: h.logo_url ?? "",
    watermark_url: h.watermark_url ?? "",
    website_url: h.website_url ?? "",
    facebook_url: h.facebook_url ?? "",
    phone: h.phone ?? "",
    phone2: h.phone2 ?? "",
    email: h.email ?? "",
    address: h.address ?? "",
    hr_manager_name: h.hr_manager_name ?? "",
    ceo_name: h.ceo_name ?? "",
    header_color1: h.header_color1 ?? "#1e40af",
    header_color2: h.header_color2 ?? "#92400e",
    is_active: h.is_active,
    display_order: h.display_order,
  };
}

type UploadField = "logo_url" | "watermark_url";

export function SoftwareHousesManager() {
  const supabase = createSupabaseBrowserClient();
  const [houses, setHouses] = useState<SoftwareHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SoftwareHouse | null>(null);
  const [form, setForm] = useState<SoftwareHouseInput>(buildDefault());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const logoRef = useRef<HTMLInputElement>(null);
  const watermarkRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("software_houses")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) setToast({ type: "error", message: error.message });
    setHouses((data as SoftwareHouse[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(buildDefault());
    setShowForm(true);
  }

  function openEdit(h: SoftwareHouse) {
    setEditing(h);
    setForm(fromHouse(h));
    setShowForm(true);
  }

  function update<K extends keyof SoftwareHouseInput>(k: K, v: SoftwareHouseInput[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleUpload(field: UploadField, file: File) {
    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", message: "Please upload an image file." });
      return;
    }
    setUploading(field);
    try {
      const upload = await uploadFileToGithubCdn(file, "software_house");
      const nextForm = { ...form, [field]: upload.githubCdnUrl };
      setForm(nextForm);

      if (editing) {
        const result = await updateSoftwareHouse(editing.id, nextForm);
        if (!result.success) throw new Error(result.error ?? "Uploaded image could not be saved.");
        setHouses((prev) => prev.map((house) => house.id === editing.id ? { ...house, [field]: upload.githubCdnUrl } : house));
        setEditing((current) => current ? { ...current, [field]: upload.githubCdnUrl } : current);
      }

      const label = field === "logo_url" ? "Logo" : "Watermark";
      setToast({ type: "success", message: editing ? `${label} uploaded and saved.` : `${label} uploaded. Click Add Software House to save it.` });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setUploading(null);
    }
  }
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editing
      ? await updateSoftwareHouse(editing.id, form)
      : await createSoftwareHouse(form);
    setSaving(false);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save." });
      return;
    }
    setToast({ type: "success", message: editing ? "Updated successfully!" : "Software house added!" });
    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this software house? This cannot be undone.")) return;
    setDeletingId(id);
    const result = await deleteSoftwareHouse(id);
    setDeletingId(null);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to delete." });
    } else {
      setToast({ type: "success", message: "Deleted." });
      setHouses((prev) => prev.filter((h) => h.id !== id));
    }
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />

      <PageHeader
        eyebrow="Settings"
        title="Software Houses"
        description="Add and manage software houses. Select one when generating internship letters."
        action={
          <button onClick={openAdd} className="wc-primary-btn px-4 py-2 text-sm">
            <Icon name="add_business" className="text-base" />
            Add Software House
          </button>
        }
      />

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onSubmit={handleSave}
              className="my-8 w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="wc-card overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-outline-variant/70 bg-primary/5 p-4">
                  <div>
                    <p className="wc-label">Software House</p>
                    <h2 className="font-bold text-on-surface">{editing ? "Edit Details" : "Add New Software House"}</h2>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-container">
                    <Icon name="close" className="text-on-surface-variant" />
                  </button>
                </div>

                <div className="space-y-5 p-5">
                  {/* Logo & Watermark Upload */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                      <Icon name="image" className="text-base" /> Logo & Watermark
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(["logo_url", "watermark_url"] as UploadField[]).map((field) => {
                        const label = field === "logo_url" ? "Company Logo" : "Watermark Image";
                        const ref = field === "logo_url" ? logoRef : watermarkRef;
                        const url = form[field];
                        return (
                          <div key={field}>
                            <p className="wc-label mb-2">{label}</p>
                            <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-outline-variant/70 bg-surface-container/50">
                              {url ? (
                                <Image src={url} alt={label} fill className="object-contain p-2" unoptimized />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                                  <Icon name="cloud_upload" className="text-2xl" />
                                  <p className="text-xs">No image</p>
                                </div>
                              )}
                              {uploading === field && (
                                <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <input
                                ref={ref}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(field, f); }}
                              />
                              <button
                                type="button"
                                onClick={() => ref.current?.click()}
                                disabled={uploading === field}
                                className="wc-primary-btn flex-1 px-3 py-1.5 text-xs"
                              >
                                <Icon name="upload" className="text-xs" />
                                {url ? "Replace" : "Upload"}
                              </button>
                              {url && (
                                <button type="button" onClick={() => update(field, "")} className="rounded-lg px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                  <Icon name="delete" className="text-xs" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Basic Info */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                      <Icon name="business" className="text-base" /> Company Info
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="wc-label mb-1">Company Name *</label>
                        <input className="wc-input w-full" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. NesterSky Technologies" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="wc-label mb-1">Tagline / Slogan</label>
                        <input className="wc-input w-full" value={form.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="e.g. Think in New Dimension" />
                      </div>
                      <div>
                        <label className="wc-label mb-1">Website URL</label>
                        <input className="wc-input w-full" type="url" value={form.website_url} onChange={(e) => update("website_url", e.target.value)} placeholder="https://example.com" />
                      </div>
                      <div>
                        <label className="wc-label mb-1">Facebook Page URL</label>
                        <input className="wc-input w-full" type="url" value={form.facebook_url} onChange={(e) => update("facebook_url", e.target.value)} placeholder="https://facebook.com/page" />
                      </div>
                      <div>
                        <label className="wc-label mb-1">Phone 1</label>
                        <input className="wc-input w-full" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="0329-9333306" />
                      </div>
                      <div>
                        <label className="wc-label mb-1">Phone 2</label>
                        <input className="wc-input w-full" value={form.phone2} onChange={(e) => update("phone2", e.target.value)} placeholder="0304-6888879" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="wc-label mb-1">Email</label>
                        <input className="wc-input w-full" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="nestersky.ns@gmail.com" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="wc-label mb-1">Address</label>
                        <input className="wc-input w-full" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="094, Azam Block, Jazac City, Lahore" />
                      </div>
                    </div>
                  </section>

                  {/* Signatories */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                      <Icon name="draw" className="text-base" /> Signatories
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="wc-label mb-1">HR Manager Name</label>
                        <input className="wc-input w-full" value={form.hr_manager_name} onChange={(e) => update("hr_manager_name", e.target.value)} placeholder="HR Manager Name" />
                      </div>
                      <div>
                        <label className="wc-label mb-1">CEO / Director Name</label>
                        <input className="wc-input w-full" value={form.ceo_name} onChange={(e) => update("ceo_name", e.target.value)} placeholder="CEO Name" />
                      </div>
                    </div>
                  </section>

                  {/* Header Colors */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                      <Icon name="palette" className="text-base" /> Letter Header Colors
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="wc-label mb-1">Primary Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={form.header_color1} onChange={(e) => update("header_color1", e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-outline-variant" />
                          <input className="wc-input flex-1" value={form.header_color1} onChange={(e) => update("header_color1", e.target.value)} placeholder="#1e40af" />
                        </div>
                      </div>
                      <div>
                        <label className="wc-label mb-1">Secondary Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={form.header_color2} onChange={(e) => update("header_color2", e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-outline-variant" />
                          <input className="wc-input flex-1" value={form.header_color2} onChange={(e) => update("header_color2", e.target.value)} placeholder="#92400e" />
                        </div>
                      </div>
                    </div>
                    {/* Color Preview Bar */}
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full" style={{ background: `linear-gradient(to right, ${form.header_color1}, ${form.header_color2})` }} />
                  </section>

                  {/* Order */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="wc-label mb-1">Display Order</label>
                      <input className="wc-input w-full" type="number" min={0} value={form.display_order} onChange={(e) => update("display_order", Number(e.target.value))} />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 pt-5">
                      <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span className="text-sm font-bold text-on-surface">Active</span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-outline-variant/70 px-5 py-4">
                  <button type="button" onClick={() => setShowForm(false)} className="wc-secondary-btn px-4 py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="wc-primary-btn px-6 py-2 text-sm">
                    <Icon name={saving ? "hourglass_empty" : "save"} className="text-base" />
                    {saving ? "Saving..." : editing ? "Update" : "Add Software House"}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="wc-card overflow-hidden">
        <div className="border-b border-outline-variant/70 p-4">
          <p className="wc-label">All Software Houses</p>
          <h2 className="mt-1 font-bold text-on-surface">{houses.length} registered</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : houses.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No software houses yet" description="Click 'Add Software House' to get started." icon="business" />
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {houses.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                {/* Logo */}
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container">
                  {h.logo_url ? (
                    <Image src={h.logo_url} alt={h.name} fill className="object-contain p-1" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Icon name="business" className="text-2xl text-on-surface-variant" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-on-surface">{h.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${h.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-surface-container text-on-surface-variant"}`}>
                      {h.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {h.tagline && <p className="text-xs text-on-surface-variant">{h.tagline}</p>}
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {[h.phone, h.phone2, h.email].filter(Boolean).join(" · ")}
                  </p>
                  {/* Color Bar */}
                  <div className="mt-1.5 h-1.5 w-16 rounded-full" style={{ background: `linear-gradient(to right, ${h.header_color1 ?? "#1e40af"}, ${h.header_color2 ?? "#92400e"})` }} />
                </div>

                {/* Watermark preview */}
                {h.watermark_url && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg opacity-60">
                    <Image src={h.watermark_url} alt="Watermark" fill className="object-contain" unoptimized />
                  </div>
                )}

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(h)} className="wc-secondary-btn px-3 py-1.5 text-xs">
                    <Icon name="edit" className="text-xs" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    disabled={deletingId === h.id}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <Icon name="delete" className="text-xs" />
                    {deletingId === h.id ? "..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

