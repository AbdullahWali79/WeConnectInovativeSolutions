import { CmsElement } from "@/components/cms/cms-element";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { BlogsList } from "@/components/public/blogs-list";
import { Icon } from "@/components/icon";
import { getBlogs } from "@/lib/blogs";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blogs | WeConnect-Innovation",
  description: "Insights, training guides, and software industry updates from WeConnect-Innovation.",
};

export default async function BlogsPage() {
  const blogs = await getBlogs({ publishedOnly: true }).catch((error) => {
    console.error("Error loading blogs:", error);
    return [];
  });

  return (
    <CmsElement cmsId="178a7918-0" as="main" className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />
      <CmsElement cmsId="178a7918-1" as="section" className="relative overflow-hidden bg-[var(--wc-bg)] pt-32 pb-14 md:pt-40 md:pb-20">
        <CmsElement cmsId="178a7918-2" as="div" className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),transparent)]" />
        <CmsElement cmsId="178a7918-3" as="div" className="relative mx-auto max-w-container-max px-5 md:px-margin-page">
          <CmsElement cmsId="178a7918-4" as="div" className="max-w-3xl">
            <CmsElement cmsId="178a7918-5" as="div" className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              <Icon name="article" className="text-sm" /> WeConnect Blog
            </CmsElement>
            <CmsElement cmsId="178a7918-6" as="h1" className="text-4xl font-black leading-tight text-on-surface sm:text-5xl md:text-6xl">Practical Guides For Modern Careers</CmsElement>
            <CmsElement cmsId="178a7918-7" as="p" className="mt-6 text-lg leading-8 text-[var(--wc-on-surface-variant)]">
              Read training notes, client-hunting lessons, software insights, and practical growth playbooks from the WeConnect team.
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>
      <BlogsList blogs={blogs} />
    </CmsElement>
  );
}
