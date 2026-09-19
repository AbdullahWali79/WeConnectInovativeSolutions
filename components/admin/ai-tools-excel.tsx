"use client";

import { useRef, useState } from "react";
import * as xlsx from "xlsx";
import { Icon } from "@/components/icon";
import { importAdminAIToolsBulk } from "@/app/admin/ai-tools/actions";
import type { AITool } from "@/lib/ai-tools";

const TEMPLATE_HEADERS = [
  "Tool name",
  "Category",
  "Official URL",
  "Benefits for students",
  "Public image or Google Drive URL",
  "YouTube learning video URL (optional)"
];

export function AIToolsExcelManager({ existingTools }: { existingTools: AITool[] }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const ws = xlsx.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "AI Tools");
    xlsx.writeFile(wb, "AI_Tools_Template.xlsx");
  }

  function exportTools() {
    if (existingTools.length === 0) {
      setStatus({ type: "error", message: "No approved AI tools to export." });
      return;
    }
    
    const data = [
      TEMPLATE_HEADERS,
      ...existingTools.map(tool => [
        tool.name,
        tool.category || "Uncategorized",
        tool.url,
        tool.benefits,
        tool.image_url,
        tool.youtube_url || ""
      ])
    ];

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Published Tools");
    xlsx.writeFile(wb, `AI_Tools_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(null);
    setBusy(true);

    try {
      const bytes = await file.arrayBuffer();
      const wb = xlsx.read(bytes, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Excel file is empty.");

      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

      if (data.length < 2) throw new Error("No rows found in the Excel file.");

      const headers = (data[0] as string[]).map(h => String(h || "").trim());
      
      const colName = headers.indexOf(TEMPLATE_HEADERS[0]);
      const colCategory = headers.indexOf(TEMPLATE_HEADERS[1]);
      const colUrl = headers.indexOf(TEMPLATE_HEADERS[2]);
      const colBenefits = headers.indexOf(TEMPLATE_HEADERS[3]);
      const colImage = headers.indexOf(TEMPLATE_HEADERS[4]);
      const colYoutube = headers.indexOf(TEMPLATE_HEADERS[5]);

      if (colName === -1 || colUrl === -1 || colBenefits === -1 || colImage === -1 || colCategory === -1) {
        throw new Error("Missing required columns. Please use the downloaded template.");
      }

      const rows = data.slice(1).filter(row => row && row.length > 0 && String(row[colName] || "").trim());
      
      if (rows.length === 0) throw new Error("No valid tool rows found to import.");

      const toolsToImport = rows.map((row: unknown[]) => ({
        name: String(row[colName] || "").trim(),
        category: String(row[colCategory] || "Uncategorized").trim(),
        url: String(row[colUrl] || "").trim(),
        benefits: String(row[colBenefits] || "").trim(),
        image_url: String(row[colImage] || "").trim(),
        youtube_url: String(row[colYoutube] || "").trim() || undefined,
      }));

      const result = await importAdminAIToolsBulk(toolsToImport);
      
      if (result.ok) {
        setStatus({ type: "success", message: result.message || "Import completed." });
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to process Excel file." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-5">
      <h2 className="text-xl font-black">Excel Import & Export</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Use Excel to bulk upload AI tools or export existing published tools.
      </p>

      {status && (
        <div className={`mt-4 rounded-xl border p-4 text-sm font-bold ${status.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          {status.message}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate} disabled={busy} className="wc-secondary-btn">
          <Icon name="download" /> Download Template
        </button>
        <button type="button" onClick={exportTools} disabled={busy || existingTools.length === 0} className="wc-secondary-btn">
          <Icon name="ios_share" /> Export All Published Tools
        </button>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileSelect}
            disabled={busy}
            className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
          />
          <button type="button" disabled={busy} className="wc-primary-btn pointer-events-none">
            <Icon name="upload_file" /> {busy ? "Importing..." : "Import from Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
