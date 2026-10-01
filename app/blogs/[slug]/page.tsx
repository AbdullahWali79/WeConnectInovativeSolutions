import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";
import { getBlogBySlug, getRelatedBlogs } from "@/lib/blogs";
import { normalizeImageUrl } from "@/lib/image-url";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 300;
export const dynamic = "force-dynamic";

type BlogDetailProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BlogDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug).catch(() => null);

  if (!blog) {
    return { title: "Blog not found | WeConnect-Innovation" };
  }

  const coverImageUrl = normalizeImageUrl(blog.cover_image_cdn_url ?? blog.cover_image_url);
  const canonicalUrl = absoluteUrl(`/blogs/${blog.slug}`);

  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || blog.excerpt || undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      url: canonicalUrl,
      title: blog.seo_title || blog.title,
      description: blog.seo_description || blog.excerpt || undefined,
      images: coverImageUrl ? [{ url: coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: blog.seo_title || blog.title,
      description: blog.seo_description || blog.excerpt || undefined,
      images: coverImageUrl ? [coverImageUrl] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug).catch((error) => {
    console.error("Error loading blog:", error);
    return null;
  });

  if (!blog) notFound();

  const related = await getRelatedBlogs(blog).catch(() => []);
  const html = renderMarkdownToHtml(blog.content);
  const coverImageUrl = normalizeImageUrl(blog.cover_image_cdn_url ?? blog.cover_image_url);

  return (
    <CmsElement cmsId="d8b2bd76-0" as="main" className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />
      <CmsElement cmsId="d8b2bd76-1" as="article" className="relative overflow-hidden pt-32 md:pt-40">
        <CmsElement cmsId="d8b2bd76-2" as="div" className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),transparent)]" />
        <CmsElement cmsId="d8b2bd76-3" as="div" className="relative mx-auto max-w-5xl px-5 md:px-8">
          <CmsLink cmsId="d8b2bd76-4" href="/blogs" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--wc-secondary)] transition hover:text-on-surface">
            <Icon name="arrow_back" className="text-lg" /> Back to blogs
          </CmsLink>

          <CmsElement cmsId="d8b2bd76-5" as="div" className="mb-8 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">
            <CmsElement cmsId="d8b2bd76-6" as="span">{formatDate(blog.published_at)}</CmsElement>
            {blog.featured ? <CmsElement cmsId="d8b2bd76-7" as="span" className="rounded-full bg-[var(--wc-secondary)]/10 px-3 py-1 text-[var(--wc-secondary)]">Featured</CmsElement> : null}
          </CmsElement>
          <CmsElement cmsId="d8b2bd76-8" as="h1" className="max-w-4xl text-4xl font-black leading-tight text-on-surface sm:text-5xl md:text-6xl">{blog.title}</CmsElement>
          {blog.excerpt ? <CmsElement cmsId="d8b2bd76-9" as="p" className="mt-6 max-w-3xl text-lg leading-8 text-[var(--wc-on-surface-variant)]">{blog.excerpt}</CmsElement> : null}
          <CmsElement cmsId="d8b2bd76-10" as="div" className="mt-8 flex flex-wrap gap-2">
            {(blog.tags ?? []).map((tag) => <CmsElement cmsId="d8b2bd76-11" as="span" instance={String(tag)} key={tag} className="rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-3 py-1 text-xs font-bold text-[var(--wc-on-surface-variant)]">{tag}</CmsElement>)}
          </CmsElement>

          {coverImageUrl ? (
            <CmsElement cmsId="d8b2bd76-12" as="div" className="mt-10 overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)]">
              <CmsElement cmsId="d8b2bd76-13" as="img" src={coverImageUrl} alt={blog.title} className="max-h-[560px] w-full object-cover" />
            </CmsElement>
          ) : null}
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="d8b2bd76-14" as="section" className="bg-[var(--wc-bg)] py-12 md:py-16">
        <CmsElement cmsId="d8b2bd76-15" as="div" className="mx-auto grid max-w-5xl gap-10 px-5 md:px-8">
          <CmsElement cmsId="d8b2bd76-16" as="div" className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

          {related.length > 0 ? (
            <CmsElement cmsId="d8b2bd76-17" as="aside" className="border-t border-[var(--wc-outline-variant)] pt-10">
              <CmsElement cmsId="d8b2bd76-18" as="h2" className="mb-6 text-2xl font-black text-on-surface">Related Blogs</CmsElement>
              <CmsElement cmsId="d8b2bd76-19" as="div" className="grid gap-4 md:grid-cols-3">
                {related.map((item) => (
                  <CmsLink cmsId="d8b2bd76-20" instance={String(item.id)} key={item.id} href={`/blogs/${item.slug}`} className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-5 transition hover:border-[var(--wc-secondary)]/30 hover:bg-[var(--wc-surface-low)]">
                    <CmsElement cmsId="d8b2bd76-21" as="p" className="text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{formatDate(item.published_at)}</CmsElement>
                    <CmsElement cmsId="d8b2bd76-22" as="h3" className="mt-3 text-base font-black leading-snug text-on-surface">{item.title}</CmsElement>
                  </CmsLink>
                ))}
              </CmsElement>
            </CmsElement>
          ) : null}
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}



