import { driveId, promptSchema } from "./prompts";
import type { z } from "zod";

export const MAX_PROMPT_IMPORT_ROWS = 100;
// Leave room for server-action JSON encoding within Next's default 1 MB body limit.
export const MAX_PROMPT_IMPORT_BYTES = 400_000;
export type PromptImportRow = z.infer<typeof promptSchema>;
export type PromptImportIssue = { row: number; message: string };

type DuplicateFields = Pick<PromptImportRow, "title" | "template" | "media_urls">;

export function createPromptDuplicateIndex(existing: DuplicateFields[] = []) {
  const titles = new Set<string>();
  const templates = new Set<string>();
  const images = new Set<string>();
  const titleKey = (value: string) => value.trim().toLowerCase();
  // Keep text and variable names case-sensitive; normalize Windows line endings.
  const templateKey = (value: string) => value.replace(/\r\n?/g, "\n").trim();
  const imageKeys = (row: DuplicateFields) => row.media_urls.map((url) => driveId(url) ?? url.trim()).filter(Boolean);
  const add = (row: DuplicateFields) => {
    titles.add(titleKey(row.title));
    templates.add(templateKey(row.template));
    imageKeys(row).forEach((key) => images.add(key));
  };
  existing.forEach(add);
  return {
    add,
    reason(row: DuplicateFields) {
      if (titles.has(titleKey(row.title))) return "title (capital/small letters ignored)";
      if (imageKeys(row).some((key) => images.has(key))) return "image / Drive file";
      if (templates.has(templateKey(row.template))) return "complete prompt text including variables";
      return null;
    },
  };
}

export function validatePromptImport(input: unknown, skipInvalid: boolean = false): { rows: PromptImportRow[]; issues: PromptImportIssue[] } {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_PROMPT_IMPORT_ROWS) {
    return { rows: [], issues: [{ row: 0, message: `Import between 1 and ${MAX_PROMPT_IMPORT_ROWS} prompts at a time.` }] };
  }
  const rows: PromptImportRow[] = [];
  const issues: PromptImportIssue[] = [];
  const seen = createPromptDuplicateIndex();
  input.forEach((value, index) => {
    const result = promptSchema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) issues.push({ row: index + 2, message: `${issue.path.join(" ")}: ${issue.message}` });
      return;
    }
    const reason = seen.reason(result.data);
    if (reason) {
      issues.push({ row: index + 2, message: `Duplicate ${reason} in this file. Remove the duplicate row.` });
      return;
    }
    seen.add(result.data);
    rows.push(result.data);
  });
  return { rows: (issues.length > 0 && !skipInvalid) ? [] : rows, issues };
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
