import * as XLSX from "xlsx";
import type { Prompt } from "./prompts";
import { MAX_PROMPT_IMPORT_BYTES, MAX_PROMPT_IMPORT_ROWS, validatePromptImport, type PromptImportRow } from "./prompt-import";

export const PROMPT_EXCEL_HEADERS = ["Title", "Description", "Category", "AI Model", "Prompt Template", "Price (PKR)", "Purchase URL", "Drive URL 1", "Drive URL 2", "Drive URL 3", "Drive URL 4", "Drive URL 5", "Drive URL 6"];
export const MAX_PROMPT_EXCEL_FILE_BYTES = 2 * 1024 * 1024;
export type PromptExcelSheet = { name: string; headers: string[] };
export const PROMPT_REQUIRED_COLUMNS = [0, 1, 2, 3, 4, 7];

export function suggestPromptColumns(headers: string[]) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = [
    ["Prompt title", "Prompt name"], ["Description / what this prompt creates", "Prompt description", "Description / what this prompt creates (required)"],
    ["Prompt category"], ["AI model / tool", "Model", "AI Tool"], ["Prompt", "Prompt text", "Full prompt"],
    ["Price", "Price (PKR) — 0 for free"], ["Purchase / contact HTTPS link (required for paid prompts)", "Purchase link", "Contact link"],
    ["Output image / video Google Drive links — one per line (up to 6)", "Google Drive links", "Google Drive URL", "Output images", "Image URL", "Upload output images/videos"],
  ];
  return PROMPT_EXCEL_HEADERS.map((label, index) => {
    const candidates = [label, ...(aliases[index] ?? [])].map(normalize);
    return headers.findIndex((header) => candidates.includes(normalize(header)));
  });
}

export function inspectPromptWorkbook(bytes: ArrayBuffer): PromptExcelSheet[] {
  if (bytes.byteLength > MAX_PROMPT_EXCEL_FILE_BYTES) throw new Error("Excel file must be 2 MB or smaller.");
  const workbook = XLSX.read(bytes, { type: "array", sheetRows: 1 });
  return workbook.SheetNames.filter((name) => name !== "Instructions" && name !== "Example (do not import)").map((name) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    if (range.e.c > 99) throw new Error("Use a sheet with at most 100 columns.");
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", range: 0 });
    return { name, headers: (rows[0] ?? []).map((value) => String(value).trim()) };
  });
}

