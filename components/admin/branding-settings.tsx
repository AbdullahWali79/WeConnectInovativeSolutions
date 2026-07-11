"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { brandingToCssVars } from "@/lib/branding-settings";
import type { BrandingScope, BrandingSettingsSnapshot } from "@/lib/supabase/types";
import { saveBrandingSettings, uploadBrandingLogo } from "@/app/admin/actions";

type BrandingMap = Record<BrandingScope, BrandingSettingsSnapshot>;

type ScopeState = {
  backgroundColor: string;
  surfaceColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const scopeMeta: Record<BrandingScope, { title: string; description: string; icon: string }> = {
  landing: {
    title: "Landing Page",
    description: "Controls the public homepage and marketing pages.",
    icon: "public",
  },
  admin: {
    title: "Admin Panel",
    description: "Controls the admin dashboard and management screens.",
    icon: "admin_panel_settings",
  },
  student: {
    title: "Student Panel",
    description: "Controls the student dashboard and learning pages.",
    icon: "school",
  },
};

const brandingScopes: BrandingScope[] = ["landing", "admin", "student"];

export function BrandingSettings({ initialSettings }: { initialSettings: BrandingMap }) {
  const [settings, setSettings] = useState<BrandingMap>(initialSettings);
  const [savingScope, setSavingScope] = useState<BrandingScope | "shared" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sharedLogoUrl = useMemo(() => {
    return settings.landing.logo_url ?? settings.admin.logo_url ?? settings.student.logo_url ?? "";
  }, [settings]);

  const formState = useMemo<Record<BrandingScope, ScopeState>>(
    () =>
      Object.fromEntries(
        brandingScopes.map((scope) => [
          scope,
          {
            backgroundColor: settings[scope].background_color,
            surfaceColor: settings[scope].surface_color,
            primaryColor: settings[scope].primary_color,
            secondaryColor: settings[scope].secondary_color,
            accentColor: settings[scope].accent_color,
          },
        ]),
      ) as Record<BrandingScope, ScopeState>,
    [settings],
  );

  async function uploadSharedLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", message: "Please upload an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: "error", message: "Logo must be under 5 MB." });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResult = await uploadBrandingLogo(formData);
      if (!uploadResult.success) {
        setToast({ type: "error", message: uploadResult.error ?? "Logo upload failed." });
        return;
      }

      const publicUrl = uploadResult.data.publicUrl;
      const landing = settings.landing;

      setSavingScope("shared");
      const result = await saveBrandingSettings(
        "landing",
        {
          logoUrl: publicUrl,
          backgroundColor: landing.background_color,
          surfaceColor: landing.surface_color,
          primaryColor: landing.primary_color,
          secondaryColor: landing.secondary_color,
          accentColor: landing.accent_color,
        },
        true,
      );

      if (!result.success) {
        setToast({ type: "error", message: result.error ?? "Logo uploaded, but save failed." });
        return;
      }

      setSettings((prev) => {
        const next = { ...prev } as BrandingMap;
        brandingScopes.forEach((scope) => {
          next[scope] = {
            ...prev[scope],
            logo_url: publicUrl,
          };
        });
        return next;
      });

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setToast({ type: "success", message: "Shared logo uploaded and applied everywhere." });
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Logo upload failed unexpectedly.",
      });
    } finally {
      setSavingScope(null);
      setUploading(false);
    }
  }

  function updateField(scope: BrandingScope, key: keyof ScopeState, value: string) {
    setSettings((current) => ({
      ...current,
      [scope]: {
        ...current[scope],
        [key]: value,
      },
    }));
  }

  async function saveScope(scope: BrandingScope) {
    setSavingScope(scope);

    try {
      const current = settings[scope];
      const result = await saveBrandingSettings(scope, {
        logoUrl: sharedLogoUrl,
        backgroundColor: current.background_color,
        surfaceColor: current.surface_color,
        primaryColor: current.primary_color,
        secondaryColor: current.secondary_color,
        accentColor: current.accent_color,
      });

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setSettings((prev) => ({
        ...prev,
        [scope]: result.data,
      }));

      setToast({ type: "success", message: `${scopeMeta[scope].title} colors saved.` });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to save branding." });
    } finally {
      setSavingScope(null);
    }
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="Settings"
        title="Branding and color schemes"
        description="Upload one shared logo for the whole app, then fine-tune colors separately for landing, admin, and student areas."
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-bold text-on-surface">Shared logo behavior</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Upload the logo once here. It will be used on the public site, admin panel, and student panel, while color themes stay independent.
          </p>
        </div>

        <section className="wc-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-outline-variant/70 bg-primary/5 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-outline-variant/70 bg-white">
                {sharedLogoUrl ? (
                  <Image src={sharedLogoUrl} alt="Shared logo" fill className="object-contain p-2" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-on-surface-variant">No logo</div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Shared logo</p>
                <h2 className="mt-1 text-lg font-black text-on-surface">Upload once, use everywhere</h2>
                <p className="mt-1 text-sm text-on-surface-variant">PNG or JPG under 5 MB. A square logo works best across sidebar and header layouts.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadSharedLogo(file);
                  }
                }}
              />
              <button type="button" className="wc-secondary-btn px-4 py-2 text-sm" onClick={() => fileRef.current?.click()}>
                <Icon name={uploading ? "hourglass_empty" : "upload"} className="text-base" />
                {sharedLogoUrl ? "Replace logo" : "Upload logo"}
              </button>
            </div>
          </div>

          <div className="p-5">
            <p className="text-sm text-on-surface-variant">
              Current logo is applied to all scopes: landing, admin, and student.
            </p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          {brandingScopes.map((scope) => (
            <ScopeCard
              key={scope}
              scope={scope}
              state={formState[scope]}
              logoUrl={sharedLogoUrl || null}
              updating={savingScope === scope}
              onChange={(key, value) => updateField(scope, key, value)}
              onSave={() => void saveScope(scope)}
            />
          ))}
        </div>
      </motion.div>
    </>
  );
}

