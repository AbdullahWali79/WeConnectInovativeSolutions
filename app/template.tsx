import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CmsProvider } from "@/components/cms/cms-provider";
import { isPublicPath, pageIsActive, parseDocument } from "@/lib/cms/model";
import { loadPageSettings, loadPublishedPage } from "@/lib/cms/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Template({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const path = requestHeaders.get("x-cms-path") ?? "/";
  if (!isPublicPath(path)) return children;
  const settings = await loadPageSettings();
  let preview = false;
  let document = await loadPublishedPage(path);
  if (requestHeaders.get("x-cms-preview") === "1") {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
      preview = profile?.role === "admin" && profile?.status === "approved";
      if (preview) {
        const { data } = await supabase.from("site_page_drafts").select("document").eq("path", path).maybeSingle();
        if (data) document = parseDocument(data.document);
      }
    }
  }
  if (!preview && !pageIsActive(path, settings)) notFound();
  return <CmsProvider key={path} path={path} initialDocument={document} settings={settings} preview={preview}>{children}</CmsProvider>;
}
