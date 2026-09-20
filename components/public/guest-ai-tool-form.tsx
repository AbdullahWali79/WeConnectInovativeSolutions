"use client";

import { useEffect, useState } from "react";
import { submitPublicAITool } from "@/app/forms/ai-tools/actions";
import type { PublicAIToolForm, PublicAIToolCategory } from "@/lib/supabase/types";

export function GuestAIToolForm({ form, categories }: { form: PublicAIToolForm; categories: PublicAIToolCategory[] }) {
  const [fields, setFields] = useState({ 
    submitterName: "", 
    submitterPhone: "", 
    toolName: "", 
    toolUrl: "", 
    benefits: "", 
    youtubeUrl: "",
    categoryId: categories[0]?.id ?? "",
    categorySnapshot: categories[0]?.category ?? ""
  });
  const [state, setState] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; target: number; remaining: number } | null>(null);
  
  const update = (key: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (key === "submitterName") localStorage.setItem("guest-ai-tool-name", value);
    if (key === "submitterPhone") localStorage.setItem("guest-ai-tool-phone", value);
  };

  useEffect(() => {
    const savedName = localStorage.getItem("guest-ai-tool-name") || "";
    const savedPhone = localStorage.getItem("guest-ai-tool-phone") || "";
    setFields((current) => ({ ...current, submitterName: savedName, submitterPhone: savedPhone }));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    
    if (fields.benefits.length < 10) {
      setState({ type: "error", message: "Benefits must be at least 10 characters long." });
      return;
    }
    
    setBusy(true);
    setState(null);
    
    // Find category snapshot
    const category = categories.find(c => c.id === fields.categoryId);
    const snap = category?.category ?? fields.categorySnapshot;
    
    const result = await submitPublicAITool(form.id, {
      ...fields,
      imageUrl: "", // Handled on the server
      categorySnapshot: snap
    });
    
    setBusy(false);
    
    if (!result.ok) {
      setState({ type: "error", message: result.error });
      return;
    }
    
    localStorage.setItem("guest-ai-tool-name", fields.submitterName);
    localStorage.setItem("guest-ai-tool-phone", fields.submitterPhone);
    
    const completed = result.totalSubmitted;
    const target = form.daily_target || 50;
    const remaining = Math.max(0, target - completed);
    
    setProgress({ completed, target, remaining });
    setFields((current) => ({ ...current, toolName: "", toolUrl: "", benefits: "", youtubeUrl: "" }));
    setState({ type: "success", message: "AI Tool submitted successfully. Thank you!" });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-xl min-[360px]:p-4 sm:space-y-5 sm:rounded-3xl sm:p-8">
      
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-slate-800 sm:p-5">
        <p className="font-black text-blue-800">Tool details submit karne se pehle:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Check karein ke yeh tool &quot;Latest AI Tools&quot; directory me pehlay se majood to nahi.</li>
          <li>Tool ka complete URL paste karein (example: https://www.openai.com).</li>
          <li>Benefits mein explain karein ke students is tool se kya faida utha saktay hain.</li>
        </ul>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label><span className="wc-label">Your name *</span><input className="wc-input mt-2" value={fields.submitterName} onChange={(e) => update("submitterName", e.target.value)} required /></label>
        <label><span className="wc-label">Phone number *</span><input className="wc-input mt-2" type="tel" value={fields.submitterPhone} onChange={(e) => update("submitterPhone", e.target.value)} placeholder="+92 300 0000000" required /></label>
        
        {categories.length > 0 ? (
          <label className="sm:col-span-2"><span className="wc-label">Category *</span>
            <select className="wc-input mt-2" value={fields.categoryId} onChange={(e) => update("categoryId", e.target.value)} required>
              {categories.map(c => <option key={c.id} value={c.id}>{c.category}</option>)}
            </select>
          </label>
        ) : (
          <label className="sm:col-span-2"><span className="wc-label">Category *</span>
            <input className="wc-input mt-2" value={fields.categorySnapshot} onChange={(e) => update("categorySnapshot", e.target.value)} required placeholder="e.g. Video Editing" />
          </label>
        )}

        <label className="sm:col-span-2"><span className="wc-label">Tool name *</span><input className="wc-input mt-2" value={fields.toolName} onChange={(e) => update("toolName", e.target.value)} required /></label>
        <label className="sm:col-span-2"><span className="wc-label">Tool URL *</span><input className="wc-input mt-2" type="url" value={fields.toolUrl} onChange={(e) => update("toolUrl", e.target.value)} placeholder="https://..." required /></label>
        
        <label className="sm:col-span-2"><span className="wc-label">Benefits for students *</span><textarea className="wc-input mt-2 min-h-24" value={fields.benefits} onChange={(e) => update("benefits", e.target.value)} required placeholder="How this tool helps in study or work..." /></label>
        
        <label className="sm:col-span-2"><span className="wc-label">YouTube learning video URL (optional)</span><input className="wc-input mt-2" type="url" value={fields.youtubeUrl} onChange={(e) => update("youtubeUrl", e.target.value)} placeholder="https://youtube.com/..." /></label>
      </div>

      {progress ? (
        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-5 text-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-700">Your AI Tool Submission Progress</p>
              <p className="mt-1 text-2xl font-black">{progress.completed} / {progress.target} tools submitted</p>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-black ${progress.remaining <= 0 ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"}`}>
              {progress.remaining <= 0 ? "Target Complete" : `${progress.remaining} remaining`}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all" style={{ width: `${Math.min((progress.completed / progress.target) * 100, 100)}%` }} />
          </div>
        </div>
      ) : null}

      {state ? <div role="alert" className={`rounded-xl border p-4 text-sm font-bold ${state.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>{state.message}</div> : null}
      
      <button className="wc-primary-btn w-full" disabled={busy}>{busy ? "Submitting..." : "Submit AI Tool"}</button>
    </form>
  );
}
