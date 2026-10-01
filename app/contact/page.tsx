import { CmsElement } from "@/components/cms/cms-element";
import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public/public-header";
import { ContactQueryForm } from "@/components/public/contact-query-form";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contact Our AI Automation Team",
  description: "Discuss your n8n, Make.com, AI agent, ChatGPT, Claude, Gemini or custom automation project with our international delivery team.",
  path: "/contact",
});

export const revalidate = 300;

export default function ContactPage() {
  return (
    <CmsElement cmsId="de48bb34-0" as="main" className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />

      <CmsElement cmsId="de48bb34-1" as="section" className="relative overflow-hidden bg-[var(--wc-bg)] py-16 md:py-24">
        <CmsElement cmsId="de48bb34-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none" />
        <CmsElement cmsId="de48bb34-3" as="div" className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page text-center md:text-left">
          <CmsElement cmsId="de48bb34-4" as="div" className="max-w-3xl">
            <CmsElement cmsId="de48bb34-5" as="div" className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-6">
              <Icon name="mail" className="text-sm" /> Contact Us
            </CmsElement>
            <CmsElement cmsId="de48bb34-6" as="h1" className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-on-surface">Send a quick query</CmsElement>
            <CmsElement cmsId="de48bb34-7" as="p" className="mt-6 text-lg leading-relaxed text-[var(--wc-on-surface-variant)] max-w-2xl">
              Share your question below and our team will reply by email at{" "}
              <CmsElement cmsId="de48bb34-8" as="a" href={CONTACT_EMAIL_HREF} className="text-on-surface underline underline-offset-4">{CONTACT_EMAIL}</CmsElement>.
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="de48bb34-9" as="section" className="relative overflow-hidden bg-[var(--wc-bg)] pb-16 md:pb-24">
        <CmsElement cmsId="de48bb34-10" as="div" className="mx-auto max-w-3xl px-5 md:px-margin-page">
          <CmsElement cmsId="de48bb34-11" as="div" className="rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-10">
            <ContactQueryForm />
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
