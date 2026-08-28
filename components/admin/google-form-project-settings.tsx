"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";

type Settings = { enabled: boolean; formUrl: string; title: string; instructions: string };

export function GoogleFormProjectSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [formInput, setFormInput] = useState("");
  const [title, setTitle] = useState("Project Submission Form");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/google-form-project", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return setToast({ type: "error", message: data.error || "Unable to load settings." });
    setSettings(data); setFormInput(data.formUrl); setTitle(data.title); setInstructions(data.instructions);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(enabled = settings?.enabled ?? false) {
    setBusy(true);
    const response = await fetch("/api/admin/google-form-project", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ formInput, title, instructions, enabled }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setToast({ type: "error", message: data.error || "Save failed." });
    setSettings(data); setFormInput(data.formUrl || "");
    setToast({ type: "success", message: enabled ? "Google Form activated for student project submissions." : "Google Form deactivated. The existing project submission system is active." });
  }
  if (!settings) return <LoadingState label="Loading Google Form settings..." />;
  return <div className="space-y-6">
    <PageHeader eyebrow="Project submissions" title="Google Form Project Submission" description="Embed a Google Form inside the student portal and switch between it and the existing project submission system." />
    <section className="wc-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="wc-label">Current status</p><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${settings.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{settings.enabled ? "Google Form active" : "Existing system active"}</span></div><button className="wc-secondary-btn" disabled={busy || (!settings.enabled && !formInput.trim())} onClick={() => void save(!settings.enabled)}><Icon name={settings.enabled ? "toggle_off" : "toggle_on"} /> {settings.enabled ? "Deactivate Google Form" : "Activate Google Form"}</button></div>
      <div><label className="wc-label" htmlFor="form-title">Student page title</label><input id="form-title" className="wc-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label className="wc-label" htmlFor="form-instructions">Instructions (optional)</label><textarea id="form-instructions" className="wc-input mt-2 min-h-24" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Explain what students must submit." /></div>
      <div><label className="wc-label" htmlFor="form-code">Google Form embed code or full URL</label><textarea id="form-code" className="wc-input mt-2 min-h-32 font-mono text-xs" value={formInput} onChange={(e) => setFormInput(e.target.value)} placeholder={'<iframe src="https://docs.google.com/forms/d/e/.../viewform?embedded=true" ...></iframe>'} /><p className="mt-2 text-xs leading-5 text-on-surface-variant">Google Form → Send → &lt;&gt; Embed HTML → Copy. For security, only the verified docs.google.com form URL is saved; arbitrary HTML is discarded.</p></div>
      <button className="wc-primary-btn w-full" disabled={busy || !formInput.trim()} onClick={() => void save(settings.enabled)}><Icon name="save" /> {busy ? "Saving..." : "Save Google Form"}</button>
    </section>
    {settings.formUrl ? <section className="wc-card overflow-hidden"><div className="border-b border-outline-variant p-4"><h2 className="font-black">Student preview</h2></div><iframe src={settings.formUrl} title="Google Form preview" className="h-[720px] w-full border-0" loading="lazy">Loading…</iframe></section> : null}
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}

