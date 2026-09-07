import { promptDb } from "./prompts-server";
import { createPromptDuplicateIndex, type PromptImportRow } from "./prompt-import";

export async function filterExistingPromptImports(rows: PromptImportRow[]) {
  const db = promptDb();
  const index = createPromptDuplicateIndex();
  // Paginate to check the entire library, including pending and rejected prompts.
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from("prompt_library")
      .select("title,template,media_urls").order("id").range(offset, offset + pageSize - 1);
    if (error || !data) throw new Error("Could not check existing prompts for duplicates. No prompts were saved. Please retry.");
    data.forEach((row) => index.add(row));
    if (data.length < pageSize) break;
  }
  const unique: PromptImportRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (index.reason(row)) { skipped++; continue; }
    index.add(row);
    unique.push(row);
  }
  return { rows: unique, skipped };
}
