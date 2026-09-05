"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Prompt } from "@/lib/prompts";
import type { PromptImportIssue, PromptImportRow } from "@/lib/prompt-import";
import { importAdminPrompts } from "@/app/admin/prompts/actions";
import { importContributorPrompts, type PromptActionResult } from "@/app/prompts/actions";

const buttonClass = "rounded-full border border-outline-variant px-5 py-3 text-sm font-semibold disabled:opacity-50";

export function PromptExcelTools({ prompts, admin = false, autoPublish = false }: { prompts: Prompt[]; admin?: boolean; autoPublish?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PromptImportRow[]>([]);
  const [issues, setIssues] = useState<PromptImportIssue[]>([]);
  const [result, setResult] = useState<PromptActionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState("");
  const [status, setStatus] = useState("pending");

  async function download(exportExisting: boolean) {
    setBusy(true); setResult(null);
    try {
      const { downloadPromptWorkbook } = await import("@/lib/prompt-excel");
      downloadPromptWorkbook(exportExisting ? prompts : undefined);
    } catch { setResult({ ok: false, message: "Could not download the workbook. Please retry." }); }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    setRows([]); setIssues([]); setResult(null); setFilename(file?.name ?? "");
    if (!file) return;
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an .xlsx Excel workbook using the template below.");
      if (file.size > 2 * 1024 * 1024) throw new Error("Excel file must be 2 MB or smaller.");
      const { readPromptWorkbook } = await import("@/lib/prompt-excel");
      const parsed = readPromptWorkbook(await file.arrayBuffer());
      setRows(parsed.rows); setIssues(parsed.issues);
    } catch (error) { setResult({ ok: false, message: error instanceof Error ? error.message : "Could not read this Excel file." }); }
    finally { setBusy(false); }
  }

  async function importRows() {
    if (!rows.length || busy) return;
    setBusy(true); setResult(null);
    try {
      const response = admin ? await importAdminPrompts(JSON.stringify(rows), status) : await importContributorPrompts(JSON.stringify(rows));
      setResult(response);
      if (response.ok) { setRows([]); setFilename(""); if (input.current) input.current.value = ""; router.refresh(); }
    } catch { setResult({ ok: false, message: "The import response could not be received. Check your prompt list before retrying to avoid creating copies." }); }
    finally { setBusy(false); }
  }

  return <section className="space-y-5 rounded-2xl border border-outline-variant bg-surface p-6">
    <div><h2 className="text-xl font-bold">Excel import & export</h2><p className="mt-2 text-sm text-on-surface-variant">Download the template, share it with contributors, and fill one prompt per row. Import up to 100 prompts at once.</p></div>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => download(false)} className={buttonClass}>Download Excel template</button>
      <button type="button" disabled={busy || !prompts.length} onClick={() => download(true)} className={buttonClass}>Export {admin ? "all" : "my"} prompts ({prompts.length})</button>
    </div>
    <label className="block text-sm font-semibold">Choose completed Excel file (.xlsx, max 2 MB)<input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => void chooseFile(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-outline-variant p-3 font-normal" /></label>
    <p className="text-sm text-on-surface-variant">Imports create new prompts. They do not update existing prompts; importing the same file again creates copies. {admin ? "Choose whether to publish or send the imported prompts to review." : autoPublish ? "Your approved direct-publishing permission also applies to Excel imports." : "Imported prompts will be sent to admin for approval."}</p>
    {issues.length > 0 && <div role="alert" className="rounded-xl border border-red-400 p-4"><p className="font-semibold">Nothing imported. Fix these errors in Excel and select the file again:</p><ul className="mt-3 max-h-64 list-disc space-y-1 overflow-auto pl-5 text-sm">{issues.map((issue, index) => <li key={index}>{issue.row ? `Row ${issue.row}: ` : ""}{issue.message}</li>)}</ul></div>}
    {rows.length > 0 && <div className="space-y-4"><p className="font-semibold">Ready to import {rows.length} prompts from {filename}</p><div className="max-h-80 overflow-auto rounded-xl border border-outline-variant"><table className="w-full text-left text-sm"><thead className="bg-background"><tr><th className="p-3">Excel row</th><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Previews</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-outline-variant"><td className="p-3">{index + 2}</td><td className="p-3">{row.title}</td><td className="p-3">{row.category}</td><td className="whitespace-nowrap p-3">{row.price ? `PKR ${row.price}` : "Free"}</td><td className="p-3">{row.media_urls.length}</td></tr>)}</tbody></table></div>
      {admin && <label className="block max-w-sm text-sm font-semibold">Import status<select value={status} disabled={busy} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3"><option value="pending">Pending review</option><option value="approved">Publish immediately</option></select></label>}
      <button type="button" disabled={busy} onClick={importRows} className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-50">Import {rows.length} new prompts</button>
    </div>}
    {busy && <p role="status" className="text-sm">Processing…</p>}
    {result && <p role={result.ok ? "status" : "alert"} className={`whitespace-pre-wrap rounded-xl border p-4 text-sm ${result.ok ? "border-primary text-primary" : "border-red-400 text-red-600"}`}>{result.message}</p>}
  </section>;
}
