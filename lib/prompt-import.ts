import { promptSchema } from "./prompts";
import type { z } from "zod";

export const MAX_PROMPT_IMPORT_ROWS = 100;
// Leave room for server-action JSON encoding within Next's default 1 MB body limit.
export const MAX_PROMPT_IMPORT_BYTES = 400_000;
export type PromptImportRow = z.infer<typeof promptSchema>;
export type PromptImportIssue = { row: number; message: string };

export function validatePromptImport(input: unknown): { rows: PromptImportRow[]; issues: PromptImportIssue[] } {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_PROMPT_IMPORT_ROWS) {
    return { rows: [], issues: [{ row: 0, message: `Import between 1 and ${MAX_PROMPT_IMPORT_ROWS} prompts at a time.` }] };
  }
  const rows: PromptImportRow[] = [];
  const issues: PromptImportIssue[] = [];
  const seen = new Set<string>();
  input.forEach((value, index) => {
    const result = promptSchema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) issues.push({ row: index + 2, message: `${issue.path.join(" ")}: ${issue.message}` });
      return;
    }
    const signature = JSON.stringify([result.data.title.toLowerCase(), result.data.template]);
    if (seen.has(signature)) issues.push({ row: index + 2, message: "Duplicate title and template in this file. Remove the duplicate row." });
    seen.add(signature);
    rows.push(result.data);
  });
  return { rows: issues.length ? [] : rows, issues };
}

export function parsePromptImportPayload(payload: string) {
  if (typeof payload !== "string" || new TextEncoder().encode(payload).length > MAX_PROMPT_IMPORT_BYTES) {
    throw new Error("This import is too large. Split it into smaller files.");
  }
  let input: unknown;
  try { input = JSON.parse(payload); } catch { throw new Error("Invalid import data. Choose the Excel file again."); }
  const result = validatePromptImport(input);
  if (result.issues.length) throw new Error(result.issues.slice(0, 8).map((issue) => `${issue.row ? `Row ${issue.row}: ` : ""}${issue.message}`).join("\n"));
  return result.rows;
}
