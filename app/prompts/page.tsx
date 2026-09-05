import { PROMPT_SUBMISSION_PATH } from "@/lib/prompt-submission-form";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { publicPrompts } from "@/lib/prompts-server";
import { PromptLibrary } from "@/components/prompts/library";
import type { Prompt } from "@/lib/prompts";
export const metadata: Metadata = { title: "Prompt Library | WeConnect", description: "Discover free and premium AI prompts. Preview results, fill in your variables and copy your personalized prompt." };
export const dynamic = "force-dynamic";
export default async function PromptsPage() {
  let prompts: Prompt[] = []; let unavailable = false;
  try { prompts = await publicPrompts(); } catch { unavailable = true; }
  return <><PublicHeader /><main className="min-h-screen bg-background px-4 pb-20 pt-36 text-on-background"><section className="mx-auto max-w-7xl"><header className="mx-auto mb-10 max-w-3xl text-center"><span className="rounded-full bg-secondary-container px-4 py-2 text-xs font-black uppercase tracking-widest text-on-secondary-container">Create something extraordinary</span><h1 className="mt-6 text-4xl font-black md:text-6xl">A better prompt.<br /><span className="text-primary">A better result.</span></h1><p className="mt-5 text-lg text-on-surface-variant">Explore proven ideas for writing, images, video and more. Find your prompt, make it yours, and start creating.</p><Link href={PROMPT_SUBMISSION_PATH} className="mt-6 inline-block rounded-full border border-primary px-6 py-3 font-semibold text-primary">Share your prompts →</Link></header>{unavailable ? <p role="alert" className="rounded-2xl bg-surface p-8 text-center">The prompt library is temporarily unavailable. Please try again later.</p> : <PromptLibrary prompts={prompts} />}</section></main></>;
}
