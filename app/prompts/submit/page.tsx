import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { PROMPT_SUBMISSION_GOOGLE_URL, promptSubmissionEmbedUrl } from "@/lib/prompt-submission-form";

export const metadata: Metadata = {
  title: "Submit your prompt | WeConnect",
  description: "Share your AI prompt and output images with the WeConnect prompt library.",
};

export default function SubmitPromptPage() {
  const embedUrl = PROMPT_SUBMISSION_GOOGLE_URL ? promptSubmissionEmbedUrl(PROMPT_SUBMISSION_GOOGLE_URL) : null;
  return <><PublicHeader /><main className="min-h-screen bg-background px-4 pb-20 pt-36 text-on-background">
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/prompts" className="inline-block font-semibold text-primary">Back to prompt library</Link>
      <header className="rounded-3xl border border-outline-variant bg-surface p-6 md:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">WeConnect prompt submissions</p>
        <h1 className="mt-3 text-3xl font-black md:text-5xl">Share your next great prompt.</h1>
        <p className="mt-4 text-on-surface-variant">Submit your prompt, describe what it creates, and share your output images or videos. Your submission will be reviewed before it appears in the prompt library.</p>
        <p className="mt-3 text-sm text-on-surface-variant">For Google Drive previews, set file sharing to Anyone with the link.</p>
      </header>
      {embedUrl ? <>
        <section aria-label="Prompt submission form" className="overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm">
          <iframe src={embedUrl} title="WeConnect prompt submission form" loading="eager" className="h-[1800px] min-h-[80vh] w-full border-0" />
        </section>
        <p className="text-center text-sm text-on-surface-variant">If the form needs Google sign-in or does not load, <a href={PROMPT_SUBMISSION_GOOGLE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">open the form in a new tab</a>.</p>
      </> : <p role="status" className="rounded-2xl border border-outline-variant bg-surface p-6">The submission form is being connected. Please check back shortly.</p>}
    </div>
  </main></>;
}
