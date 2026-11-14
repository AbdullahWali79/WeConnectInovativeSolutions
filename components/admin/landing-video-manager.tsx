"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import {
  DEFAULT_LANDING_VIDEO_SETTINGS,
  parseVideoEmbed,
  type LandingVideoSettings,
} from "@/lib/landing-video";
import { saveLandingVideoSettingsAction } from "@/app/admin/settings/intro-video/actions";

export function LandingVideoManager({
  initialSettings,
}: {
  initialSettings: LandingVideoSettings;
}) {
  const [settings, setSettings] = useState<LandingVideoSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const parsedVideo = useMemo(() => parseVideoEmbed(settings.video_url), [settings.video_url]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await saveLandingVideoSettingsAction(settings);
    setSaving(false);

    if (res.success && res.settings) {
      setSettings(res.settings);
      setToast({ type: "success", message: "Intro video settings saved & landing page updated!" });
    } else {
      setToast({ type: "error", message: res.error || "Failed to save settings." });
    }
  }

  function handleResetUrl() {
    setSettings((prev) => ({
      ...prev,
      video_url: DEFAULT_LANDING_VIDEO_SETTINGS.video_url,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-on-surface sm:text-3xl">Landing Page Intro Video</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                settings.is_enabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-variant text-on-surface-variant border border-outline-variant"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  settings.is_enabled ? "bg-emerald-500 animate-pulse" : "bg-on-surface-variant/40"
                }`}
              />
              {settings.is_enabled ? "Visible on Landing Page" : "Hidden from Landing Page"}
            </span>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Control the intro/overview video displayed on the public homepage. Enable, disable, or replace the video URL anytime.
          </p>
        </div>

        <a
          href="/#intro-video"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-xs font-bold text-on-surface transition hover:bg-surface-container"
        >
          <Icon name="visibility" className="text-[16px]" /> Preview Homepage ↗
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6 lg:col-span-7">
          {/* Main Visibility Card */}
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <Icon name="toggle_on" className="text-primary text-xl" /> Display Control
            </h2>

            <label className="flex items-start gap-4 rounded-xl border border-outline-variant/60 bg-surface-lowest p-4 cursor-pointer hover:border-primary/40 transition">
              <input
                type="checkbox"
                checked={settings.is_enabled}
                onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                className="mt-1 h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <div className="space-y-1">
                <span className="text-sm font-bold text-on-surface block">
                  Show Intro Video on Landing Page
                </span>
                <span className="text-xs text-on-surface-variant block leading-relaxed">
                  When enabled, the video showcase will appear right below the hero section on the homepage and add a quick &quot;Watch Intro&quot; button in the hero area.
                </span>
              </div>
            </label>
          </div>

          {/* Video URL Card */}
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Icon name="smart_display" className="text-primary text-xl" /> Video Source URL
              </h2>
              <button
                type="button"
                onClick={handleResetUrl}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Reset to Default URL
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Video Link (Google Drive, YouTube, or direct MP4)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={settings.video_url}
                  onChange={(e) => setSettings({ ...settings, video_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/… or https://youtube.com/…"
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest py-3 pl-3.5 pr-10 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {settings.video_url && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, video_url: "" })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface text-sm p-1"
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
              <div className="mt-2.5 rounded-xl bg-surface-lowest p-3 text-xs text-on-surface-variant space-y-1">
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Icon name="info" className="text-sm text-primary" /> Supported Video Formats:
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  <li>
                    <strong className="text-on-surface">Google Drive:</strong> Any shared video file link (e.g. <code className="bg-surface px-1 py-0.5 rounded">https://drive.google.com/file/d/1HsJoWqo2Fd-EBlRwAHP5iFgWYrk-vV2o/view</code>)
                  </li>
                  <li>
                    <strong className="text-on-surface">YouTube:</strong> Standard or short link (e.g. <code className="bg-surface px-1 py-0.5 rounded">https://youtu.be/...</code> or <code className="bg-surface px-1 py-0.5 rounded">https://youtube.com/watch?v=...</code>)
                  </li>
                  <li>
                    <strong className="text-on-surface">Direct File:</strong> MP4, MOV, or WebM URL
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section Content Customization */}
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Icon name="edit_note" className="text-primary text-xl" /> Section Texts (Optional)
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Badge Label
                </label>
                <input
                  type="text"
                  value={settings.badge_text}
                  onChange={(e) => setSettings({ ...settings, badge_text: e.target.value })}
                  placeholder="Company Intro Video"
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Hero Button Text
                </label>
                <input
                  type="text"
                  value={settings.button_label}
                  onChange={(e) => setSettings({ ...settings, button_label: e.target.value })}
                  placeholder="Watch Intro Video"
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Section Heading / Title
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="See How We Build & Automate Digital Solutions"
                className="w-full rounded-xl border border-outline-variant bg-surface-lowest p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Section Description
              </label>
              <textarea
                rows={3}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                placeholder="Brief summary of what viewers will discover in the video…"
                className="w-full rounded-xl border border-outline-variant bg-surface-lowest p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
            >
              <Icon name={saving ? "sync" : "save"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
              {saving ? "Saving changes…" : "Save & Publish Changes"}
            </button>
          </div>
        </form>

        {/* Live Preview Panel */}
        <div className="space-y-4 lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                <Icon name="preview" className="text-primary text-base" /> Live Preview
              </h3>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {parsedVideo.type === "embed" ? "Interactive Embed" : parsedVideo.type === "direct" ? "HTML5 Video" : "Link"}
              </span>
            </div>

            {/* Simulated Section Card */}
            <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-4 overflow-hidden space-y-3">
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                  <Icon name="play_circle" className="text-xs" /> {settings.badge_text || "Company Intro Video"}
                </span>
                <h4 className="text-sm font-black text-on-surface line-clamp-2">
                  {settings.title || "See How We Build & Automate Digital Solutions"}
                </h4>
                {settings.description && (
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    {settings.description}
                  </p>
                )}
              </div>

              {/* Video Player Box */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-outline-variant/80 shadow-md">
                {parsedVideo.type === "embed" && parsedVideo.src ? (
                  <iframe
                    src={parsedVideo.src}
                    title="Intro video preview"
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : parsedVideo.type === "direct" && parsedVideo.src ? (
                  <video
                    src={parsedVideo.src}
                    controls
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-white/70">
                    <Icon name="movie" className="text-3xl text-white/40" />
                    <p className="text-xs font-semibold">Enter a valid video link to see live player</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/40">
                <span>Status: <strong>{settings.is_enabled ? "Enabled" : "Disabled"}</strong></span>
                {settings.video_url && (
                  <a
                    href={settings.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Open source ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} onClear={() => setToast(null)} />
    </div>
  );
}
