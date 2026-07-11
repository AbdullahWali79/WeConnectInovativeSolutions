"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { uploadFileToGithubCdn } from "@/lib/media/client-upload";
import { PageHeader } from "@/components/page-header";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { saveSignatureSettings } from "@/app/admin/actions";
import type { AdminSignatureSettings } from "@/lib/supabase/types";

type UploadSlot = "signature" | "stamp" | "hr_signature";

const SLOT_LABELS: Record<UploadSlot, { label: string; description: string; icon: string }> = {
  signature: {
    label: "CEO / Admin Signature",
    description: "Your official signature for internship letters (PNG with transparent background recommended)",
    icon: "draw",
  },
  stamp: {
    label: "Company Stamp / Seal",
    description: "Official company stamp or seal (transparent PNG works best)",
    icon: "verified",
  },
  hr_signature: {
    label: "HR Manager Signature",
    description: "HR Manager's signature for the left side of the letter",
    icon: "badge",
  },
};

export function SignatureSettings() {
  const supabase = createSupabaseBrowserClient();
  const [settings, setSettings] = useState<AdminSignatureSettings | null>(null);
  const [previews, setPreviews] = useState<Record<UploadSlot, string>>({
    signature: "",
    stamp: "",
    hr_signature: "",
  });
  const [uploading, setUploading] = useState<UploadSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const fileRefs = useRef<Record<UploadSlot, HTMLInputElement | null>>({
    signature: null,
    stamp: null,
    hr_signature: null,
  });

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("admin_signature_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const s = data as AdminSignatureSettings;
      setSettings(s);
      setPreviews({
        signature: s.signature_url ?? "",
        stamp: s.stamp_url ?? "",
        hr_signature: s.hr_signature_url ?? "",
      });
    }
  }, [supabase]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  async function handleFileChange(slot: UploadSlot, file: File) {
    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", message: "Please upload an image file (PNG, JPG, etc.)" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: "error", message: "File must be under 5 MB." });
      return;
    }

    setUploading(slot);

    let url = "";
    try {
      const upload = await uploadFileToGithubCdn(file, "signature");
      url = upload.githubCdnUrl;
    } catch (error) {
      setUploading(null);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Upload failed." });
      return;
    }

    const nextPreviews = { ...previews, [slot]: url };
    setPreviews(nextPreviews);

    const result = await saveSignatureSettings({
      signature_url: nextPreviews.signature,
      stamp_url: nextPreviews.stamp,
      hr_signature_url: nextPreviews.hr_signature,
    });

    setUploading(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Upload saved, but database sync failed." });
      return;
    }

    setSettings(result.data);
    setPreviews({
      signature: result.data.signature_url ?? "",
      stamp: result.data.stamp_url ?? "",
      hr_signature: result.data.hr_signature_url ?? "",
    });
    setToast({ type: "success", message: `${SLOT_LABELS[slot].label} uploaded and saved.` });
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveSignatureSettings({
      signature_url: previews.signature,
      stamp_url: previews.stamp,
      hr_signature_url: previews.hr_signature,
    });
    setSaving(false);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save." });
    } else {
      setSettings(result.data);
      setToast({ type: "success", message: "Signature settings saved! They will appear on new letters." });
    }
  }

  function clearSlot(slot: UploadSlot) {
    setPreviews((prev) => ({ ...prev, [slot]: "" }));
    if (fileRefs.current[slot]) fileRefs.current[slot]!.value = "";
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Settings"
        title="Digital Signature & Stamp"
        description="Upload your signature and company stamp. They will appear digitally on all internship completion letters."
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Icon name="info" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold text-on-surface">How it works</p>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              Uploaded signatures and stamps will automatically appear in the internship letter preview and downloaded PDF. 
              Use PNG files with transparent backgrounds for best results.
            </p>
          </div>
        </div>

        {/* Upload Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {(Object.keys(SLOT_LABELS) as UploadSlot[]).map((slot) => {
            const meta = SLOT_LABELS[slot];
            const preview = previews[slot];
            const isUploading = uploading === slot;

            return (
              <div key={slot} className="wc-card overflow-hidden">
                <div className="border-b border-outline-variant/70 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Icon name={meta.icon} className="text-primary" />
                    <p className="font-bold text-on-surface text-sm">{meta.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{meta.description}</p>
                </div>

                {/* Preview Area */}
                <div className="p-4">
                  <div
                    className={`relative mb-4 flex min-h-[140px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
                      preview
                        ? "border-primary/40 bg-primary/5"
                        : "border-outline-variant/70 bg-surface-container/50"
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {preview ? (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative h-32 w-full"
                        >
                          <Image
                            src={preview}
                            alt={meta.label}
                            fill
                            className="object-contain p-2"
                            unoptimized
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-2 py-4 text-on-surface-variant"
                        >
                          <Icon name="cloud_upload" className="text-3xl" />
                          <p className="text-xs">No image uploaded yet</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-xs font-bold text-primary">Uploading...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <input
                      ref={(el) => { fileRefs.current[slot] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFileChange(slot, f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileRefs.current[slot]?.click()}
                      className="wc-primary-btn flex-1 px-3 py-2 text-xs"
                    >
                      <Icon name="upload" className="text-sm" />
                      {preview ? "Replace" : "Upload"}
                    </button>
                    {preview && (
                      <button
                        type="button"
                        onClick={() => clearSlot(slot)}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <Icon name="delete" className="text-sm" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save */}
        <div className="wc-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-on-surface">Save Settings</p>
              <p className="text-xs text-on-surface-variant">
                {settings?.updated_at
                  ? `Last saved: ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.updated_at))}`
                  : "Not saved yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="wc-primary-btn px-6 py-2.5 text-sm"
            >
              <Icon name={saving ? "hourglass_empty" : "save"} className="text-base" />
              {saving ? "Saving..." : "Save Signature Settings"}
            </button>
          </div>
        </div>

        {/* Preview Sample */}
        {(previews.signature || previews.stamp || previews.hr_signature) && (
          <div className="wc-card overflow-hidden">
            <div className="border-b border-outline-variant/70 p-4">
              <p className="wc-label">Preview</p>
              <h3 className="mt-1 font-bold text-on-surface">How signatures will appear on letter footer</h3>
            </div>
            <div className="overflow-x-auto bg-white p-6">
              <div className="mx-auto flex max-w-lg items-end justify-between gap-6">
                {/* HR Signature */}
                <div className="flex flex-col items-center gap-1 text-center text-xs text-slate-900">
                  {previews.hr_signature ? (
                    <div className="relative h-16 w-28">
                      <Image src={previews.hr_signature} alt="HR Signature" fill className="object-contain" unoptimized />
                    </div>
                  ) : (
                    <div className="h-10 w-28 border-b border-slate-900" />
                  )}
                  <p className="font-bold">HR Manager</p>
                  <p>HR Manager Signature</p>
                </div>

                {/* Stamp */}
                {previews.stamp ? (
                  <div className="relative h-16 w-16">
                    <Image src={previews.stamp} alt="Stamp" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-14 w-16 items-center justify-center border border-dashed border-slate-900 text-[10px] text-slate-500">
                    Stamp
                  </div>
                )}

                {/* CEO Signature */}
                <div className="flex flex-col items-center gap-1 text-center text-xs text-slate-900">
                  {previews.signature ? (
                    <div className="relative h-16 w-28">
                      <Image src={previews.signature} alt="CEO Signature" fill className="object-contain" unoptimized />
                    </div>
                  ) : (
                    <div className="h-10 w-28 border-b border-slate-900" />
                  )}
                  <p className="font-bold">CEO</p>
                  <p>CEO Signature</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
