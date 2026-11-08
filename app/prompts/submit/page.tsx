import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { PromptSubmissionForm } from "@/components/prompts/prompt-submission-form";

export const metadata: Metadata = {
  title: "Submit your prompt | WeConnect",
  description: "Share your AI prompt and output images with the WeConnect prompt library.",
};

export default function SubmitPromptPage() {
  return (
    <>
      <PublicHeader />
      <CmsElement cmsId="9de1a37f-0" as="main" className="min-h-screen bg-background px-4 pb-24 pt-28 sm:pt-32 text-on-background">
        <CmsElement cmsId="9de1a37f-1" as="div" className="mx-auto max-w-4xl space-y-6">
          <CmsLink cmsId="9de1a37f-2" href="/prompts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            ← Back to prompt library
          </CmsLink>

          <CmsElement cmsId="9de1a37f-3" as="header" className="rounded-3xl border border-outline-variant bg-surface p-6 sm:p-8 md:p-10 shadow-sm">
            <CmsElement cmsId="9de1a37f-4" as="p" className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">
              WeConnect Community Prompts
            </CmsElement>
            <CmsElement cmsId="9de1a37f-5" as="h1" className="mt-2 text-2xl sm:text-4xl md:text-5xl font-black text-on-background">
              Share your next great prompt.
            </CmsElement>
            <CmsElement cmsId="9de1a37f-6" as="p" className="mt-3 text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
              Submit your AI prompt, select the model, and directly upload your result screenshots or images. Your submission will be reviewed and published to the community prompt library.
            </CmsElement>
          </CmsElement>

          <PromptSubmissionForm />
        </CmsElement>
      </CmsElement>
    </>
  );
}
