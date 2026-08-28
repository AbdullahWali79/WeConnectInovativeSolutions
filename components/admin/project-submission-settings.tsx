"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";

type Method = "manual" | "shared_folder" | "google_drive" | "google_form";
type Settings = { activeMethod: Method; sharedFolderUrl: string; sharedFolderInstructions: string; googleDriveReady: boolean; googleFormReady: boolean };
const methods: Array<{ id: Method; title: string; description: string; icon: string }> = [
  { id: "shared_folder", title: "Shared Google Drive Folder", description: "Students open one Editor folder, create a project folder, upload files, and paste Viewer links in the existing submission form.", icon: "folder_shared" },
  { id: "manual", title: "Manual URLs", description: "The original system: students upload files themselves and paste public Google Drive URLs.", icon: "link" },
  { id: "google_drive", title: "Google Drive API Mount", description: "Secure direct uploads through a connected admin Google Drive account.", icon: "add_to_drive" },
  { id: "google_form", title: "Google Form", description: "Replace the native student project form with an embedded Google Form.", icon: "dynamic_form" },
];

export function ProjectSubmissionSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [folderUrl, setFolderUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/project-submissions", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return setToast({ type: "error", message: data.error || "Unable to load settings." });
    setSettings(data); setFolderUrl(data.sharedFolderUrl); setInstructions(data.sharedFolderInstructions);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(method: Method) {
    setBusy(true);
    const response = await fetch("/api/admin/project-submissions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, sharedFolderUrl: folderUrl, sharedFolderInstructions: instructions }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setToast({ type: "error", message: data.error || "Update failed." });
    setSettings(data); setFolderUrl(data.sharedFolderUrl); setInstructions(data.sharedFolderInstructions);
    setToast({ type: "success", message: method === "shared_folder" ? "Shared folder method activated. Other project submission methods are disabled." : `${methods.find((item) => item.id === method)?.title} activated.` });
  }
  if (!settings) return <LoadingState label="Loading project submission options..." />;
  return <div className="space-y-6">
    <PageHeader eyebrow="Admin control" title="Project Submissions" description="Choose one student project submission method. Activating a method automatically deactivates all other methods." />
    <section className="grid gap-4 lg:grid-cols-2">
      {methods.map((method) => {
        const active = settings.activeMethod === method.id;
        const ready = method.id === "shared_folder" ? Boolean(folderUrl.trim()) : method.id === "google_drive" ? settings.googleDriveReady : method.id === "google_form" ? settings.googleFormReady : true;
        return <article key={method.id} className={`wc-card p-5 ${active ? "border-2 border-primary" : ""}`}>
          <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name={method.icon} /></span><span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{active ? "Active" : "Inactive"}</span></div>
          <h2 className="mt-4 font-black">{method.title}</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">{method.description}</p>
          {method.id === "google_drive" ? <Link href="/admin/settings/google-drive" className="mt-4 inline-flex text-sm font-bold text-primary">Configure Drive Mount →</Link> : null}
          {method.id === "google_form" ? <Link href="/admin/settings/google-form-project" className="mt-4 inline-flex text-sm font-bold text-primary">Configure Google Form →</Link> : null}
          {!active ? <button className="wc-secondary-btn mt-4 w-full" disabled={busy || !ready} onClick={() => void save(method.id)}><Icon name="toggle_on" /> {ready ? "Activate" : "Configure first"}</button> : method.id !== "manual" ? <button className="wc-secondary-btn mt-4 w-full" disabled={busy} onClick={() => void save("manual")}><Icon name="toggle_off" /> Deactivate</button> : null}
        </article>;
      })}
    </section>
    <section className="wc-card space-y-4 p-5"><div><h2 className="text-lg font-black">Shared Drive folder setup</h2><p className="mt-1 text-sm text-on-surface-variant">Set the folder to Anyone with the link — Editor in Google Drive, then paste its link below.</p></div><div><label className="wc-label" htmlFor="shared-folder-url">Google Drive folder URL</label><input id="shared-folder-url" className="wc-input mt-2" type="url" value={folderUrl} onChange={(e) => setFolderUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." /></div><div><label className="wc-label" htmlFor="shared-folder-instructions">Instructions shown to students</label><textarea id="shared-folder-instructions" className="wc-input mt-2 min-h-28" value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div><button className="wc-primary-btn w-full" disabled={busy || !folderUrl.trim()} onClick={() => void save("shared_folder")}><Icon name="folder_shared" /> {busy ? "Saving..." : "Save & Activate Shared Folder"}</button></section>
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}

