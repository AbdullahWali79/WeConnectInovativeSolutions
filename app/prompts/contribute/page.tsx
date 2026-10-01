import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { PublicHeader } from "@/components/public/public-header";
import { ContributorPortal } from "@/components/prompts/forms";
import { currentContributor, promptDb } from "@/lib/prompts-server";
import type { Contributor, Prompt } from "@/lib/prompts";
export const metadata = { title: "Prompt Contributors | WeConnect", robots: { index: false, follow: false } };
export default async function ContributePage() {
  let contributor: Contributor | null = null; let prompts: Prompt[] = []; let unavailable = false;
  try { contributor = await currentContributor(); if (contributor) { const result = await promptDb().from("prompt_library").select("*").eq("contributor_id", contributor.id).order("created_at", { ascending: false }); if (result.error) throw result.error; prompts = result.data as Prompt[]; } } catch { unavailable = true; }
  return <><PublicHeader /><CmsElement cmsId="0fc2ef1c-0" as="main" className="min-h-screen bg-background px-4 pb-20 pt-36 text-on-background"><CmsElement cmsId="0fc2ef1c-1" as="div" className="mx-auto max-w-4xl"><CmsLink cmsId="0fc2ef1c-2" href="/prompts" className="mb-6 inline-block text-primary">← Back to prompt library</CmsLink>{unavailable ? <CmsElement cmsId="0fc2ef1c-3" as="p" role="alert">Contributor portal is temporarily unavailable. Please try again later.</CmsElement> : <ContributorPortal contributor={contributor} prompts={prompts} />}</CmsElement></CmsElement></>;
}
