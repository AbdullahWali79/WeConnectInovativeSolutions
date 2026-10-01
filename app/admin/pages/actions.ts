"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { documentSchema, isPublicPath } from "@/lib/cms/model";
import { getPageEntries } from "@/lib/cms/registry";

const pathSchema = z.string().max(500).refine(p => isPublicPath(p) && !/[?#\\\s]/.test(p), "Invalid public page path.");
function failure(error: unknown) {
  return { ok: false as const, error: error instanceof Error ? error.message : "Could not save. Please try again." };
}
function dbError(message: string) {
  if (/site_page_|schema cache/i.test(message)) return new Error("Pages storage is not ready. Apply the 20261001000000_site_pages_cms.sql migration in Supabase, then retry.");
  return new Error(message);
}
export async function savePageSetting(input: unknown) {
  try {
    await requireAdminOnly();
    const value = z.object({ id: z.string().max(500), label: z.string().trim().min(1).max(120), menu_visible: z.boolean(), active: z.boolean(), sort_order: z.number().int().min(-10000).max(10000) }).parse(input);
    const entries = await getPageEntries();
    if (!entries.some(e => e.id === value.id)) throw new Error("Unknown page or menu.");
    const { error } = await (await createSupabaseServerClient()).from("site_page_settings").upsert({ ...value, updated_at: new Date().toISOString() });
    if (error) throw dbError(error.message);
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) { return failure(error); }
}
export async function savePageDocument(pathInput: string, documentInput: unknown, publish: boolean) {
  try {
    const profile = await requireAdminOnly();
    const path = pathSchema.parse(pathInput);
    if (typeof publish !== "boolean") throw new Error("Invalid save mode.");
    const entries = await getPageEntries();
    if (!entries.some(e => e.href?.split("#")[0] === path)) throw new Error("Unknown page.");
    const document = documentSchema.parse(documentInput);
    if (JSON.stringify(document).length > 1000000) throw new Error("Page content is too large (maximum 1 MB).");
    const supabase = await createSupabaseServerClient();
    const row = { path, document, updated_by: profile.id, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("site_page_drafts").upsert(row);
    if (error) throw dbError(error.message);
    if (publish) {
      const { error } = await supabase.from("site_page_content").upsert(row);
      if (error) throw dbError(error.message);
      revalidatePath(path);
    }
    revalidatePath("/admin/pages");
    return { ok: true as const };
  } catch (error) { return failure(error); }
}
