import { CmsElement, CmsInstance, CmsLink } from "@/components/cms/cms-element";
import { Icon } from "@/components/icon";
import { getLatestNews, type AINews } from "@/lib/news";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/public/animations";
import { PublicHeader } from "@/components/public/public-header";

export const revalidate = 300;

export default async function NewsPage() {
  const newsData = await getLatestNews();
  const news = (newsData as (AINews & { id: string })[]) ?? [];

  return (
    <CmsElement cmsId="a776b13f-0" as="main" className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />

      {/* Page Header */}
      <CmsElement cmsId="a776b13f-1" as="section" className="relative overflow-hidden bg-[var(--wc-bg)] py-16 md:py-24">
        {/* Background glow effects */}
        <CmsElement cmsId="a776b13f-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></CmsElement>

        <CmsElement cmsId="a776b13f-3" as="div" className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page text-center md:text-left">
          <FadeIn>
            <CmsElement cmsId="a776b13f-4" as="div" className="max-w-3xl">
              <CmsElement cmsId="a776b13f-5" as="div" className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-6">
                <Icon name="newspaper" className="text-sm" /> Daily Pulse
              </CmsElement>
              <CmsElement cmsId="a776b13f-6" as="h1" className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-on-surface mb-6">Latest in AI & Tech</CmsElement>
              <CmsElement cmsId="a776b13f-7" as="p" className="text-lg leading-relaxed text-[var(--wc-on-surface-variant)]">
                Stay updated with top AI news, refreshed daily to keep our systems active and your mind sharp.
                Discover the latest trends, innovations, and insights in artificial intelligence and technology.
              </CmsElement>
            </CmsElement>
          </FadeIn>
        </CmsElement>
      </CmsElement>

      {/* News Section */}
      <CmsElement cmsId="a776b13f-8" as="section" className="relative bg-[var(--wc-bg)] py-16 md:py-24">
        <CmsElement cmsId="a776b13f-9" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--landing-accent-rgb),0.05),transparent_50%)] pointer-events-none" />
        <CmsElement cmsId="a776b13f-10" as="div" className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page">
          {news.length > 0 ? (
            <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
              {news.map((item) => (
                <CmsInstance key={item.id} instance={String(item.id)}><StaggerItem key={item.id}>
                  <CmsElement cmsId="a776b13f-11" as="div" className="group flex flex-col h-full overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--wc-secondary)]/30 hover:bg-[var(--wc-surface-lowest)]/80 hover:shadow-[0_0_30px_rgba(var(--landing-accent-rgb),0.15)]">
                    <CmsElement cmsId="a776b13f-12" as="div" className="mb-6 flex items-center justify-between">
                      <CmsElement cmsId="a776b13f-13" as="span" className="rounded-full bg-[var(--wc-secondary)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
                        {item.source}
                      </CmsElement>
                      <Icon
                        name="newspaper"
                        className="text-[var(--wc-on-surface-variant)] opacity-50 transition-opacity duration-300 group-hover:text-[var(--wc-secondary)] group-hover:opacity-100"
                      />
                    </CmsElement>
                    <CmsElement cmsId="a776b13f-14" as="h3" className="mb-4 text-xl font-black leading-tight text-on-surface line-clamp-2 transition-colors group-hover:text-[var(--wc-secondary)]">
                      {item.title}
                    </CmsElement>
                    <CmsElement cmsId="a776b13f-15" as="p" className="mb-6 flex-1 text-sm leading-relaxed text-[var(--wc-on-surface-variant)] line-clamp-3">{item.summary}</CmsElement>
                    <CmsElement cmsId="a776b13f-16" as="div" className="mt-auto border-t border-[var(--wc-outline-variant)] pt-5">
                      <CmsElement cmsId="a776b13f-17" as="a"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-on-surface transition-all group-hover:text-[var(--wc-secondary)]"
                      >
                        READ STORY <Icon name="arrow_forward" className="text-lg transition-transform group-hover:translate-x-1" />
                      </CmsElement>
                    </CmsElement>
                  </CmsElement>
                </StaggerItem></CmsInstance>
              ))}
            </StaggerContainer>
          ) : (
            <FadeIn>
              <CmsElement cmsId="a776b13f-18" as="div" className="rounded-3xl border border-dashed border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-12 text-center backdrop-blur-md">
                <Icon name="newspaper" className="mx-auto text-5xl text-[var(--wc-on-surface-variant)]" />
                <CmsElement cmsId="a776b13f-19" as="h3" className="mt-5 text-2xl font-black text-on-surface">News is being fetched</CmsElement>
                <CmsElement cmsId="a776b13f-20" as="p" className="mt-2 text-[var(--wc-on-surface-variant)]">Refresh the page in a moment to see the latest AI and tech news.</CmsElement>
              </CmsElement>
            </FadeIn>
          )}
        </CmsElement>
      </CmsElement>

      {/* CTA Section */}
      <CmsElement cmsId="a776b13f-21" as="section" className="relative overflow-hidden bg-[var(--wc-surface-lowest)]/40 py-20 md:py-24 text-center border-t border-[var(--wc-outline-variant)]">
        <CmsElement cmsId="a776b13f-22" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(var(--landing-accent-rgb),0.1),transparent)] pointer-events-none"></CmsElement>
        <CmsElement cmsId="a776b13f-23" as="div" className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page">
          <CmsElement cmsId="a776b13f-24" as="h2" className="text-3xl md:text-4xl font-black text-on-surface mb-6">Stay Updated With Our News</CmsElement>
          <CmsElement cmsId="a776b13f-25" as="p" className="text-lg leading-relaxed text-[var(--wc-on-surface-variant)] max-w-2xl mx-auto mb-10">
            Bookmark this page to get daily updates on AI trends, tech innovations, and industry news.
          </CmsElement>
          <CmsElement cmsId="a776b13f-26" as="div" className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <CmsLink cmsId="a776b13f-27" href="/apply" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] px-10 py-4 text-sm font-black text-on-primary shadow-[0_0_20px_rgba(var(--landing-accent-rgb),0.3)] transition-transform hover:scale-[1.02]">
              START LEARNING TODAY
            </CmsLink>
            <CmsLink cmsId="a776b13f-28" href="/" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-10 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-[var(--wc-surface-low)] hover:border-[var(--wc-secondary)]/30">
              BACK TO HOME
            </CmsLink>
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
