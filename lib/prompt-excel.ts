import * as XLSX from "xlsx";
import type { Prompt } from "./prompts";
import { MAX_PROMPT_IMPORT_BYTES, MAX_PROMPT_IMPORT_ROWS, validatePromptImport, type PromptImportRow } from "./prompt-import";

export const PROMPT_EXCEL_HEADERS = ["Title", "Description", "Category", "AI Model", "Prompt Template", "Price (PKR)", "Purchase URL", "Drive URL 1", "Drive URL 2", "Drive URL 3", "Drive URL 4", "Drive URL 5", "Drive URL 6"];
export const MAX_PROMPT_EXCEL_FILE_BYTES = 2 * 1024 * 1024;

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
  ]);
  instructions["!cols"] = [{ wch: 125 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  const example = XLSX.utils.aoa_to_sheet([PROMPT_EXCEL_HEADERS, ["Facebook ad copy", "Create three ad variations for your business.", "Marketing", "ChatGPT", "Write 3 Facebook ads for {{BusinessName}} targeting {{TargetAudience}}. Highlight {{Offer}} in a {{Tone}} tone.", 0, "", "Replace with your Google Drive file link", "", "", "", "", ""]]);
  example["!cols"] = sheet["!cols"];
  XLSX.utils.book_append_sheet(workbook, example, "Example (do not import)");
  return workbook;
}

export function readPromptWorkbook(bytes: ArrayBuffer) {
  if (bytes.byteLength > MAX_PROMPT_EXCEL_FILE_BYTES) throw new Error("Excel file must be 2 MB or smaller.");
  const workbook = XLSX.read(bytes, { type: "array", sheetRows: MAX_PROMPT_IMPORT_ROWS + 2, cellFormula: true });
  const sheet = workbook.Sheets.Prompts;
  if (!sheet) throw new Error('Missing "Prompts" sheet. Please use the downloadable template.');
  const range = XLSX.utils.decode_range(sheet["!fullref"] ?? sheet["!ref"] ?? "A1");
  if (range.e.r > MAX_PROMPT_IMPORT_ROWS) throw new Error(`Use at most ${MAX_PROMPT_IMPORT_ROWS} prompt rows. Remove extra rows or split the file.`);
  if (range.e.c >= PROMPT_EXCEL_HEADERS.length) throw new Error("Unexpected extra columns. Please use the template headings.");
  for (const [address, cell] of Object.entries(sheet)) {
    if (!address.startsWith("!") && (cell as XLSX.CellObject).f) throw new Error(`Cell ${address}: replace the Excel formula with a plain value.`);
  }
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true, range: 0 });
  const headers = grid[0] ?? [];
  if (PROMPT_EXCEL_HEADERS.some((header, index) => String(headers[index] ?? "").trim() !== header)) throw new Error("Column headings do not match. Download a fresh template and keep the headings unchanged.");
  const data = grid.slice(1);
  while (data.length && data[data.length - 1].every((value) => value === "")) data.pop();
  // Preserve internal blank rows so Excel row numbers remain accurate in validation errors.
  const result = validatePromptImport(data.map((row) => ({
    title: row[0], description: row[1], category: row[2], model: row[3], template: row[4],
    price: row[5] === "" ? undefined : row[5], purchase_url: row[6],
    media_urls: row.slice(7, 13).map((value) => String(value).trim()).filter(Boolean),
  })));
  if (new TextEncoder().encode(JSON.stringify(result.rows)).length > MAX_PROMPT_IMPORT_BYTES) throw new Error("Prompt text is too large for one import. Split the file into smaller batches.");
  return result;
}

export function downloadPromptWorkbook(prompts?: Prompt[]) {
  XLSX.writeFile(createPromptWorkbook(prompts), prompts ? "weconnect-prompts-export.xlsx" : "weconnect-prompts-template.xlsx", { compression: true });
}

export type { PromptImportRow };
