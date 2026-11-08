"use client";
import { CmsElement, CmsInstance } from "@/components/cms/cms-element";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { contributorAuth, contributorLogout, saveContributorPrompt, type PromptActionResult } from "@/app/prompts/actions";
import { managePrompt } from "@/app/admin/prompts/actions";
import { type Contributor, type Prompt } from "@/lib/prompts";
import { PromptMedia, PromptLibrary } from "./library";
import { PromptExcelTools } from "./excel-tools";

const fieldClass = "mt-2 w-full rounded-xl border border-outline-variant bg-background p-3 text-on-background";
const buttonClass = "rounded-full bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-50";

function parseSubmitter(note?: string | null) {
  if (!note) return null;
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object" && (parsed.student_name || parsed.student_phone)) {
      return {
        name: (parsed.student_name as string) || "Anonymous Student",
        phone: (parsed.student_phone as string) || "",
        submittedAt: parsed.submitted_at ? new Date(parsed.submitted_at).toLocaleDateString() : undefined,
      };
    }
  } catch {}
  return null;
}

export function ActionForm({ action, children, className = "space-y-4", onSuccess }: { action: (form: FormData) => Promise<PromptActionResult>; children: ReactNode; className?: string; onSuccess?: () => void }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [result, setResult] = useState<PromptActionResult | null>(null);
  return <form className={className} onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter); setBusy(true); setResult(null); try { const response = await action(form); setResult(response); if (response.ok) { router.refresh(); onSuccess?.(); } } catch { setResult({ ok: false, message: "Unable to complete this action. Please retry." }); } finally { setBusy(false); } }}><fieldset disabled={busy} className="min-w-0 space-y-4">{children}</fieldset>{busy && <CmsElement cmsId="202852c1-0" as="p" role="status">Saving…</CmsElement>}{result && <CmsElement cmsId="202852c1-1" as="p" role={result.ok ? "status" : "alert"} className={`rounded-xl border p-3 text-sm ${result.ok ? "border-primary text-primary" : "border-red-400 text-red-600"}`}>{result.message}</CmsElement>}</form>;
}

function Field({ label, name, value = "", multiline = false, required = true, placeholder, type = "text", maxLength = 2000, options }: { label: string; name: string; value?: string | number; multiline?: boolean; required?: boolean; placeholder?: string; type?: string; maxLength?: number; options?: string[] }) {
  return <CmsElement cmsId="202852c1-2" as="label" className="block text-sm font-semibold">{label}{options ? <><input name={name} defaultValue={value} required={required} placeholder={placeholder || "Select or type..."} list={`${name}-options`} maxLength={maxLength} className={fieldClass} /><datalist id={`${name}-options`}>{options.map(opt => <option key={opt} value={opt} />)}</datalist></> : multiline ? <textarea name={name} defaultValue={value} required={required} placeholder={placeholder} maxLength={maxLength} rows={name === "template" ? 8 : 3} className={fieldClass} /> : <input name={name} defaultValue={value} required={required} placeholder={placeholder} type={type} maxLength={maxLength} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className={fieldClass} />}</CmsElement>;
}