function ScopeCard({
  scope,
  state,
  logoUrl,
  updating,
  onChange,
  onSave,
}: {
  scope: BrandingScope;
  state: ScopeState;
  logoUrl: string | null;
  updating: boolean;
  onChange: (key: keyof ScopeState, value: string) => void;
  onSave: () => void;
}) {
  const meta = scopeMeta[scope];
  const livePreview = brandingToCssVars({
    id: null,
    scope,
    logo_url: logoUrl,
    background_color: state.backgroundColor,
    surface_color: state.surfaceColor,
    primary_color: state.primaryColor,
    secondary_color: state.secondaryColor,
    accent_color: state.accentColor,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
  });

  return (
    <section className="wc-card overflow-hidden">
      <div className="border-b border-outline-variant/70 bg-primary/5 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name={meta.icon} className="text-xl" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-on-surface">{meta.title}</h2>
            <p className="text-sm text-on-surface-variant">{meta.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Background" value={state.backgroundColor} onChange={(value) => onChange("backgroundColor", value)} />
          <ColorField label="Surface" value={state.surfaceColor} onChange={(value) => onChange("surfaceColor", value)} />
          <ColorField label="Primary" value={state.primaryColor} onChange={(value) => onChange("primaryColor", value)} />
          <ColorField label="Secondary" value={state.secondaryColor} onChange={(value) => onChange("secondaryColor", value)} />
          <ColorField label="Accent" value={state.accentColor} onChange={(value) => onChange("accentColor", value)} />
        </div>

        <div className="rounded-xl border border-outline-variant/70 p-4" style={livePreview}>
          <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Preview</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white">
                {logoUrl ? <Image src={logoUrl} alt={`${meta.title} preview logo`} fill className="object-contain p-1" unoptimized /> : null}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Primary actions</p>
                <p className="text-xs text-on-surface-variant">This preview uses the shared logo plus selected palette.</p>
              </div>
            </div>
            <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold" style={{ backgroundColor: "var(--wc-primary)", color: "var(--wc-on-primary)" }}>
              Button
            </button>
          </div>
        </div>

        <button type="button" onClick={onSave} disabled={updating} className="wc-primary-btn w-full">
          <Icon name={updating ? "hourglass_empty" : "save"} className="text-base" />
          {updating ? "Saving..." : `Save ${meta.title} colors`}
        </button>
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="wc-label">{label}</span>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-outline-variant/70 bg-white px-3 py-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 rounded-md border border-outline-variant/70 bg-transparent p-0"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-on-surface outline-none"
          spellCheck={false}
        />
      </div>
    </label>
  );
}