export function createPromptWorkbook(prompts: Pick<Prompt, "title" | "description" | "category" | "model" | "template" | "price" | "purchase_url" | "media_urls">[] = []) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    PROMPT_EXCEL_HEADERS,
    ...prompts.map((p) => [p.title, p.description, p.category, p.model, p.template, Number(p.price), p.purchase_url, ...Array.from({ length: 6 }, (_, index) => p.media_urls[index] ?? "")]),
  ]);
  sheet["!cols"] = [30, 50, 20, 22, 80, 16, 42, ...Array(6).fill({ wch: 44 })].map((width) => typeof width === "number" ? { wch: width } : width);
  sheet["!autofilter"] = { ref: sheet["!ref"] ?? "A1:M1" };
  XLSX.utils.book_append_sheet(workbook, sheet, "Prompts");
  const instructions = XLSX.utils.aoa_to_sheet([
    ["Prompt Library — Excel instructions"],
    ["Fill the Prompts sheet; one prompt per row. Keep the column headings unchanged."],
    [`Import up to ${MAX_PROMPT_IMPORT_ROWS} rows at once. Maximum file size: 2 MB; large prompt text may require smaller batches.`],
    ["Required: Title, Description, Category, AI Model, Prompt Template, Price (PKR), Drive URL 1."],
    ["Use 0 for free prompts. Paid prompts require a positive PKR price and an HTTPS Purchase URL."],
    ["Use {{BusinessName}}, {{TargetAudience}}, etc. in Prompt Template to create fillable fields."],
    ["Upload output images/videos to Google Drive and set sharing to Anyone with the link."],
    ["Paste one Google Drive file link in each Drive URL column (up to 6). Folder links are not supported."],
    ["Import creates NEW prompts. It does not update existing prompts. Reimporting a file creates copies."],
    ["Contributors need approved access. Their prompts follow the admin review/direct-publishing setting."],
    ["Admin chooses publication status on the import screen. Excel cannot change contributor permissions or ownership."],
    ["All rows must be valid before anything is saved. Correct errors and choose the file again."],
    ["Use plain values, not Excel formulas. Example sheet is a guide only and is never imported."],
    ["Google Form responses are also supported: download the response spreadsheet as .xlsx, select the response sheet and match your column headings on the import screen."],
    ["Timestamp, email and unmapped columns are ignored. Multiple Drive links in one response can be separated with commas or new lines."],
  ]);
  instructions["!cols"] = [{ wch: 125 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  const example = XLSX.utils.aoa_to_sheet([PROMPT_EXCEL_HEADERS, ["Facebook ad copy", "Create three ad variations for your business.", "Marketing", "ChatGPT", "Write 3 Facebook ads for {{BusinessName}} targeting {{TargetAudience}}. Highlight {{Offer}} in a {{Tone}} tone.", 0, "", "Replace with your Google Drive file link", "", "", "", "", ""]]);
  example["!cols"] = sheet["!cols"];
  XLSX.utils.book_append_sheet(workbook, example, "Example (do not import)");
  return workbook;
}

export function readPromptWorkbook(bytes: ArrayBuffer, selection?: { sheetName: string; columns: number[] }) {
  if (bytes.byteLength > MAX_PROMPT_EXCEL_FILE_BYTES) throw new Error("Excel file must be 2 MB or smaller.");
  const workbook = XLSX.read(bytes, { type: "array", sheetRows: MAX_PROMPT_IMPORT_ROWS + 2, cellFormula: true });
  const sheet = workbook.Sheets[selection?.sheetName ?? "Prompts"];
  if (!sheet) throw new Error('Missing sheet. Select your response sheet or use the downloadable template.');
  const range = XLSX.utils.decode_range(sheet["!fullref"] ?? sheet["!ref"] ?? "A1");
  if (range.e.r > MAX_PROMPT_IMPORT_ROWS) throw new Error(`Use at most ${MAX_PROMPT_IMPORT_ROWS} prompt rows. Remove extra rows or split the file.`);
  if (range.e.c > 99) throw new Error("Use a sheet with at most 100 columns.");
  if (!selection && range.e.c >= PROMPT_EXCEL_HEADERS.length) throw new Error("Unexpected extra columns. Please match your response columns on the import screen.");
  const columns = selection?.columns ?? PROMPT_EXCEL_HEADERS.map((_, index) => index);
  if (columns.length !== PROMPT_EXCEL_HEADERS.length || columns.some((index) => !Number.isInteger(index) || index < -1 || index > range.e.c)) throw new Error("Invalid column selection.");
  const missing = PROMPT_REQUIRED_COLUMNS.filter((index) => columns[index] < 0);
  if (missing.length) throw new Error(`Match the required columns: ${missing.map((index) => PROMPT_EXCEL_HEADERS[index]).join(", ")}.`);
  const selected = columns.filter((index) => index >= 0);
  if (new Set(selected).size !== selected.length) throw new Error("Choose a different source column for each prompt field.");
  for (const [address, cell] of Object.entries(sheet)) {
    if (!address.startsWith("!") && selected.includes(XLSX.utils.decode_cell(address).c) && (cell as XLSX.CellObject).f) throw new Error(`Cell ${address}: replace the Excel formula with a plain value.`);
  }
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true, range: 0 });
  const headers = grid[0] ?? [];
  if (!selection && PROMPT_EXCEL_HEADERS.some((header, index) => String(headers[index] ?? "").trim() !== header)) throw new Error("Column headings do not match. Download a fresh template and keep the headings unchanged.");
  const data = grid.slice(1);
  while (data.length && data[data.length - 1].every((value) => value === "")) data.pop();
  // Preserve internal blank rows so Excel row numbers remain accurate in validation errors.
  const result = validatePromptImport(data.map((row) => {
    const value = (index: number) => columns[index] < 0 ? "" : row[columns[index]] ?? "";
    return {
      title: value(0), description: value(1), category: value(2), model: value(3), template: value(4),
      price: columns[5] < 0 ? 0 : value(5) === "" ? undefined : value(5), purchase_url: value(6),
      media_urls: columns.slice(7).flatMap((_, index) => String(value(index + 7)).split(/\r?\n|,\s*(?=https:\/\/)/)).map((url) => url.trim()).filter(Boolean),
    };
  }));
  if (new TextEncoder().encode(JSON.stringify(result.rows)).length > MAX_PROMPT_IMPORT_BYTES) throw new Error("Prompt text is too large for one import. Split the file into smaller batches.");
  return result;
}

export function downloadPromptWorkbook(prompts?: Prompt[]) {
  XLSX.writeFile(createPromptWorkbook(prompts), prompts ? "weconnect-prompts-export.xlsx" : "weconnect-prompts-template.xlsx", { compression: true });
}

export type { PromptImportRow };
