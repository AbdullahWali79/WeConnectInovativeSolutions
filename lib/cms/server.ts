import "server-only";
import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { parseDocument, type PageSetting } from "./model";

export const loadPageSettings = cache(async (): Promise<PageSetting[]> => {
  const { data, error } = await createSupabasePublicClient().from("site_page_settings").select("id,label,menu_visible,active,sort_order");
  // Existing pages continue working before the migration is installed.
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw new Error("Page availability could not be verified. Please try again.");
  }
  return data ?? [];
});
export async function loadPublishedPage(path: string) {
  const { data } = await createSupabasePublicClient().from("site_page_content").select("document").eq("path", path).maybeSingle();
  return parseDocument(data?.document);
}
