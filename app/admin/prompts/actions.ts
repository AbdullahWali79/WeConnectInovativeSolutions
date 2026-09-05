"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminOnly } from "@/lib/admin-access";
import { promptDb } from "@/lib/prompts-server";
import { promptInput } from "@/lib/prompts";
import type { PromptActionResult } from "@/app/prompts/actions";
import { parsePromptImportPayload } from "@/lib/prompt-import";

export async function importAdminPrompts(payload: string, publicationStatus: string): Promise<PromptActionResult> {
  try {
    await requireAdminOnly();
    const status = z.enum(["pending", "approved"]).parse(publicationStatus);
    const rows = parsePromptImportPayload(payload);
    // One INSERT is atomic: no rows are saved if any row fails.
    const { error } = await promptDb().from("prompt_library").insert(rows.map((row) => ({ ...row, contributor_id: null, status, admin_note: "" })));
    if (error) throw new Error("Import failed. No prompts were saved. Please retry.");
    revalidatePath("/prompts"); revalidatePath("/admin/prompts");
    return { ok: true, message: `${rows.length} prompts imported${status === "approved" ? " and published" : " as pending review"}.` };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not import prompts." }; }
}

export async function managePrompt(form: FormData): Promise<PromptActionResult> {
  try {
    await requireAdminOnly();
    const db = promptDb();
    const operation = String(form.get("operation"));
    const id = form.get("id") ? z.string().uuid().parse(form.get("id")) : null;
    const note = z.string().trim().max(2000).parse(form.get("admin_note") ?? "");
    if (operation === "contributor") {
      if (!id) throw new Error("Missing contributor.");
      const status = z.enum(["pending", "approved", "rejected"]).parse(form.get("status"));
      const { error } = await db.from("prompt_contributors").update({ status, auto_publish: status === "approved" && form.get("auto_publish") === "on", admin_note: note }).eq("id", id).select("id").single();
      if (error) throw new Error("Could not update contributor.");
    } else if (operation === "review") {
      if (!id) throw new Error("Missing prompt.");
      const status = z.enum(["pending", "approved", "rejected"]).parse(form.get("status"));
      const { error } = await db.from("prompt_library").update({ status, admin_note: note }).eq("id", id).select("id").single();
      if (error) throw new Error("Could not review prompt.");
    } else if (operation === "save") {
      const input = promptInput(form);
      const status = z.enum(["pending", "approved", "rejected"]).parse(form.get("status") ?? "approved");
      const payload = { ...input, status, admin_note: note };
      const query = id ? db.from("prompt_library").update(payload).eq("id", id) : db.from("prompt_library").insert(payload);
      const { error } = await query.select("id").single();
      if (error) throw new Error("Could not save prompt.");
    } else { throw new Error("Unknown action."); }
    revalidatePath("/prompts"); revalidatePath("/prompts/contribute"); revalidatePath("/admin/prompts");
    return { ok: true, message: "Changes saved." };
  } catch (error) { return { ok: false, message: error instanceof z.ZodError ? error.issues.map((i) => `${i.path.join(" ")}: ${i.message}`).join("; ") : error instanceof Error ? error.message : "Could not save changes." }; }
}
