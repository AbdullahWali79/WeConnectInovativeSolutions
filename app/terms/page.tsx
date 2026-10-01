import { CmsElement, CmsLink } from "@/components/cms/cms-element";

export default function TermsPage() {
  return (
    <CmsElement cmsId="98979221-0" as="main" className="min-h-screen bg-[linear-gradient(180deg,var(--wc-surface-lowest)_0%,var(--wc-surface)_100%)] px-5 py-16 md:px-margin-page">
      <CmsElement cmsId="98979221-1" as="div" className="mx-auto max-w-3xl rounded-2xl border border-[#DDE6F5] bg-white p-8 shadow-card">
        <CmsElement cmsId="98979221-2" as="h1" className="text-3xl font-extrabold text-[var(--wc-primary)]">Terms</CmsElement>
        <CmsElement cmsId="98979221-3" as="p" className="mt-4 text-[#5B6B88]">This page can be expanded later with your official terms and conditions content.</CmsElement>
        <CmsLink cmsId="98979221-4" href="/" className="mt-6 inline-flex rounded-lg bg-[var(--wc-primary)] px-5 py-3 font-bold text-on-surface">Back Home</CmsLink>
      </CmsElement>
    </CmsElement>
  );
}