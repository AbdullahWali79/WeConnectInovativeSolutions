"use client";

import { useState } from "react";
import Link from "next/link";
import { submitGuestClientHunt } from "@/app/client-hunt-form/[slug]/actions";
import { PUBLIC_CLIENT_HUNT_SERVICES } from "@/lib/public-client-hunt";
import type { PublicClientHuntForm, PublicClientHuntKeyword, PublicClientHuntService } from "@/lib/supabase/types";

export function GuestClientHuntForm({ form, keywords }: { form: PublicClientHuntForm; keywords: PublicClientHuntKeyword[] }) {
  const [fields, setFields] = useState({ submitterName: "", submitterPhone: "", clientName: "", websiteUrl: "", keywordId: "", serviceRequired: "" as PublicClientHuntService | "", notes: "" });
  const [state, setState] = useState<{ type: "success" | "error"; message: string; registered?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setState(null);
    const result = await submitGuestClientHunt({ ...fields, formId: form.id, serviceRequired: fields.serviceRequired as PublicClientHuntService });
    setBusy(false);
    if (!result.success) {
      setState({ type: "error", message: result.error, registered: "registered" in result && result.registered });
      return;
    }
    setFields({ submitterName: "", submitterPhone: "", clientName: "", websiteUrl: "", keywordId: "", serviceRequired: "", notes: "" });
    setState({ type: "success", message: "Client lead submitted successfully. Thank you!" });
  }

  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <label><span className="wc-label">Your name *</span><input className="wc-input mt-2" value={fields.submitterName} onChange={(e) => update("submitterName", e.target.value)} required /></label>
      <label><span className="wc-label">Phone number *</span><input className="wc-input mt-2" type="tel" value={fields.submitterPhone} onChange={(e) => update("submitterPhone", e.target.value)} placeholder="+92 300 0000000" required /></label>
      <label><span className="wc-label">Client name (optional)</span><input className="wc-input mt-2" value={fields.clientName} onChange={(e) => update("clientName", e.target.value)} /></label>
      <label><span className="wc-label">Website URL *</span><input className="wc-input mt-2" type="text" value={fields.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="example.com" required /></label>
      <label><span className="wc-label">Search keyword *</span><select className="wc-input mt-2" value={fields.keywordId} onChange={(e) => update("keywordId", e.target.value)} required><option value="">Select keyword</option>{keywords.map((keyword) => <option key={keyword.id} value={keyword.id}>{keyword.keyword}</option>)}</select></label>
      <label><span className="wc-label">Service client needs *</span><select className="wc-input mt-2" value={fields.serviceRequired} onChange={(e) => update("serviceRequired", e.target.value)} required><option value="">Select service</option>{PUBLIC_CLIENT_HUNT_SERVICES.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}</select></label>
    </div>
    <label className="block"><span className="wc-label">Notes (optional)</span><textarea className="wc-input mt-2 min-h-24" value={fields.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Why does this client need the selected service?" /></label>
    {state ? <div role="alert" className={`rounded-xl border p-4 text-sm font-bold ${state.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>{state.message}{state.registered ? <div className="mt-3"><Link className="underline" href="/login?next=/student/client-hunting">Open Student Portal</Link></div> : null}</div> : null}
    <button className="wc-primary-btn w-full" disabled={busy || keywords.length === 0}>{busy ? "Submitting..." : "Submit Client Lead"}</button>
  </form>;
}
