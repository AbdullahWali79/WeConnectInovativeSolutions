import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public/public-header";
import { automationServices, getAutomationService } from "@/lib/automation-services";
import { absoluteUrl, createPageMetadata, SITE_NAME } from "@/lib/seo";

type ServicePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return automationServices.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const service = getAutomationService((await params).slug);
  if (!service) return {};
  return createPageMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/services/${service.slug}`,
    keywords: service.keywords,
  });
}

export default async function AutomationServicePage({ params }: ServicePageProps) {
  const service = getAutomationService((await params).slug);
  if (!service) notFound();

  const serviceUrl = absoluteUrl(`/services/${service.slug}`);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.metaDescription,
    url: serviceUrl,
    provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    areaServed: "Worldwide",
    serviceType: service.name,
  };

  return (
    <CmsElement cmsId="b561fd90-0" as="main" className="min-h-screen overflow-hidden bg-[var(--wc-bg)] text-on-background">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <CmsElement cmsId="b561fd90-1" as="section" className="relative isolate border-b border-white/10 px-5 pb-20 pt-24 md:px-margin-page md:pb-28 md:pt-32">
        <CmsElement cmsId="b561fd90-2" as="div" className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,var(--wc-primary)_0%,#08275f_52%,#06162f_100%)]" />
        <CmsElement cmsId="b561fd90-3" as="div" className="absolute -right-24 top-0 -z-10 h-96 w-96 rounded-full bg-[var(--wc-secondary)]/20 blur-3xl" />
        <CmsElement cmsId="b561fd90-4" as="div" className="mx-auto max-w-5xl text-center">
          <CmsElement cmsId="b561fd90-5" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-200">{service.eyebrow}</CmsElement>
          <CmsElement cmsId="b561fd90-6" as="h1" className="mx-auto mt-5 max-w-5xl text-4xl font-black leading-[1.06] text-white sm:text-5xl lg:text-7xl">{service.title}</CmsElement>
          <CmsElement cmsId="b561fd90-7" as="p" className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-blue-100/85">{service.description}</CmsElement>
          <CmsElement cmsId="b561fd90-8" as="div" className="mt-9 flex flex-wrap justify-center gap-3">
            <CmsLink cmsId="b561fd90-9" href={`/contact?service=${encodeURIComponent(service.name)}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--wc-secondary)] px-6 py-3 font-extrabold text-white shadow-xl transition hover:-translate-y-0.5">
              Discuss your automation <Icon name="arrow_forward" />
            </CmsLink>
            <CmsLink cmsId="b561fd90-10" href="/services" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15">
              View all services
            </CmsLink>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="b561fd90-11" as="section" className="px-5 py-20 md:px-margin-page md:py-28">
        <CmsElement cmsId="b561fd90-12" as="div" className="mx-auto max-w-container-max">
          <CmsElement cmsId="b561fd90-13" as="div" className="grid gap-12 lg:grid-cols-2">
            <CmsElement cmsId="b561fd90-14" as="div">
              <CmsElement cmsId="b561fd90-15" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-[var(--wc-secondary)]">Business outcomes</CmsElement>
              <CmsElement cmsId="b561fd90-16" as="h2" className="mt-3 text-3xl font-black md:text-5xl">Automation built to produce measurable value.</CmsElement>
              <CmsElement cmsId="b561fd90-17" as="div" className="mt-8 grid gap-4 sm:grid-cols-2">
                {service.outcomes.map((outcome) => (
                  <CmsElement cmsId="b561fd90-18" as="div" instance={String(outcome)} key={outcome} className="rounded-2xl border border-outline-variant/60 bg-surface p-5 font-bold">
                    <Icon name="check_circle" className="mb-3 text-2xl text-[var(--wc-secondary)]" />
                    <CmsElement cmsId="b561fd90-19" as="p">{outcome}</CmsElement>
                  </CmsElement>
                ))}
              </CmsElement>
            </CmsElement>
            <CmsElement cmsId="b561fd90-20" as="div" className="rounded-3xl bg-primary p-8 text-on-primary md:p-10">
              <CmsElement cmsId="b561fd90-21" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-200">What we deliver</CmsElement>
              <CmsElement cmsId="b561fd90-22" as="h2" className="mt-3 text-3xl font-black">A production-ready solution, not just a demo.</CmsElement>
              <CmsElement cmsId="b561fd90-23" as="ul" className="mt-8 space-y-4">
                {service.deliverables.map((item) => (
                  <CmsElement cmsId="b561fd90-24" as="li" instance={String(item)} key={item} className="flex items-start gap-3 text-blue-50">
                    <Icon name="task_alt" className="mt-0.5 text-xl text-[var(--wc-secondary)]" />
                    <CmsElement cmsId="b561fd90-25" as="span" className="font-semibold">{item}</CmsElement>
                  </CmsElement>
                ))}
              </CmsElement>
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="b561fd90-26" as="section" className="bg-surface-low px-5 py-20 md:px-margin-page md:py-24">
        <CmsElement cmsId="b561fd90-27" as="div" className="mx-auto max-w-container-max">
          <CmsElement cmsId="b561fd90-28" as="div" className="max-w-3xl">
            <CmsElement cmsId="b561fd90-29" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-[var(--wc-secondary)]">Popular use cases</CmsElement>
            <CmsElement cmsId="b561fd90-30" as="h2" className="mt-3 text-3xl font-black md:text-5xl">Where this automation makes a difference.</CmsElement>
          </CmsElement>
          <CmsElement cmsId="b561fd90-31" as="div" className="mt-10 grid gap-5 md:grid-cols-3">
            {service.useCases.map((useCase, index) => (
              <CmsElement cmsId="b561fd90-32" as="article" instance={String(useCase.title)} key={useCase.title} className="rounded-3xl border border-outline-variant/60 bg-surface p-7">
                <CmsElement cmsId="b561fd90-33" as="span" className="text-sm font-black text-[var(--wc-secondary)]">0{index + 1}</CmsElement>
                <CmsElement cmsId="b561fd90-34" as="h3" className="mt-4 text-2xl font-black">{useCase.title}</CmsElement>
                <CmsElement cmsId="b561fd90-35" as="p" className="mt-4 leading-7 text-on-surface-variant">{useCase.description}</CmsElement>
              </CmsElement>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="b561fd90-36" as="section" className="px-5 py-20 md:px-margin-page md:py-24">
        <CmsElement cmsId="b561fd90-37" as="div" className="mx-auto max-w-container-max rounded-[2rem] bg-primary p-8 text-center text-on-primary md:p-14">
          <CmsElement cmsId="b561fd90-38" as="h2" className="text-3xl font-black md:text-5xl">Ready to automate your workflow?</CmsElement>
          <CmsElement cmsId="b561fd90-39" as="p" className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100/80">Tell us what your team does manually today. We will identify a practical automation path and recommend the right technology.</CmsElement>
          <CmsLink cmsId="b561fd90-40" href={`/contact?service=${encodeURIComponent(service.name)}`} className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-xl bg-[var(--wc-secondary)] px-7 py-4 font-extrabold text-white">
            Book a discovery call <Icon name="calendar_month" />
          </CmsLink>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
