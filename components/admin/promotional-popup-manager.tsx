"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import {
  createPromotionalPopup,
  deletePromotionalPopup,
  getPromotionalPopups,
  setPromotionalPopupActive,
  updatePromotionalPopup,
} from "@/app/admin/promotional-popups/actions";
import type { PermissionKey } from "@/lib/admin-permissions";
import { getGoogleDrivePreviewUrl, getYouTubeEmbedUrl, isDirectVideoUrl } from "@/lib/promo-media";
import type { Profile, PromotionalPopup } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

const initialForm = { title: "", message: "", image_url: "", show_on: "both" as PromotionalPopup["show_on"] };

function MediaPreview({ value, title }: { value: string; title: string }) {
  const youtubeUrl = getYouTubeEmbedUrl(value);
  const driveUrl = getGoogleDrivePreviewUrl(value);
  const directVideo = isDirectVideoUrl(value);

  if (!value.trim()) return null;

  if (youtubeUrl || driveUrl) {
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-outline-variant bg-black">
        <iframe
          src={youtubeUrl ?? driveUrl ?? undefined}
          title={`${title || "Promotion"} media preview`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (directVideo) {
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-outline-variant bg-black">
        <video src={value} controls playsInline className="aspect-video w-full object-contain">
          Your browser does not support this video.
        </video>
      </div>
    );
  }

  return (
    <div className="relative mt-3 aspect-video overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <Image src={value} alt={`${title || "Promotion"} preview`} fill sizes="420px" unoptimized className="object-contain" />
    </div>
  );
}

export function PromotionalPopupManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const canCreate = canUse("promotional_popups.create");
  const canEdit = canUse("promotional_popups.edit");
  const canDelete = canUse("promotional_popups.delete");
  const [popups, setPopups] = useState<PromotionalPopup[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getPromotionalPopups();
    if ("error" in result) setToast({ type: "error", message: result.error });
    setPopups(result.ok ? result.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function savePopup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canSave = editingId ? canEdit : canCreate;

    if (!canSave) {
      setToast({ type: "error", message: "You do not have permission to save promotional popups." });
      return;
    }
    if (!form.title.trim() || !form.message.trim()) {
      setToast({ type: "error", message: "Title and message are required." });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      image_url: form.image_url.trim() || null,
      show_on: form.show_on,
    };
    const result = editingId
      ? await updatePromotionalPopup(editingId, payload)
      : await createPromotionalPopup(payload);
    setSaving(false);
    if ("error" in result) {
      setToast({ type: "error", message: result.error });
      return;
    }
    setToast({ type: "success", message: editingId ? "Popup updated." : "Popup created." });
    setForm(initialForm);
    setEditingId(null);
    await loadData();
  }

  async function toggleActive(id: string, current: boolean) {
    if (!canEdit) {
      setToast({ type: "error", message: "You do not have permission to update promotional popups." });
      return;
    }
    const result = await setPromotionalPopupActive(id, !current);
    if ("error" in result) {
      setToast({ type: "error", message: result.error });
      return;
    }
    setToast({ type: "success", message: !current ? "Popup activated." : "Popup deactivated." });
    await loadData();
  }

  async function deletePopup(id: string) {
    if (!canDelete) {
      setToast({ type: "error", message: "You do not have permission to delete promotional popups." });
      return;
    }
    if (!confirm("Delete this promotional popup?")) return;
    const result = await deletePromotionalPopup(id);
    if ("error" in result) {
      setToast({ type: "error", message: result.error });
      return;
    }
    setToast({ type: "success", message: "Popup deleted." });
    await loadData();
  }

  function editPopup(popup: PromotionalPopup) {
    if (!canEdit) {
      setToast({ type: "error", message: "You do not have permission to edit promotional popups." });
      return;
    }
    setEditingId(popup.id);
    setForm({
      title: popup.title,
      message: popup.message,
      image_url: popup.image_url ?? "",
      show_on: popup.show_on,
    });
  }

  function previewPopup() {
    if (!form.title.trim() || !form.message.trim()) {
      setToast({ type: "info", message: "Enter title and message to preview." });
      return;
    }
    const preview: PromotionalPopup = {
      id: "preview",
      title: form.title,
      message: form.message,
      image_url: form.image_url.trim() || null,
      show_on: form.show_on,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Store preview in sessionStorage for the preview modal
    sessionStorage.setItem("promo_popup_preview", JSON.stringify(preview));
    window.open("/?preview_popup=1", "_blank");
  }

  if (loading) return <LoadingState label="Loading promotional popups..." />;

  const promotionAccessMessage = canEdit || canDelete
    ? "Use the action buttons in the list to manage promotional popups enabled for this account."
    : "You can view promotional popups, but create, edit, and delete actions are not enabled for this account.";

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Marketing"
        title="Promotional Popups"
        description="Create promotional popups with a public image or video and animated text. Popups appear on the landing page and/or student portal."
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
          {/* Form */}
          {(canCreate || editingId) ? <form onSubmit={savePopup} className="wc-card space-y-3 p-4">
            <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit popup" : "New promotional popup"}</h2>
            <label className="block">
              <span className="wc-label">Title (Animated)</span>
              <input className="wc-input mt-2" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. 🎉 50% OFF Summer Batch!" required />
            </label>
            <label className="block">
              <span className="wc-label">Message</span>
              <textarea className="wc-input mt-2 min-h-20" value={form.message} onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))} placeholder="Offer details, deadline, call-to-action..." required />
            </label>
            <label className="block">
              <span className="wc-label">Image or Video URL</span>
              <input className="wc-input mt-2" value={form.image_url} onChange={(e) => setForm((c) => ({ ...c, image_url: e.target.value }))} placeholder="YouTube, public video, image, or Google Drive URL" />
              <p className="mt-1 text-[10px] text-on-surface-variant">YouTube, public Google Drive image/video, image, and direct MP4/WebM links are supported.</p>
            </label>
            <MediaPreview value={form.image_url.trim()} title={form.title} />
            <label className="block">
              <span className="wc-label">Show On</span>
              <select className="wc-input mt-2" value={form.show_on} onChange={(e) => setForm((c) => ({ ...c, show_on: e.target.value as PromotionalPopup["show_on"] }))}>
                <option value="both">Both (Landing + Student Portal)</option>
                <option value="landing">Landing Page Only</option>
                <option value="student">Student Portal Only</option>
              </select>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={previewPopup} className="wc-secondary-btn flex-1">
                <Icon name="preview" className="text-base" /> Preview
              </button>
              <button disabled={saving} className="wc-primary-btn flex-1">{saving ? "Saving..." : editingId ? "Update" : "Publish"}</button>
            </div>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }} className="wc-secondary-btn w-full">Cancel</button> : null}
          </form> : (
            <section className="wc-card p-4">
              <h2 className="text-base font-bold text-on-surface">{canEdit || canDelete ? "Promotion actions" : "Read-only promotions"}</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{promotionAccessMessage}</p>
            </section>
          )}

          {/* List */}
          <div className="space-y-4">
            {popups.length === 0 ? (
              <EmptyState title="No popups yet" description="Create your first promotional popup to grab visitor attention." icon="campaign" />
            ) : (
              popups.map((popup) => (
                <motion.div key={popup.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="wc-card overflow-hidden p-4">
                  <div className="flex items-start gap-4">
                    {getYouTubeEmbedUrl(popup.image_url) || isDirectVideoUrl(popup.image_url) ? (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon name="play_circle" className="text-3xl" />
                      </div>
                    ) : popup.image_url ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={popup.image_url}
                          alt={popup.title}
                          width={80}
                          height={80}
                          unoptimized
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-container">
                        <Icon name="image" className="text-2xl text-on-surface-variant" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-on-surface">{popup.title}</h3>
                        {popup.is_active ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Inactive</span>
                        )}
                        <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">{popup.show_on}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-2">{popup.message}</p>
                      <p className="mt-1 text-[10px] text-on-surface-variant">{formatDateTime(popup.created_at)}</p>
                    </div>
                    {canEdit || canDelete ? <div className="flex gap-1.5">
                      {canEdit ? <button onClick={() => toggleActive(popup.id, popup.is_active)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary hover:bg-surface-container-high" title={popup.is_active ? "Deactivate" : "Activate"}>
                        <Icon name={popup.is_active ? "visibility" : "visibility_off"} className="text-base" />
                      </button> : null}
                      {canEdit ? <button onClick={() => editPopup(popup)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container p-2 text-primary hover:bg-surface-container-high" title="Edit">
                        <Icon name="edit" className="text-base" />
                      </button> : null}
                      {canDelete ? <button onClick={() => deletePopup(popup.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container p-2 text-error hover:bg-red-100" title="Delete">
                        <Icon name="delete" className="text-base" />
                      </button> : null}
                    </div> : null}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
