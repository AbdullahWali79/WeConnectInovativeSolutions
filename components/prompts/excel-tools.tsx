"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PromptMedia } from "./library";
import { SubmissionFormShare } from "./submission-form-share";
import type { Prompt } from "@/lib/prompts";
import type { PromptImportIssue, PromptImportRow } from "@/lib/prompt-import";
import { validatePromptImport } from "@/lib/prompt-import";
import type { PromptImportDraft, PromptExcelSheet } from "@/lib/prompt-excel";
import { importAdminPrompts } from "@/app/admin/prompts/actions";
import { importContributorPrompts, type PromptActionResult } from "@/app/prompts/actions";

const buttonClass = "rounded-full border border-outline-variant px-5 py-3 text-sm font-semibold disabled:opacity-50";

export function PromptExcelTools({ prompts, admin = false, autoPublish = false }: { prompts: Prompt[]; admin?: boolean; autoPublish?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const fileBytes = useRef<ArrayBuffer | null>(null);
  const [sheets, setSheets] = useState<PromptExcelSheet[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [columns, setColumns] = useState<number[]>([]);
  const [fields, setFields] = useState<{ label: string; required: boolean }[]>([]);
  const [drafts, setDrafts] = useState<PromptImportDraft[]>([]);
  const [rows, setRows] = useState<PromptImportRow[]>([]);
  const [issues, setIssues] = useState<PromptImportIssue[]>([]);
  const [result, setResult] = useState<PromptActionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState("");
  const [published, setPublished] = useState(false);
  const saving = useRef(false);

  async function download(exportExisting: boolean) {
    setBusy(true); setResult(null);
    try {
      const { downloadPromptWorkbook } = await import("@/lib/prompt-excel");
      downloadPromptWorkbook(exportExisting ? prompts : undefined);
    } catch { setResult({ ok: false, message: "Could not download the workbook. Please retry." }); }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    setDrafts([]); setRows([]); setIssues([]); setResult(null); setSheets([]); fileBytes.current = null; setFilename(file?.name ?? ""); setPublished(false);
    if (!file) return;
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an .xlsx Excel workbook using the template below.");
      if (file.size > 2 * 1024 * 1024) throw new Error("Excel file must be 2 MB or smaller.");
      const excel = await import("@/lib/prompt-excel");
      const bytes = await file.arrayBuffer();
      const found = excel.inspectPromptWorkbook(bytes);
      if (!found.length) throw new Error("No response sheet found in this workbook.");
      fileBytes.current = bytes;
      setSheets(found);
      setFields(excel.PROMPT_EXCEL_HEADERS.map((label, index) => ({ label, required: excel.PROMPT_REQUIRED_COLUMNS.includes(index) })));
      const initial = found.find((sheet) => sheet.name === "Prompts" && sheet.hasData) ?? found.find((sheet) => sheet.hasData) ?? found[0];
      const suggested = excel.suggestPromptColumns(initial.headers);
      setSheetName(initial.name); setColumns(suggested);
      if (admin || excel.PROMPT_REQUIRED_COLUMNS.every((index) => suggested[index] >= 0)) {
        const parsed = excel.readPromptWorkbook(bytes, { sheetName: initial.name, columns: suggested, allowCorrections: admin });
        setRows(parsed.rows); setIssues(parsed.issues); setDrafts(admin ? parsed.drafts : []);
      }
    } catch (error) { setResult({ ok: false, message: error instanceof Error ? error.message : "Could not read this Excel file." }); }
    finally { setBusy(false); }
  }

  async function chooseSheet(name: string) {
    setDrafts([]); setSheetName(name); setColumns([]); setRows([]); setIssues([]); setResult(null); setBusy(true);
    try {
      const { suggestPromptColumns } = await import("@/lib/prompt-excel");
      setColumns(suggestPromptColumns(sheets.find((sheet) => sheet.name === name)?.headers ?? []));
    } catch { setResult({ ok: false, message: "Could not select this sheet. Please choose the file again." }); }
    finally { setBusy(false); }
  }

  async function validateColumns() {
    if (!fileBytes.current) return;
    setBusy(true); setRows([]); setIssues([]); setResult(null);
    try {
      const { readPromptWorkbook } = await import("@/lib/prompt-excel");
      const parsed = readPromptWorkbook(fileBytes.current, { sheetName, columns, allowCorrections: admin });
      setRows(parsed.rows); setIssues(parsed.issues); setDrafts(admin ? parsed.drafts : []);
    } catch (error) { setResult({ ok: false, message: error instanceof Error ? error.message : "Could not validate the selected columns." }); }
    finally { setBusy(false); }
  }

  async function importRows(status: "pending" | "approved" = "pending") {
    if (busy || saving.current) return;
    setResult(null); setPublished(false);
    const checked = validatePromptImport(admin ? drafts.map((draft) => ({ ...draft, media_urls: draft.media_urls.map((url) => url.trim()).filter(Boolean), price: draft.price === "" ? undefined : draft.price })) : rows);
    setRows(checked.rows); setIssues(checked.issues);
    if (checked.issues.length) return;
    saving.current = true;
    setBusy(true);
    try {
      const response = admin ? await importAdminPrompts(JSON.stringify(checked.rows), status) : await importContributorPrompts(JSON.stringify(checked.rows));
      setResult(response);
      if (response.ok) { setPublished(admin && status === "approved"); setDrafts([]); setRows([]); setFilename(""); setSheets([]); fileBytes.current = null; if (input.current) input.current.value = ""; router.refresh(); }
    } catch { setResult({ ok: false, message: "The import response could not be received. Check your prompt list before retrying to avoid creating copies." }); }
    finally { saving.current = false; setBusy(false); }
  }

  return <section className="space-y-5 rounded-2xl border border-outline-variant bg-surface p-6">
    <div><h2 className="text-xl font-bold">Excel import & export</h2><p className="mt-2 text-sm text-on-surface-variant">Import your Google Form response spreadsheet or use our template. Download responses from Google Sheets as Excel (.xlsx), then upload here. Import up to 100 prompts at once.</p></div>
    {admin && <details className="rounded-xl border border-outline-variant p-4"><summary className="cursor-pointer font-semibold">Share student submission form</summary><div className="mt-4"><SubmissionFormShare /></div></details>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => download(false)} className={buttonClass}>Download Excel template</button>
      <button type="button" disabled={busy || !prompts.length} onClick={() => download(true)} className={buttonClass}>Export {admin ? "all" : "my"} prompts ({prompts.length})</button>
    </div>
    <label className="block text-sm font-semibold">Choose completed Excel file (.xlsx, max 2 MB)<input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => void chooseFile(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-outline-variant p-3 font-normal" /></label>
    {admin && <div className="sticky top-2 z-10 space-y-2 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy || !drafts.length} onClick={() => void importRows("pending")} className={buttonClass}>Save for review{drafts.length ? ` (${drafts.length})` : ""}</button>
        <button type="button" disabled={busy || !drafts.length} onClick={() => void importRows("approved")} className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-50">Save &amp; Publish{drafts.length ? ` (${drafts.length})` : ""}</button>
        <a href="/prompts" target="_blank" rel="noopener noreferrer" className={buttonClass}>View public prompt library</a>
      </div>
      <p className="text-sm text-on-surface-variant">{drafts.length ? "Save & Publish validates your latest edits, saves all submissions and makes them live on the public prompt library. Save for review keeps them hidden until published." : "Choose an Excel file to enable saving and publishing. Match columns and preview rows if needed."}</p>
      {published && <p role="status" className="font-semibold text-primary">Prompts are now live. <a href="/prompts" target="_blank" rel="noopener noreferrer" className="underline">View published prompts</a></p>}
    </div>}
    {sheets.length > 0 && <div className="space-y-4 rounded-xl border border-outline-variant p-4">
      <label className="block text-sm font-semibold">Response sheet<select disabled={busy} value={sheetName} onChange={(event) => void chooseSheet(event.target.value)} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3">{sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></label>
      <div><h3 className="font-semibold">Match your form columns</h3><p className="mt-1 text-sm text-on-surface-variant">Headings must be in the first row. Match each field to your form question. Timestamp, email and other unmapped columns are ignored. Drive URL 1 can contain multiple links separated by commas or new lines. An unmapped price defaults to free (PKR 0).</p></div>
      <div className="grid gap-3 md:grid-cols-2">{fields.map((field, index) => <label key={field.label} className="block text-sm font-semibold">{field.label}{field.required ? " *" : ""}<select disabled={busy} value={columns[index] ?? -1} onChange={(event) => { const next = [...columns]; next[index] = Number(event.target.value); setColumns(next); setDrafts([]); setRows([]); setIssues([]); setResult(null); }} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3 font-normal"><option value={-1}>{field.required ? "Choose a column" : index === 5 ? "Not provided — free (0)" : "Not provided"}</option>{(sheets.find((sheet) => sheet.name === sheetName)?.headers ?? []).map((header, sourceIndex) => <option key={sourceIndex} value={sourceIndex}>{sourceIndex + 1}. {header || "(blank heading)"}</option>)}</select></label>)}</div>
      <button type="button" disabled={busy} onClick={validateColumns} className={buttonClass}>Validate & preview rows</button>
    </div>}
    <p className="text-sm text-on-surface-variant">Imports create new prompts. They do not update existing prompts; importing the same file again creates copies. {admin ? "Choose whether to publish or send the imported prompts to review." : autoPublish ? "Your approved direct-publishing permission also applies to Excel imports." : "Imported prompts will be sent to admin for approval."}</p>
    {issues.length > 0 && <div role="alert" className="rounded-xl border border-red-400 p-4"><p className="font-semibold">{admin ? "Nothing imported yet. Fix these errors in the row editors below, then validate again:" : "Nothing imported. Fix these errors in Excel and select the file again:"}</p><ul className="mt-3 max-h-64 list-disc space-y-1 overflow-auto pl-5 text-sm">{issues.map((issue, index) => <li key={index}>{issue.row ? `Row ${issue.row}: ` : ""}{issue.message}</li>)}</ul></div>}
    {admin && drafts.length > 0 && <div className="space-y-3">
      <h3 className="font-semibold">Review & edit submissions ({drafts.length})</h3>
      <p className="text-sm text-on-surface-variant">Complete missing details before importing. Check placeholder categories such as Option 1. Selecting another file or remapping columns resets preview edits. After import, use Prompts to edit any saved prompt.</p>
      {drafts.map((draft, index) => <details key={index} className="rounded-xl border border-outline-variant p-4">
        <summary className="cursor-pointer break-words font-semibold">Row {index + 2}: {draft.title || "Untitled prompt"} — Edit submission{issues.some((issue) => issue.row === index + 2) ? " (needs correction)" : ""}</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{([['title', 'Title'], ['description', 'Description'], ['category', 'Category'], ['model', 'AI model / tool'], ['template', 'Prompt template'], ['price', 'Price (PKR)'], ['purchase_url', 'Purchase URL'], ['media_urls', 'Google Drive links (one per line)']] as const).map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<textarea disabled={busy} rows={key === 'template' ? 8 : ['description', 'media_urls'].includes(key) ? 3 : 1} value={key === 'media_urls' ? draft.media_urls.join('\n') : String(draft[key] ?? '')} onChange={(event) => {
          const value = event.target.value;
          setDrafts((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: key === 'media_urls' ? value.split(/\r?\n/) : value } : row));
          setRows([]); setIssues([]); setResult(null);
        }} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3 font-normal" /></label>)}</div>
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold">Output image / video previews</h4>
          <PromptMedia urls={draft.media_urls.map((url) => url.trim()).filter(Boolean).slice(0, 6)} title={draft.title || `Row ${index + 2}`} />
          <p className="text-sm text-on-surface-variant">Previews update when you edit the Drive links. Set each file to Anyone with the link. If a preview cannot load, use Open preview in Google Drive.</p>
        </div>
      </details>)}
      <button type="button" disabled={busy} className={buttonClass} onClick={() => {
        const checked = validatePromptImport(drafts.map((draft) => ({ ...draft, media_urls: draft.media_urls.map((url) => url.trim()).filter(Boolean), price: draft.price === '' ? undefined : draft.price })));
        setRows(checked.rows); setIssues(checked.issues); setResult(null);
      }}>Validate edited submissions</button>
    </div>}
    {rows.length > 0 && <div className="space-y-4"><p className="font-semibold">Ready to import {rows.length} prompts from {filename}</p><div className="max-h-80 overflow-auto rounded-xl border border-outline-variant"><table className="w-full text-left text-sm"><thead className="bg-background"><tr><th className="p-3">Excel row</th><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Previews</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-outline-variant"><td className="p-3">{index + 2}</td><td className="p-3">{row.title}</td><td className="p-3">{row.category}</td><td className="whitespace-nowrap p-3">{row.price ? `PKR ${row.price}` : "Free"}</td><td className="p-3">{row.media_urls.length}</td></tr>)}</tbody></table></div>
      {!admin && <button type="button" disabled={busy} onClick={() => void importRows()} className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-50">Import {rows.length} new prompts</button>}
    </div>}
    {busy && <p role="status" className="text-sm">Processing…</p>}
    {result && <p role={result.ok ? "status" : "alert"} className={`whitespace-pre-wrap rounded-xl border p-4 text-sm ${result.ok ? "border-primary text-primary" : "border-red-400 text-red-600"}`}>{result.message}</p>}
  </section>;
}
