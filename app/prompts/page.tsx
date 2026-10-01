import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { PROMPT_SUBMISSION_PATH } from "@/lib/prompt-submission-form";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { publicPrompts } from "@/lib/prompts-server";
import { PromptLibrary } from "@/components/prompts/library";
import type { Prompt } from "@/lib/prompts";
export const metadata: Metadata = { title: "Prompt Library | WeConnect", description: "Discover free and premium AI prompts. Preview results, fill in your variables and copy your personalized prompt." };
export const dynamic = "force-dynamic";
export default async function PromptsPage() {
  let prompts: Prompt[] = []; let unavailable = false;
  try { prompts = await publicPrompts(); } catch { unavailable = true; }
  return <><PublicHeader /><CmsElement cmsId="be6b6343-0" as="main" className="min-h-screen bg-background px-4 pb-20 pt-36 text-on-background"><CmsElement cmsId="be6b6343-1" as="section" className="mx-auto max-w-7xl"><CmsElement cmsId="be6b6343-2" as="header" className="mx-auto mb-10 max-w-3xl text-center"><CmsElement cmsId="be6b6343-3" as="span" className="rounded-full bg-secondary-container px-4 py-2 text-xs font-black uppercase tracking-widest text-on-secondary-container">Create something extraordinary</CmsElement><CmsElement cmsId="be6b6343-4" as="h1" className="mt-6 text-4xl font-black md:text-6xl">A better prompt.<br /><CmsElement cmsId="be6b6343-5" as="span" className="text-primary">A better result.</CmsElement></CmsElement><CmsElement cmsId="be6b6343-6" as="p" className="mt-5 text-lg text-on-surface-variant">Explore proven ideas for writing, images, video and more. Find your prompt, make it yours, and start creating.</CmsElement><CmsLink cmsId="be6b6343-7" href={PROMPT_SUBMISSION_PATH} className="mt-6 inline-block rounded-full border border-primary px-6 py-3 font-semibold text-primary">Share your prompts →</CmsLink></CmsElement>{unavailable ? <CmsElement cmsId="be6b6343-8" as="p" role="alert" className="rounded-2xl bg-surface p-8 text-center">The prompt library is temporarily unavailable. Please try again later.</CmsElement> : <PromptLibrary prompts={prompts} />}</CmsElement></CmsElement></>;
}