export function PromptEditor({ prompt, admin = false }: { prompt?: Prompt; admin?: boolean }) {
  const categories = ["Image Generation", "Text & Content Writing", "Marketing & SEO", "Coding & Development", "Business & Finance", "Education & Learning", "Video & Audio Generation", "UI/UX & Design", "Productivity", "Personal Assistant", "Social Media", "Other"];
  return <ActionForm action={admin ? managePrompt : saveContributorPrompt}><input type="hidden" name="operation" value="save" /><input type="hidden" name="id" value={prompt?.id ?? ""} /><CmsElement cmsId="202852c1-3" as="div" className="grid gap-4 md:grid-cols-2"><Field label="Prompt title" name="title" value={prompt?.title} maxLength={140} /><Field label="Category" name="category" value={prompt?.category} options={categories} maxLength={60} /><Field label="AI model / tool" name="model" value={prompt?.model} placeholder="ChatGPT, Gemini, Midjourney…" maxLength={80} /><Field label="Price (PKR) — 0 for free" name="price" type="number" value={prompt?.price ?? 0} /></CmsElement><Field label="Description / what this prompt creates" name="description" value={prompt?.description} multiline /><Field label="Prompt template (minimum 20 characters)" name="template" value={prompt?.template} multiline maxLength={30000} placeholder="Write 3 Facebook ads for {{BusinessName}} targeting {{TargetAudience}}. Highlight {{Offer}} using a {{Tone}} tone." /><CmsElement cmsId="202852c1-4" as="p" className="text-sm text-on-surface-variant">Use double braces such as {"{{BusinessName}}"} for fillable variables. Fields are created automatically. Use letters, numbers, spaces or underscores in variable names.</CmsElement><Field label="Output image / video links (Supabase Storage CDN or Google Drive) — one per line (up to 6)" name="media_urls" value={prompt?.media_urls.join("\n")} multiline maxLength={3100} placeholder="https://..." /><CmsElement cmsId="202852c1-5" as="p" className="text-sm text-on-surface-variant">Image URLs uploaded through the site or Google Drive links set to Anyone with the link.</CmsElement><Field label="Purchase / contact HTTPS link (optional)" name="purchase_url" value={prompt?.purchase_url} required={false} type="url" maxLength={1000} />{admin && <><CmsElement cmsId="202852c1-6" as="label" className="block text-sm font-semibold">Publication status<select name="status" defaultValue={prompt?.status ?? "approved"} className={fieldClass}><option value="approved">Published</option><option value="pending">Pending review</option><option value="rejected">Rejected / hidden</option></select></CmsElement><Field label="Admin note" name="admin_note" value={prompt?.admin_note} required={false} multiline /></>}<CmsElement cmsId="202852c1-7" as="div" className="flex flex-wrap gap-3"><CmsElement cmsId="202852c1-8" as="button" className={buttonClass}>{admin ? "Save changes" : "Submit prompt"}</CmsElement>{admin && <><CmsElement cmsId="202852c1-9" as="button" type="submit" name="publish_status" value="approved" className={buttonClass}>Save &amp; Publish</CmsElement><CmsElement cmsId="202852c1-10" as="a" href="/prompts" target="_blank" rel="noopener noreferrer" className="rounded-full border border-outline-variant px-5 py-3 font-semibold">View public prompt library</CmsElement></>}</CmsElement></ActionForm>;
}

export function ContributorPortal({ contributor, prompts }: { contributor: Contributor | null; prompts: Prompt[] }) {
  const [mode, setMode] = useState("register");
  if (!contributor) return <CmsElement cmsId="202852c1-11" as="div" className="mx-auto max-w-xl rounded-3xl border border-outline-variant bg-surface p-6 md:p-8"><CmsElement cmsId="202852c1-12" as="h2" className="text-2xl font-bold">{mode === "register" ? "Become a prompt contributor" : "Contributor sign in"}</CmsElement><CmsElement cmsId="202852c1-13" as="p" className="mb-6 mt-3 text-on-surface-variant">This is a separate prompt-library account. No course enrollment is needed.</CmsElement><CmsElement cmsId="202852c1-14" as="div" className="mb-6 flex gap-4"><CmsElement cmsId="202852c1-15" as="button" onClick={() => setMode("register")} aria-pressed={mode === "register"} className={mode === "register" ? "font-bold text-primary" : ""}>Request access</CmsElement><CmsElement cmsId="202852c1-16" as="button" onClick={() => setMode("login")} aria-pressed={mode === "login"} className={mode === "login" ? "font-bold text-primary" : ""}>Sign in</CmsElement></CmsElement><CmsInstance key={mode} instance={String(mode)}><ActionForm key={mode} action={contributorAuth}><input type="hidden" name="mode" value={mode} />{mode === "register" && <Field label="Your name" name="name" maxLength={100} />}<Field label="Email" name="email" type="email" maxLength={254} /><Field label="Password (at least 12 characters)" name="password" type="password" maxLength={128} />{mode === "register" && <Field label="Tell admin what kind of prompts you want to share" name="request_note" multiline />}<CmsElement cmsId="202852c1-17" as="button" className={buttonClass}>{mode === "register" ? "Send access request" : "Sign in"}</CmsElement></ActionForm></CmsInstance></CmsElement>;
  return <CmsElement cmsId="202852c1-18" as="div" className="space-y-7"><CmsElement cmsId="202852c1-19" as="section" className="rounded-2xl border border-outline-variant bg-surface p-6"><CmsElement cmsId="202852c1-20" as="div" className="flex flex-wrap items-center justify-between gap-4"><CmsElement cmsId="202852c1-21" as="h2" className="text-2xl font-bold">Welcome, {contributor.name}</CmsElement><ActionForm action={contributorLogout}><CmsElement cmsId="202852c1-22" as="button" className="text-primary">Sign out</CmsElement></ActionForm></CmsElement><CmsElement cmsId="202852c1-23" as="p" className="mt-3 font-semibold">Access: {contributor.status}</CmsElement><CmsElement cmsId="202852c1-24" as="p" className="mt-2 text-on-surface-variant">{contributor.status === "approved" ? contributor.auto_publish ? "You can publish prompts directly. Admin can review and hide prompts when needed." : "You can submit prompts. Each new or edited prompt goes to admin for approval." : contributor.status === "pending" ? "Your request has been sent to admin. Check back here for approval." : "Your contributor request was declined. See the admin note below."}</CmsElement>{contributor.admin_note && <CmsElement cmsId="202852c1-25" as="p" className="mt-4 whitespace-pre-wrap rounded-xl bg-background p-4">Admin: {contributor.admin_note}</CmsElement>}</CmsElement>{contributor.status === "approved" && <PromptExcelTools prompts={prompts} autoPublish={contributor.auto_publish} />}{contributor.status === "approved" && <CmsElement cmsId="202852c1-26" as="section" className="rounded-2xl border border-outline-variant bg-surface p-6"><CmsElement cmsId="202852c1-27" as="h2" className="mb-5 text-2xl font-bold">Add a prompt</CmsElement><PromptEditor /></CmsElement>}<CmsElement cmsId="202852c1-28" as="section"><CmsElement cmsId="202852c1-29" as="h2" className="mb-4 text-2xl font-bold">Your prompts ({prompts.length})</CmsElement>{prompts.map((prompt) => <details key={prompt.id} className="mb-4 rounded-2xl border border-outline-variant bg-surface p-5"><summary className="cursor-pointer font-bold">{prompt.title} · {prompt.status}</summary>{prompt.admin_note && <CmsElement cmsId="202852c1-30" as="p" className="my-4 whitespace-pre-wrap">Admin: {prompt.admin_note}</CmsElement>}{contributor.status === "approved" && <CmsElement cmsId="202852c1-31" as="div" className="mt-5"><CmsInstance key={`${prompt.id}-${prompt.status}`} instance={String(`${prompt.id}-${prompt.status}`)}><PromptEditor key={`${prompt.id}-${prompt.status}`} prompt={prompt} /></CmsInstance></CmsElement>}</details>)}</CmsElement></CmsElement>;
}

