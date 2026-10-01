import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPageEntries } from "@/lib/cms/registry";
import { parseDocument } from "@/lib/cms/model";
import { PageEditor } from "@/components/cms/page-editor";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  await requireAdminPage("/admin/pages");
  const path = (await searchParams).path || "/";
  const entries = await getPageEntries();
  const entry = entries.find(e => e.href?.split("#")[0] === path);
  if (!entry) notFound();
  const supabase = await createSupabaseServerClient();
  const [draft, published] = await Promise.all([
    supabase.from("site_page_drafts").select("document").eq("path", path).maybeSingle(),
    supabase.from("site_page_content").select("document").eq("path", path).maybeSingle(),
  ]);
  return <PageEditor key={path} path={path} label={entry.label} source={entry.source} initialDocument={parseDocument(draft.data?.document ?? published.data?.document)} publishedDocument={parseDocument(published.data?.document)} storageReady={!draft.error && !published.error} />;
}
