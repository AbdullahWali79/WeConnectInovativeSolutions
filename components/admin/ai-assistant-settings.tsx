"use client";

import { useState } from "react";
import { saveAiSettings, testSavedAiConnection } from "@/app/admin/settings/ai-assistant/actions";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import type { AiAssistantSettings as SettingsType } from "@/lib/supabase/types";

type View = { provider: "gemini"; model: string; enabled: boolean; assistantName: string; welcomeMessage: string; systemInstructions: string; validationStatus: SettingsType["validation_status"]; lastError: string | null; lastCheckedAt: string | null; hasApiKey: boolean };

export function AiAssistantSettings({ initial, defaultInstructions, setupError }: { initial: View; defaultInstructions: string; setupError: string | null }) {
  const [form, setForm] = useState({ ...initial, apiKey: "" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const tone = form.validationStatus === "active" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : form.validationStatus === "invalid" || form.validationStatus === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-800";

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const result = await saveAiSettings({ apiKey: form.apiKey, model: form.model, enabled: form.enabled, assistantName: form.assistantName, welcomeMessage: form.welcomeMessage, systemInstructions: form.systemInstructions });
    setSaving(false);
    if (!result.success) return setToast({ type: "error", message: result.error ?? "Save failed." });
    setForm((current) => ({ ...current, apiKey: "", hasApiKey: result.hasApiKey ?? current.hasApiKey, validationStatus: result.status ?? current.validationStatus, lastError: result.lastError ?? null }));
    setToast({ type: "success", message: "AI assistant settings saved." });
  }

  async function test() {
    setTesting(true);

    if (form.apiKey.trim()) {
      const saved = await saveAiSettings({ apiKey: form.apiKey, model: form.model, enabled: form.enabled, assistantName: form.assistantName, welcomeMessage: form.welcomeMessage, systemInstructions: form.systemInstructions });
      if (!saved.success) {
        setTesting(false);
        setToast({ type: "error", message: saved.error ?? "Could not save the new key." });
        return;
      }
      setForm((current) => ({ ...current, apiKey: "", hasApiKey: true }));
    }

    const result = await testSavedAiConnection();
    setTesting(false);
    setForm((current) => ({ ...current, validationStatus: result.status ?? current.validationStatus, lastError: result.lastError ?? result.error ?? null, lastCheckedAt: new Date().toISOString() }));
    setToast(result.success ? { type: "success", message: "New key saved. Gemini connection is active." } : { type: "error", message: result.error ?? "Connection failed." });
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Settings" title="AI Assistant" description="Connect Gemini and let visitors ask about the website's active products, services, courses, and public content." />
    {setupError ? <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800"><Icon name="error" /> Database setup required: {setupError}</div> : null}
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Connection: {form.validationStatus.replace("_", " ")}</p><p className="text-sm">{form.hasApiKey ? "API key saved securely on the server." : "No API key saved."}</p></div><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black uppercase">{form.enabled ? "Bot enabled" : "Bot disabled"}</span></div>
      {form.lastError ? <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm"><strong>Provider message:</strong> {form.lastError}</p> : null}
    </div>
    <form onSubmit={save} className="wc-card space-y-5 p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="wc-label">Provider</span><input className="wc-input mt-2" value="Gemini" disabled /></label>
        <label><span className="wc-label">Model</span><input className="wc-input mt-2" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="gemini-3.5-flash" /></label>
        <label className="md:col-span-2"><span className="wc-label">Gemini API key</span><input className="wc-input mt-2" type="password" autoComplete="new-password" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder={form.hasApiKey ? "Paste a new key only when replacing the saved key" : "Paste a private Gemini Auth key"} /><span className="mt-1 block text-xs text-on-surface-variant">Create a private Auth key in Google AI Studio. Never paste it in chat or commit it to GitHub. The saved key is used only by the server.</span></label>
        <label><span className="wc-label">Assistant name</span><input className="wc-input mt-2" value={form.assistantName} onChange={(event) => setForm({ ...form, assistantName: event.target.value })} /></label>
        <label className="flex items-center gap-3 rounded-xl border border-outline-variant p-4"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="h-5 w-5" /><span><strong className="block">Enable public AI bot</strong><span className="text-xs text-on-surface-variant">Turn off anytime without deleting the key.</span></span></label>
        <label className="md:col-span-2"><span className="wc-label">Welcome message</span><textarea className="wc-input mt-2 min-h-24" value={form.welcomeMessage} onChange={(event) => setForm({ ...form, welcomeMessage: event.target.value })} /></label>
        <label className="md:col-span-2"><span className="flex flex-wrap items-center justify-between gap-2"><span className="wc-label">AI behavior instructions and examples</span><button type="button" className="wc-secondary-btn px-3 py-2 text-xs" onClick={() => setForm({ ...form, systemInstructions: defaultInstructions })}><Icon name="restart_alt" /> Restore recommended instructions</button></span><textarea className="wc-input mt-2 min-h-80 font-mono text-sm leading-6" value={form.systemInstructions} onChange={(event) => setForm({ ...form, systemInstructions: event.target.value })} /><span className="mt-2 block text-xs text-on-surface-variant">These editable rules and examples are included with website knowledge in every AI response.</span></label>
      </div>
      <div className="flex flex-wrap gap-3"><button className="wc-primary-btn" disabled={saving || Boolean(setupError)}><Icon name="save" /> {saving ? "Saving..." : "Save Settings"}</button><button type="button" className="wc-secondary-btn" disabled={testing || !form.hasApiKey || Boolean(setupError)} onClick={() => void test()}><Icon name="network_check" /> {testing ? "Testing..." : form.apiKey.trim() ? "Save & Test Connection" : "Test Connection"}</button></div>
    </form>
    <div className="wc-card p-5"><h2 className="font-black">Knowledge source</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">The bot automatically reads active Products, active Courses, recent Blogs, and important public website routes for every conversation. Disabled or deleted public records are not included.</p></div>
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}