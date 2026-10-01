"use client";
import { CmsElement } from "@/components/cms/cms-element";

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

export function PromptExcelTools({ prompts, admin = false, autoPublish = false, onManagePrompts }: { prompts: Prompt[]; admin?: boolean; autoPublish?: boolean; onManagePrompts?: () => void }) {
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
    const payloadToValidate = admin ? drafts.map((draft) => ({
      ...draft,
      title: (draft.title || "Untitled Prompt").trim().padEnd(3, ".").slice(0, 140),
      description: (draft.description || "Pending description...").trim().padEnd(10, ".").slice(0, 2000),
      category: (draft.category || "Uncategorized").trim().padEnd(2, ".").slice(0, 60),
      model: (draft.model || "Unknown model").trim().padEnd(2, ".").slice(0, 80),
      template: (draft.template || "Pending template...").trim().padEnd(20, ".").slice(0, 30000),
      media_urls: draft.media_urls.map((url) => url.trim()).filter(Boolean),
      price: draft.price === "" || isNaN(Number(draft.price)) ? undefined : draft.price,
      purchase_url: typeof draft.purchase_url === "string" && draft.purchase_url.startsWith("https://") ? draft.purchase_url.slice(0, 1000) : undefined
    })) : rows;
    
    const checked = validatePromptImport(payloadToValidate, admin);
    setRows(checked.rows); setIssues(checked.issues);
    
    if (checked.issues.length > 0 && !admin) return;
    if (checked.rows.length === 0) {
      setResult({ ok: false, message: "No valid prompts to import. Check the issues above." });
      return;
    }
    
    saving.current = true;
    setBusy(true);
    try {
      const response = admin ? await importAdminPrompts(JSON.stringify(checked.rows), status) : await importContributorPrompts(JSON.stringify(checked.rows));
      const fileDuplicates = checked.issues.filter((issue) => issue.message.startsWith("Duplicate ")).length;
      setResult(fileDuplicates ? { ...response, message: `${response.message} ${fileDuplicates} duplicate rows skipped within this file.` } : response);
      if (response.ok) { setPublished(admin && status === "approved" && !response.message.startsWith("0 prompts imported")); setDrafts([]); setRows([]); setFilename(""); setSheets([]); fileBytes.current = null; if (input.current) input.current.value = ""; router.refresh(); }
    } catch { setResult({ ok: false, message: "The import response could not be received. Check your prompt list before retrying to avoid creating copies." }); }
    finally { saving.current = false; setBusy(false); }
  }

  return <CmsElement cmsId="1f976179-0" as="section" className="space-y-5 rounded-2xl border border-outline-variant bg-surface p-6">
    <CmsElement cmsId="1f976179-1" as="div"><CmsElement cmsId="1f976179-2" as="h2" className="text-xl font-bold">Excel import & export</CmsElement><CmsElement cmsId="1f976179-3" as="p" className="mt-2 text-sm text-on-surface-variant">Import your Google Form response spreadsheet or use our template. Download responses from Google Sheets as Excel (.xlsx), then upload here. Import up to 100 prompts at once.</CmsElement></CmsElement>
    {admin && <details className="rounded-xl border border-outline-variant p-4"><summary className="cursor-pointer font-semibold">Share student submission form</summary><CmsElement cmsId="1f976179-4" as="div" className="mt-4"><SubmissionFormShare /></CmsElement></details>}
    <CmsElement cmsId="1f976179-5" as="div" className="flex flex-wrap gap-3">
      <CmsElement cmsId="1f976179-6" as="button" type="button" disabled={busy} onClick={() => download(false)} className={buttonClass}>Download Excel template</CmsElement>
      <CmsElement cmsId="1f976179-7" as="button" type="button" disabled={busy || !prompts.length} onClick={() => download(true)} className={buttonClass}>Export {admin ? "all" : "my"} prompts ({prompts.length})</CmsElement>
    </CmsElement>
    <CmsElement cmsId="1f976179-8" as="label" className="block text-sm font-semibold">Choose completed Excel file (.xlsx, max 2 MB)<input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => void chooseFile(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-outline-variant p-3 font-normal" /></CmsElement>
    {admin && <CmsElement cmsId="1f976179-9" as="div" className="sticky top-2 z-10 space-y-2 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <CmsElement cmsId="1f976179-10" as="div" className="flex flex-wrap gap-3 items-center">
        <CmsElement cmsId="1f976179-11" as="button" type="button" disabled={busy || !drafts.length} onClick={() => void importRows("pending")} className={buttonClass}>Save for review{drafts.length ? ` (${drafts.length})` : ""}</CmsElement>
        <CmsElement cmsId="1f976179-12" as="button" type="button" disabled={busy || !drafts.length} onClick={() => void importRows("approved")} className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-50">Save &amp; Publish{drafts.length ? ` (${drafts.length})` : ""}</CmsElement>
        <CmsElement cmsId="1f976179-13" as="a" href="/prompts" target="_blank" rel="noopener noreferrer" className={buttonClass}>View public prompt library</CmsElement>
        {admin && onManagePrompts && <CmsElement cmsId="1f976179-14" as="button" type="button" onClick={onManagePrompts} className="rounded-full border border-outline-variant px-5 py-3 font-semibold hover:bg-surface-variant">Manage all prompts →</CmsElement>}
      </CmsElement>
      <CmsElement cmsId="1f976179-15" as="p" className="text-sm text-on-surface-variant">{drafts.length ? "Save & Publish validates your latest edits, saves valid new submissions and makes them live on the public prompt library. Save for review keeps them hidden until published." : "Choose an Excel file to enable saving and publishing. Match columns and preview rows if needed."}</CmsElement>
      {published && <CmsElement cmsId="1f976179-16" as="p" role="status" className="font-semibold text-primary">Prompts are now live. <CmsElement cmsId="1f976179-17" as="a" href="/prompts" target="_blank" rel="noopener noreferrer" className="underline">View published prompts</CmsElement></CmsElement>}
    </CmsElement>}
    {sheets.length > 0 && <CmsElement cmsId="1f976179-18" as="div" className="space-y-4 rounded-xl border border-outline-variant p-4">
      <CmsElement cmsId="1f976179-19" as="label" className="block text-sm font-semibold">Response sheet<select disabled={busy} value={sheetName} onChange={(event) => void chooseSheet(event.target.value)} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3">{sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></CmsElement>
      <CmsElement cmsId="1f976179-20" as="div"><CmsElement cmsId="1f976179-21" as="h3" className="font-semibold">Match your form columns</CmsElement><CmsElement cmsId="1f976179-22" as="p" className="mt-1 text-sm text-on-surface-variant">Headings must be in the first row. Match each field to your form question. Timestamp, email and other unmapped columns are ignored. Drive URL 1 can contain multiple links separated by commas or new lines. An unmapped price defaults to free (PKR 0).</CmsElement></CmsElement>
      <CmsElement cmsId="1f976179-23" as="div" className="grid gap-3 md:grid-cols-2">{fields.map((field, index) => <CmsElement cmsId="1f976179-24" as="label" instance={String(field.label)} key={field.label} className="block text-sm font-semibold">{field.label}{field.required ? " *" : ""}<select disabled={busy} value={columns[index] ?? -1} onChange={(event) => { const next = [...columns]; next[index] = Number(event.target.value); setColumns(next); setDrafts([]); setRows([]); setIssues([]); setResult(null); }} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3 font-normal"><option value={-1}>{field.required ? "Choose a column" : index === 5 ? "Not provided — free (0)" : "Not provided"}</option>{(sheets.find((sheet) => sheet.name === sheetName)?.headers ?? []).map((header, sourceIndex) => <option key={sourceIndex} value={sourceIndex}>{sourceIndex + 1}. {header || "(blank heading)"}</option>)}</select></CmsElement>)}</CmsElement>
      <CmsElement cmsId="1f976179-25" as="button" type="button" disabled={busy} onClick={validateColumns} className={buttonClass}>Validate & preview rows</CmsElement>
    </CmsElement>}
    <CmsElement cmsId="1f976179-26" as="p" className="text-sm text-on-surface-variant">Imports create new prompts and skip matches already in the library. A matching title (ignoring capital/small letters), image / Drive file, or complete prompt text including variables counts as a duplicate. Shared variable names alone do not count. Duplicates within this file are flagged below. {admin ? "Choose whether to publish or send the imported prompts to review." : autoPublish ? "Your approved direct-publishing permission also applies to Excel imports." : "Imported prompts will be sent to admin for approval."}</CmsElement>
    {issues.length > 0 && <CmsElement cmsId="1f976179-27" as="div" role="alert" className="rounded-xl border border-red-400 p-4"><CmsElement cmsId="1f976179-28" as="p" className="font-semibold">{admin ? "Nothing imported yet. Fix these errors in the row editors below, then validate again:" : "Nothing imported. Fix these errors in Excel and select the file again:"}</CmsElement><CmsElement cmsId="1f976179-29" as="ul" className="mt-3 max-h-64 list-disc space-y-1 overflow-auto pl-5 text-sm">{issues.map((issue, index) => <CmsElement cmsId="1f976179-30" as="li" instance={String(index)} key={index}>{issue.row ? `Row ${issue.row}: ` : ""}{issue.message}</CmsElement>)}</CmsElement></CmsElement>}
    {admin && drafts.length > 0 && <CmsElement cmsId="1f976179-31" as="div" className="space-y-3">
      <CmsElement cmsId="1f976179-32" as="h3" className="font-semibold">Review & edit submissions ({drafts.length})</CmsElement>
      <CmsElement cmsId="1f976179-33" as="p" className="text-sm text-on-surface-variant">Complete missing details before importing. Check placeholder categories such as Option 1. Selecting another file or remapping columns resets preview edits. After import, use Prompts to edit any saved prompt.</CmsElement>
      {drafts.map((draft, index) => <details key={index} className="rounded-xl border border-outline-variant p-4">
        <summary className="cursor-pointer break-words font-semibold">Row {index + 2}: {draft.title || "Untitled prompt"} — Edit submission{issues.some((issue) => issue.row === index + 2) ? " (needs correction)" : ""}</summary>
        <CmsElement cmsId="1f976179-34" as="div" className="mt-4 grid gap-4 md:grid-cols-2">{([['title', 'Title'], ['description', 'Description'], ['category', 'Category'], ['model', 'AI model / tool'], ['template', 'Prompt template'], ['price', 'Price (PKR)'], ['purchase_url', 'Purchase URL'], ['media_urls', 'Google Drive links (one per line)']] as const).map(([key, label]) => <CmsElement cmsId="1f976179-35" as="label" instance={String(key)} key={key} className="block text-sm font-semibold">{label}<textarea disabled={busy} rows={key === 'template' ? 8 : ['description', 'media_urls'].includes(key) ? 3 : 1} value={key === 'media_urls' ? draft.media_urls.join('\n') : String(draft[key] ?? '')} onChange={(event) => {
          const value = event.target.value;
          setDrafts((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: key === 'media_urls' ? value.split(/\r?\n/) : value } : row));
          setRows([]); setIssues([]); setResult(null);
        }} className="mt-2 w-full rounded-xl border border-outline-variant bg-background p-3 font-normal" /></CmsElement>)}</CmsElement>
        <CmsElement cmsId="1f976179-36" as="div" className="mt-4 space-y-3">
          <CmsElement cmsId="1f976179-37" as="h4" className="text-sm font-semibold">Output image / video previews</CmsElement>
          <PromptMedia urls={draft.media_urls.map((url) => url.trim()).filter(Boolean).slice(0, 6)} title={draft.title || `Row ${index + 2}`} />
          <CmsElement cmsId="1f976179-38" as="p" className="text-sm text-on-surface-variant">Previews update when you edit the Drive links. Set each file to Anyone with the link. If a preview cannot load, use Open preview in Google Drive.</CmsElement>
        </CmsElement>
      </details>)}
      <CmsElement cmsId="1f976179-39" as="button" type="button" disabled={busy} className={buttonClass} onClick={() => {
        const payloadToValidate = drafts.map((draft) => ({
          ...draft,
          title: (draft.title || "Untitled Prompt").trim().padEnd(3, ".").slice(0, 140),
          description: (draft.description || "Pending description...").trim().padEnd(10, ".").slice(0, 2000),
          category: (draft.category || "Uncategorized").trim().padEnd(2, ".").slice(0, 60),
          model: (draft.model || "Unknown model").trim().padEnd(2, ".").slice(0, 80),
          template: (draft.template || "Pending template...").trim().padEnd(20, ".").slice(0, 30000),
          media_urls: draft.media_urls.map((url) => url.trim()).filter(Boolean),
          price: draft.price === '' || isNaN(Number(draft.price)) ? undefined : draft.price,
          purchase_url: typeof draft.purchase_url === "string" && draft.purchase_url.startsWith("https://") ? draft.purchase_url.slice(0, 1000) : undefined
        }));
        const checked = validatePromptImport(payloadToValidate, true);
        setRows(checked.rows); setIssues(checked.issues); setResult(null);
      }}>Validate edited submissions</CmsElement>
    </CmsElement>}
    {rows.length > 0 && <CmsElement cmsId="1f976179-40" as="div" className="space-y-4"><CmsElement cmsId="1f976179-41" as="p" className="font-semibold">Ready to import {rows.length} prompts from {filename}</CmsElement><CmsElement cmsId="1f976179-42" as="div" className="max-h-80 overflow-auto rounded-xl border border-outline-variant"><CmsElement cmsId="1f976179-43" as="table" className="w-full text-left text-sm"><CmsElement cmsId="1f976179-44" as="thead" className="bg-background"><CmsElement cmsId="1f976179-45" as="tr"><CmsElement cmsId="1f976179-46" as="th" className="p-3">Excel row</CmsElement><CmsElement cmsId="1f976179-47" as="th" className="p-3">Title</CmsElement><CmsElement cmsId="1f976179-48" as="th" className="p-3">Category</CmsElement><CmsElement cmsId="1f976179-49" as="th" className="p-3">Price</CmsElement><CmsElement cmsId="1f976179-50" as="th" className="p-3">Previews</CmsElement></CmsElement></CmsElement><CmsElement cmsId="1f976179-51" as="tbody">{rows.map((row, index) => <CmsElement cmsId="1f976179-52" as="tr" instance={String(index)} key={index} className="border-t border-outline-variant"><CmsElement cmsId="1f976179-53" as="td" className="p-3">{index + 2}</CmsElement><CmsElement cmsId="1f976179-54" as="td" className="p-3">{row.title}</CmsElement><CmsElement cmsId="1f976179-55" as="td" className="p-3">{row.category}</CmsElement><CmsElement cmsId="1f976179-56" as="td" className="whitespace-nowrap p-3">{row.price ? `PKR ${row.price}` : "Free"}</CmsElement><CmsElement cmsId="1f976179-57" as="td" className="p-3">{row.media_urls.length}</CmsElement></CmsElement>)}</CmsElement></CmsElement></CmsElement>
      {!admin && <CmsElement cmsId="1f976179-58" as="button" type="button" disabled={busy} onClick={() => void importRows()} className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-50">Import {rows.length} new prompts</CmsElement>}
    </CmsElement>}
    {busy && <CmsElement cmsId="1f976179-59" as="p" role="status" className="text-sm">Processing…</CmsElement>}
    {result && <CmsElement cmsId="1f976179-60" as="p" role={result.ok ? "status" : "alert"} className={`whitespace-pre-wrap rounded-xl border p-4 text-sm ${result.ok ? "border-primary text-primary" : "border-red-400 text-red-600"}`}>{result.message}</CmsElement>}
  </CmsElement>;
}
