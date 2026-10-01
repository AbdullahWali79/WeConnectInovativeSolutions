import { requireAdminPage } from "@/lib/admin-access";
import { getPageEntries } from "@/lib/cms/registry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PagesManager } from "@/components/cms/pages-manager";

export default async function PagesPage() {
  await requireAdminPage("/admin/pages");
  const supabase = await createSupabaseServerClient();
  const [entries, settings, drafts, published] = await Promise.all([
    getPageEntries(), supabase.from("site_page_settings").select("*"),
    supabase.from("site_page_drafts").select("path,updated_at"),
    supabase.from("site_page_content").select("path,updated_at"),
  ]);
  return <PagesManager entries={entries} initialSettings={settings.data ?? []} drafts={drafts.data ?? []} published={published.data ?? []} storageReady={!settings.error && !drafts.error && !published.error} />;
}
