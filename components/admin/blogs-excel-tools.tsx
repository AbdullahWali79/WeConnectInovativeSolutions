"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogExcelSheet, BlogImportRow } from "@/lib/blog-excel";

const buttonClass = "rounded-full border border-outline-variant px-5 py-3 text-sm font-semibold disabled:opacity-50";

export function BlogsExcelTools() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const fileBytes = useRef<ArrayBuffer | null>(null);
  const [sheets, setSheets] = useState<BlogExcelSheet[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<BlogImportRow[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  
  async function download() {
    setBusy(true);
    try {
      const { downloadBlogWorkbook } = await import("@/lib/blog-excel");
      downloadBlogWorkbook();
    } catch { 
      setToast({ type: "error", message: "Could not download the workbook. Please retry." }); 
    }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    setRows([]); setIssues([]); setSheets([]); fileBytes.current = null; setFilename(file?.name ?? "");
    if (!file) return;
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an .xlsx Excel workbook.");
      if (file.size > 2 * 1024 * 1024) throw new Error("Excel file must be 2 MB or smaller.");
      const excel = await import("@/lib/blog-excel");
      const bytes = await file.arrayBuffer();
      const found = excel.inspectBlogWorkbook(bytes);
      if (!found.length) throw new Error("No readable sheets found.");
      fileBytes.current = bytes;
      setSheets(found);
      
      const initial = found.find((sheet) => sheet.name === "Blogs" && sheet.hasData) ?? found.find((sheet) => sheet.hasData) ?? found[0];
      setSheetName(initial.name);
      
      const parsed = excel.readBlogWorkbook(bytes, initial.name);
      setRows(parsed.rows); 
      setIssues(parsed.issues);
    } catch (error) { 
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not read this Excel file." }); 
    }
    finally { setBusy(false); }
  }

  async function chooseSheet(name: string) {
    setSheetName(name); setRows([]); setIssues([]); setBusy(true);
    if (!fileBytes.current) return;
    try {
      const { readBlogWorkbook } = await import("@/lib/blog-excel");
      const parsed = readBlogWorkbook(fileBytes.current, name);
      setRows(parsed.rows);
      setIssues(parsed.issues);
    } catch { 
      setToast({ type: "error", message: "Could not read this sheet." }); 
    }
    finally { setBusy(false); }
  }

  async function importRows() {
    if (busy || rows.length === 0) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Check for duplicates by slug
      const { data: existingBlogs, error: fetchError } = await supabase.from("blogs").select("slug");
      if (fetchError) throw new Error("Could not verify duplicates from database");

      const existingSlugs = new Set(existingBlogs?.map(b => b.slug) || []);
      const newRows = rows.filter(r => !existingSlugs.has(r.slug));
      const duplicateCount = rows.length - newRows.length;

      if (newRows.length === 0) {
        setToast({ type: "error", message: `All ${duplicateCount} blogs were skipped because their Slugs already exist in the database.` });
        setBusy(false);
        return;
      }

      const { error } = await supabase.from("blogs").insert(newRows);
      
      if (error) {
        setToast({ type: "error", message: error.message });
      } else {
        const msg = duplicateCount > 0 
          ? `Successfully imported ${newRows.length} blogs! (${duplicateCount} duplicate slugs skipped)`
          : `Successfully imported ${newRows.length} blogs!`;
        setToast({ type: "success", message: msg });
        setRows([]);
        setIssues([]);
        setFilename("");
        fileBytes.current = null;
        if (input.current) input.current.value = "";
        
        // Refresh router so the BlogsManager table updates
        router.refresh();
      }
    } catch (err: unknown) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to import" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-low p-6">
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Bulk Import Blogs</h3>
          <p className="text-sm text-on-surface-variant">Download the template, fill it offline, and import multiple blogs at once.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => download()} disabled={busy} className={`${buttonClass} bg-white text-primary hover:bg-surface-container-high`}>
            <Icon name="download" className="mr-2 inline-block align-bottom" />
            Download Template
          </button>
          
          <label className={`${buttonClass} cursor-pointer bg-primary text-white hover:bg-primary/90 ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <input type="file" ref={input} className="hidden" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => chooseFile(e.target.files?.[0])} />
            <Icon name="upload" className="mr-2 inline-block align-bottom" />
            Import Excel
          </label>
        </div>
      </div>

      {filename ? (
        <div className="mt-6 rounded-xl border border-outline-variant bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-on-surface"><Icon name="description" className="mr-2 inline-block text-primary align-bottom" /> {filename}</p>
              {sheets.length > 1 ? (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm font-semibold text-on-surface-variant">Select Sheet:</label>
                  <select className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm" value={sheetName} onChange={(e) => chooseSheet(e.target.value)} disabled={busy}>
                    {sheets.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.hasData ? "Has Data" : "Empty"})</option>)}
                  </select>
                </div>
              ) : null}
            </div>
            
            {rows.length > 0 ? (
              <button onClick={importRows} disabled={busy} className="rounded-xl bg-primary px-6 py-3 font-bold text-white shadow hover:bg-primary/90 disabled:opacity-50">
                {busy ? "Importing..." : `Import ${rows.length} Blogs`}
              </button>
            ) : null}
          </div>

          {issues.length > 0 ? (
            <div className="mb-4 rounded-xl border border-error/20 bg-error/5 p-4">
              <h4 className="mb-2 font-bold text-error flex items-center gap-2"><Icon name="warning" /> Import Issues Found</h4>
              <ul className="list-inside list-disc text-sm text-error/80">
                {issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
              <p className="mt-2 text-xs text-error/60">Rows with missing required fields are skipped. Please fix your Excel file and upload again.</p>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-low text-sm">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface-container font-bold text-on-surface shadow-sm">
                  <tr>
                    <th className="p-3">Title</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Tags</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 bg-white">
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium text-primary">{row.title}</td>
                      <td className="p-3 text-on-surface-variant">{row.slug}</td>
                      <td className="p-3 text-xs">{(row.tags || []).join(", ")}</td>
                      <td className="p-3 text-xs">
                        {row.published ? <span className="rounded bg-green-100 px-2 py-1 text-green-700">Published</span> : <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Draft</span>}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 10 ? (
                    <tr><td colSpan={4} className="p-3 text-center text-on-surface-variant italic">+ {rows.length - 10} more rows ready</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant italic text-center p-4">No valid blogs found in the selected sheet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
