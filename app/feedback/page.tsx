import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { PublicHeader } from "@/components/public/public-header";
import { FeedbackForm } from "@/components/public/feedback-form";
import { Icon } from "@/components/icon";

export const revalidate = 300;

export default function FeedbackPage() {
  return (
    <CmsElement cmsId="d5e3a20c-0" as="main" className="overflow-x-clip bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />

      <CmsElement cmsId="d5e3a20c-1" as="section" className="relative isolate overflow-hidden py-24 sm:py-32">
        <CmsElement cmsId="d5e3a20c-2" as="div" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),rgba(3,11,28,1))]" />
        <CmsElement cmsId="d5e3a20c-3" as="div" className="absolute top-0 left-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--wc-secondary)]/10 blur-[120px]" />

        <CmsElement cmsId="d5e3a20c-4" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <CmsElement cmsId="d5e3a20c-5" as="div" className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <CmsElement cmsId="d5e3a20c-6" as="div" className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              <Icon name="reviews" className="text-sm" /> Feedback
            </CmsElement>
            <CmsLink cmsId="d5e3a20c-7" href="/testimonials" className="inline-flex items-center gap-2 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-2 text-sm font-bold text-on-surface transition hover:bg-[var(--wc-surface-low)]">
              <Icon name="preview" className="text-sm" /> View approved feedback
            </CmsLink>
          </CmsElement>

          <CmsElement cmsId="d5e3a20c-8" as="div" className="mb-12 max-w-3xl">
            <CmsElement cmsId="d5e3a20c-9" as="h1" className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Share your experience as a <CmsElement cmsId="d5e3a20c-10" as="span" className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)]">student or client</CmsElement>
            </CmsElement>
            <CmsElement cmsId="d5e3a20c-11" as="p" className="mt-5 max-w-2xl text-lg leading-8 text-[var(--wc-on-surface-variant)]">
              Send your story, choose a category, and our admin team will review it before publishing. Approved feedback appears publicly as a testimonial.
            </CmsElement>
          </CmsElement>

          <FeedbackForm />
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
