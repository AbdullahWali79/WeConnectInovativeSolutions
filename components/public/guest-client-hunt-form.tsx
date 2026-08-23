"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGuestClientHuntProgress, submitGuestClientHunt } from "@/app/client-hunt-form/[slug]/actions";
import { PUBLIC_CLIENT_HUNT_SERVICES } from "@/lib/public-client-hunt";
import type { PublicClientHuntForm, PublicClientHuntKeyword, PublicClientHuntService } from "@/lib/supabase/types";

export function GuestClientHuntForm({ form, keywords }: { form: PublicClientHuntForm; keywords: PublicClientHuntKeyword[] }) {
  const [fields, setFields] = useState({ submitterName: "", submitterPhone: "", clientName: "", websiteUrl: "", clientGmbUrl: "", clientPhone: "", clientHasWhatsapp: "" as "" | "yes" | "no", keywordId: "", keywordText: "", serviceRequired: "" as PublicClientHuntService | "", notes: "" });
  const [state, setState] = useState<{ type: "success" | "error"; message: string; registered?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; target: number; remaining: number; message: string } | null>(null);
  const update = (key: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (key === "submitterName") localStorage.setItem("guest-client-hunt-name", value);
    if (key === "submitterPhone") localStorage.setItem("guest-client-hunt-phone", value);
  };

  useEffect(() => {
    const savedName = localStorage.getItem("guest-client-hunt-name") || "";
    const savedPhone = localStorage.getItem("guest-client-hunt-phone") || "";
    setFields((current) => ({ ...current, submitterName: savedName, submitterPhone: savedPhone }));
  }, []);

  useEffect(() => {
    if (!fields.submitterName.trim() || fields.submitterPhone.replace(/\D/g, "").length < 7) { setProgress(null); return; }
    const timer = window.setTimeout(() => {
      void getGuestClientHuntProgress(form.id, fields.submitterPhone, fields.submitterName).then((result) => {
        if (result.success) setProgress(result.progress);
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [fields.submitterName, fields.submitterPhone, form.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setState(null);
    const result = await submitGuestClientHunt({ ...fields, formId: form.id, serviceRequired: fields.serviceRequired as PublicClientHuntService, clientHasWhatsapp: fields.clientHasWhatsapp === "" ? null : fields.clientHasWhatsapp === "yes" });
    setBusy(false);
    if (!result.success) {
      setState({ type: "error", message: result.error, registered: "registered" in result && result.registered });
      return;
    }
    localStorage.setItem("guest-client-hunt-name", fields.submitterName);
    localStorage.setItem("guest-client-hunt-phone", fields.submitterPhone);
    setProgress(result.progress);
    setFields((current) => ({ ...current, clientName: "", websiteUrl: "", clientGmbUrl: "", clientPhone: "", clientHasWhatsapp: "", keywordId: "", keywordText: "", serviceRequired: "", notes: "" }));
    setState({ type: "success", message: "Client lead submitted successfully. Thank you!" });
  }

  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl sm:p-8">
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-slate-800">
      <p className="font-black text-blue-800">Client details submit karne se pehle:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Client ki official website aur Google Business Profile (GMB) Google Maps se open karein.</li>
        <li>GMB ka <strong>Share</strong> button press karke business link copy karein.</li>
        <li>Example GMB link: <span className="break-all font-bold text-blue-700">https://maps.app.goo.gl/AbCd1234</span></li>
        <li>Client ka contact number add karein aur confirm karein ke us number par WhatsApp available hai ya nahi.</li>
      </ul>
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <label><span className="wc-label">Your name *</span><input className="wc-input mt-2" value={fields.submitterName} onChange={(e) => update("submitterName", e.target.value)} required /></label>
      <label><span className="wc-label">Phone number *</span><input className="wc-input mt-2" type="tel" value={fields.submitterPhone} onChange={(e) => update("submitterPhone", e.target.value)} placeholder="+92 300 0000000" required /></label>
      <label><span className="wc-label">Client name (optional)</span><input className="wc-input mt-2" value={fields.clientName} onChange={(e) => update("clientName", e.target.value)} /></label>
      <label><span className="wc-label">Website URL *</span><input className="wc-input mt-2" type="text" value={fields.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="example.com" required /></label>
      <label><span className="wc-label">Client GMB URL *</span><input className="wc-input mt-2" type="text" value={fields.clientGmbUrl} onChange={(e) => update("clientGmbUrl", e.target.value)} placeholder="https://maps.app.goo.gl/AbCd1234" required /></label>
      <label><span className="wc-label">Client phone *</span><input className="wc-input mt-2" type="tel" value={fields.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} placeholder="e.g. +44 20 1234 5678" required /></label>
      <label><span className="wc-label">Client has WhatsApp? *</span><select className="wc-input mt-2" value={fields.clientHasWhatsapp} onChange={(e) => update("clientHasWhatsapp", e.target.value)} required><option value="">Select Yes or No</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      {keywords.length > 0 ? <label><span className="wc-label">Search keyword *</span><select className="wc-input mt-2" value={fields.keywordId} onChange={(e) => update("keywordId", e.target.value)} required><option value="">Select keyword</option>{keywords.map((keyword) => <option key={keyword.id} value={keyword.id}>{keyword.keyword}</option>)}</select></label> : <label><span className="wc-label">Search keyword *</span><input className="wc-input mt-2" value={fields.keywordText} onChange={(e) => update("keywordText", e.target.value)} placeholder="e.g. gym in London" required /></label>}
      <label><span className="wc-label">Service client needs *</span><select className="wc-input mt-2" value={fields.serviceRequired} onChange={(e) => update("serviceRequired", e.target.value)} required><option value="">Select service</option>{PUBLIC_CLIENT_HUNT_SERVICES.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}</select></label>
    </div>
    {progress ? <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-5 text-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-blue-700">Today&apos;s Client Hunt Progress</p><p className="mt-1 text-2xl font-black">{progress.completed} / {progress.target} clients found</p></div><span className={`rounded-full px-4 py-2 text-sm font-black ${progress.remaining === 0 ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"}`}>{progress.remaining === 0 ? "Target Complete" : `${progress.remaining} remaining`}</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all" style={{ width: `${Math.min((progress.completed / progress.target) * 100, 100)}%` }} /></div><p className="mt-4 font-bold leading-6">✨ {progress.message}</p></div> : null}
    <label className="block"><span className="wc-label">Notes (optional)</span><textarea className="wc-input mt-2 min-h-24" value={fields.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Why does this client need the selected service?" /></label>
    {state ? <div role="alert" className={`rounded-xl border p-4 text-sm font-bold ${state.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>{state.message}{state.registered ? <div className="mt-3"><Link className="underline" href="/login?next=/student/client-hunting">Open Student Portal</Link></div> : null}</div> : null}
    <button className="wc-primary-btn w-full" disabled={busy}>{busy ? "Submitting..." : "Submit Client Lead"}</button>
  </form>;
}
