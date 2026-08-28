"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";

type Settings = { connected: boolean; enabled: boolean; accountEmail: string | null; folderId: string | null; folderName: string | null; maxImageMb: number; maxVideoMb: number; storage: { limit?: string; usage?: string } | null };
function gb(value?: string) { return value ? `${(Number(value) / 1024 ** 3).toFixed(1)} GB` : "Unknown"; }

export function GoogleDriveSettingsPanel() {
  const params = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [folder, setFolder] = useState("");
  const [maxImageMb, setMaxImageMb] = useState(15);
  const [maxVideoMb, setMaxVideoMb] = useState(500);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/google-drive/settings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return setToast({ type: "error", message: data.error || "Unable to load settings." });
    setSettings(data); setFolder(data.folderId || ""); setMaxImageMb(data.maxImageMb); setMaxVideoMb(data.maxVideoMb);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const error = params.get("error"); if (error) setToast({ type: "error", message: error }); else if (params.get("connected")) setToast({ type: "success", message: "Google Drive connected. Select the upload folder to enable student uploads." }); }, [params]);
  async function save() {
    setBusy(true);
    const response = await fetch("/api/admin/google-drive/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ folder, maxImageMb, maxVideoMb, enabled: true }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setToast({ type: "error", message: data.error || "Save failed." });
    setSettings(data); setFolder(data.folderId || ""); setToast({ type: "success", message: "Drive folder mounted. Student uploads are enabled." });
  }
  async function setEnabled(enabled: boolean) {
    if (!settings?.folderId) return setToast({ type: "error", message: "Mount an upload folder first." });
    setBusy(true);
    const response = await fetch("/api/admin/google-drive/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folder: settings.folderId, maxImageMb, maxVideoMb, enabled }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setToast({ type: "error", message: data.error || "Status update failed." });
    setSettings(data);
    setToast({
      type: "success",
      message: enabled
        ? "Google Drive uploads activated. Students can upload files directly."
        : "Google Drive uploads deactivated. Students will use the manual URL system.",
    });
  }
  async function disconnect() {
    if (!confirm("Disconnect this Google Drive? Existing project links will remain, but new uploads will stop.")) return;
    setBusy(true); const response = await fetch("/api/admin/google-drive/settings", { method: "DELETE" }); const data = await response.json(); setBusy(false);
    if (!response.ok) return setToast({ type: "error", message: data.error || "Disconnect failed." });
    await load(); setToast({ type: "success", message: "Google Drive disconnected. Existing uploaded files were not deleted." });
  }
  if (!settings) return <LoadingState label="Loading Google Drive settings..." />;
  return <div className="space-y-6">
    <PageHeader eyebrow="Storage" title="Google Drive Uploads" description="Connect the admin Drive, mount a folder, and control student project image/video uploads." />
    <section className="wc-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-2"><p className="wc-label">Connected account</p>{settings.connected ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${settings.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{settings.enabled ? "Uploads active" : "Manual system active"}</span> : null}</div><p className="mt-1 font-black">{settings.accountEmail || "No Google account connected"}</p>{settings.connected && settings.storage ? <p className="mt-1 text-sm text-on-surface-variant">Used {gb(settings.storage.usage)} of {gb(settings.storage.limit)}</p> : null}</div>
        <div className="flex flex-wrap gap-2"><a className="wc-primary-btn" href="/api/admin/google-drive/connect"><Icon name="add_to_drive" /> {settings.connected ? "Replace Drive" : "Connect Google Drive"}</a>{settings.connected && settings.folderId ? <button className="wc-secondary-btn" disabled={busy} onClick={() => void setEnabled(!settings.enabled)}><Icon name={settings.enabled ? "toggle_off" : "toggle_on"} /> {settings.enabled ? "Deactivate Uploads" : "Activate Uploads"}</button> : null}{settings.connected ? <button className="wc-secondary-btn" disabled={busy} onClick={disconnect}><Icon name="link_off" /> Disconnect</button> : null}</div>
      </div>
      {settings.connected ? <div className="mt-6 grid gap-4 border-t border-outline-variant pt-5 md:grid-cols-2">
        <div className="md:col-span-2"><label className="wc-label" htmlFor="drive-folder">Upload folder link or ID</label><input id="drive-folder" className="wc-input mt-2" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." /><p className="mt-2 text-xs text-on-surface-variant">Create or open a folder in this account, copy its URL, and paste it here. Current: {settings.folderName || "not selected"}.</p></div>
        <div><label className="wc-label" htmlFor="image-limit">Maximum image size (MB)</label><input id="image-limit" className="wc-input mt-2" type="number" min="1" max="100" value={maxImageMb} onChange={(e) => setMaxImageMb(Number(e.target.value))} /></div>
        <div><label className="wc-label" htmlFor="video-limit">Maximum video size (MB)</label><input id="video-limit" className="wc-input mt-2" type="number" min="1" max="5000" value={maxVideoMb} onChange={(e) => setMaxVideoMb(Number(e.target.value))} /></div>
        <button className="wc-primary-btn md:col-span-2" disabled={busy || !folder.trim()} onClick={save}><Icon name="cloud_done" /> {busy ? "Verifying..." : settings.folderId ? "Save Folder & Activate Uploads" : "Mount Folder & Activate Uploads"}</button>
      </div> : <div className="mt-5 rounded-xl bg-surface-container-low p-4 text-sm">Connect a Google account first. The app requests Drive access so it can create files, set Viewer links, and report storage usage.</div>}
    </section>
    <section className="wc-card p-5"><h2 className="font-black">How rotation works</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">When storage is full, choose Replace Drive and connect another account, then mount its folder. Only future uploads move to the new Drive; old links and files remain unchanged.</p></section>
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}