export function PromptAdmin({ contributors, prompts }: { contributors: Contributor[]; prompts: Prompt[] }) {
  const [tab, setTab] = useState("requests"); const [filter, setFilter] = useState("all");
  return <CmsElement cmsId="202852c1-32" as="div" className="space-y-6"><CmsElement cmsId="202852c1-33" as="header"><CmsElement cmsId="202852c1-34" as="h1" className="text-3xl font-bold">Prompt library</CmsElement><CmsElement cmsId="202852c1-35" as="p" className="mt-2 text-on-surface-variant">Manage contributor access, review prompts, and publish your own.</CmsElement></CmsElement><CmsElement cmsId="202852c1-36" as="nav" className="flex flex-wrap gap-3">{[["requests", `Contributors (${contributors.filter((c) => c.status === "pending").length} pending)`], ["prompts", `Prompts (${prompts.filter((p) => p.status === "pending").length} pending)`], ["create", "Add prompt"], ["excel", "Excel import / export"]].map(([id, title]) => <CmsElement cmsId="202852c1-37" as="button" instance={String(id)} key={id} onClick={() => { setTab(id); setFilter("all"); }} aria-pressed={tab === id} className={tab === id ? buttonClass : "rounded-full border border-outline-variant px-5 py-3"}>{title}</CmsElement>)}</CmsElement>{(tab === "requests" || tab === "prompts") && <CmsElement cmsId="202852c1-38" as="label" className="block max-w-xs text-sm font-semibold">Filter status<select value={filter} onChange={(e) => setFilter(e.target.value)} className={fieldClass}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></CmsElement>}
  {tab === "excel" && <PromptExcelTools prompts={prompts} admin onManagePrompts={() => { setTab("prompts"); setFilter("all"); }} />}
  {tab === "create" && <CmsElement cmsId="202852c1-39" as="section" className="rounded-2xl border border-outline-variant bg-surface p-6"><PromptEditor admin /></CmsElement>}
  {tab === "requests" && <>{!contributors.filter((c) => filter === "all" || c.status === filter).length && <CmsElement cmsId="202852c1-40" as="p">No contributors with this status.</CmsElement>}{contributors.filter((c) => filter === "all" || c.status === filter).map((c) => <CmsElement cmsId="202852c1-41" as="section" instance={String(c.id)} key={c.id} className="rounded-2xl border border-outline-variant bg-surface p-6"><CmsElement cmsId="202852c1-42" as="h2" className="text-xl font-bold">{c.name} · {c.status}</CmsElement><CmsElement cmsId="202852c1-43" as="p" className="my-2 text-sm text-on-surface-variant">{c.email}</CmsElement><CmsElement cmsId="202852c1-44" as="p" className="mb-5 whitespace-pre-wrap">{c.request_note}</CmsElement><ActionForm action={managePrompt}><input type="hidden" name="operation" value="contributor" /><input type="hidden" name="id" value={c.id} /><CmsElement cmsId="202852c1-45" as="label" className="block">Access<select name="status" defaultValue={c.status} className={fieldClass}><option value="pending">Pending</option><option value="approved">Allow submissions</option><option value="rejected">Reject / revoke access</option></select></CmsElement><CmsElement cmsId="202852c1-46" as="label" className="flex items-center gap-3"><input type="checkbox" name="auto_publish" defaultChecked={c.auto_publish} />Allow direct publishing without per-prompt approval</CmsElement><CmsElement cmsId="202852c1-47" as="p" className="text-sm text-on-surface-variant">Revoking access stops future submissions. Review already published prompts separately to hide them.</CmsElement><Field label="Admin note to contributor" name="admin_note" value={c.admin_note} multiline required={false} /><CmsElement cmsId="202852c1-48" as="button" className={buttonClass}>Save contributor access</CmsElement></ActionForm></CmsElement>)}</>}
  {tab === "prompts" && <CmsElement cmsId="202852c1-49" as="div" className="-mx-4 md:mx-0"><PromptLibrary prompts={prompts.filter((p) => filter === "all" || p.status === filter)} renderAdminControls={(p) => {
    const submitter = parseSubmitter(p.admin_note);
    return (
      <CmsElement cmsId="202852c1-50" as="div" className="mt-6 border-t border-outline-variant pt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <CmsElement cmsId="202852c1-51" as="h3" className="text-base font-bold">Admin actions</CmsElement>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
            p.status === "approved"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              : p.status === "rejected"
              ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
          }`}>
            {p.status}
          </span>
        </div>

        {submitter ? (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-primary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                🎓 Student Submission
              </span>
              {submitter.submittedAt && (
                <span className="text-xs text-on-surface-variant">{submitter.submittedAt}</span>
              )}
            </div>
            <p className="mt-1 font-bold text-on-background text-base">{submitter.name}</p>
            {submitter.phone && (
              <a
                href={`https://wa.me/${submitter.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                📱 WhatsApp: {submitter.phone} ↗
              </a>
            )}
          </div>
        ) : (
          <CmsElement cmsId="202852c1-52" as="p" className="mb-3 text-xs text-on-surface-variant">
            Contributor: {contributors.find((c) => c.id === p.contributor_id)?.email ?? "Admin"}
          </CmsElement>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {p.status !== "approved" ? (
            <ActionForm action={managePrompt} className="inline">
              <input type="hidden" name="operation" value="review" />
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value="approved" />
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
              >
                ✓ 1-Click Approve &amp; Publish
              </button>
            </ActionForm>
          ) : (
            <ActionForm action={managePrompt} className="inline">
              <input type="hidden" name="operation" value="review" />
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value="rejected" />
              <button
                type="submit"
                className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface transition cursor-pointer"
              >
                Unpublish / Hide
              </button>
            </ActionForm>
          )}

          {p.status === "pending" && (
            <ActionForm action={managePrompt} className="inline">
              <input type="hidden" name="operation" value="review" />
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value="rejected" />
              <button
                type="submit"
                className="rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30 transition cursor-pointer"
              >
                ✕ Reject
              </button>
            </ActionForm>
          )}

          {p.status === "rejected" && (
            <ActionForm action={managePrompt} className="inline">
              <input type="hidden" name="operation" value="review" />
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value="pending" />
              <button
                type="submit"
                className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface transition cursor-pointer"
              >
                Move to Pending
              </button>
            </ActionForm>
          )}
        </div>

        <details className="rounded-xl border border-outline-variant bg-background p-4">
          <summary className="cursor-pointer font-bold text-sm">Edit prompt details &amp; note</summary>
          <CmsElement cmsId="202852c1-53" as="div" className="mt-4"><PromptEditor admin prompt={p} /></CmsElement>
        </details>
        <ActionForm action={managePrompt} className="mt-3">
          <input type="hidden" name="operation" value="delete" />
          <input type="hidden" name="id" value={p.id} />
          <CmsElement cmsId="202852c1-54" as="button" className="text-red-600 text-xs font-bold hover:underline cursor-pointer" onClick={(e) => { if (!window.confirm("Are you sure you want to delete this prompt?")) e.preventDefault(); }}>Delete prompt</CmsElement>
        </ActionForm>
      </CmsElement>
    );
  }} /></CmsElement>}
  </CmsElement>;
}
