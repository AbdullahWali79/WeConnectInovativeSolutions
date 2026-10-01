import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { fallbackServices } from "@/lib/services";
import type { Service } from "@/lib/supabase/types";
import { automationServices } from "@/lib/automation-services";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "AI Automation & Software Development Services",
  description: "Explore n8n, Make.com, ChatGPT, Claude, Gemini, custom automation and software development services for businesses worldwide.",
  path: "/services",
  keywords: ["AI automation services", "n8n automation", "Make.com automation", "custom software development", "workflow automation agency"],
});

export const dynamic = "force-dynamic";

async function getServices() {
  try {
    const { data, error } = await createSupabasePublicClient()
      .from("services")
      .select("*")
      .eq("status", "active")
      .order("featured", { ascending: false })
      .order("display_order", { ascending: true });
    if (error || !data?.length) return fallbackServices;
    return data as Service[];
  } catch {
    return fallbackServices;
  }
}

export default async function ServicesPage() {
  const services = await getServices();
  const featured = services.filter((service) => service.featured).slice(0, 4);

  return (
    <CmsElement cmsId="d7316d76-0" as="main" className="min-h-screen overflow-hidden bg-[var(--wc-bg)] text-on-background">
      <PublicHeader />
      <CmsElement cmsId="d7316d76-1" as="section" className="relative isolate border-b border-white/10 px-5 pb-20 pt-24 md:px-margin-page md:pb-28 md:pt-32">
        <CmsElement cmsId="d7316d76-2" as="div" className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,var(--wc-primary)_0%,#08275f_52%,#06162f_100%)]" />
        <CmsElement cmsId="d7316d76-3" as="div" className="absolute -right-24 top-0 -z-10 h-96 w-96 rounded-full bg-[var(--wc-secondary)]/20 blur-3xl" />
        <CmsElement cmsId="d7316d76-4" as="div" className="absolute -bottom-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
        <CmsElement cmsId="d7316d76-5" as="div" className="mx-auto grid max-w-container-max gap-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <CmsElement cmsId="d7316d76-6" as="div">
            <CmsElement cmsId="d7316d76-7" as="div" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.18em] text-blue-100 backdrop-blur">
              <Icon name="design_services" /> Digital services
            </CmsElement>
            <CmsElement cmsId="d7316d76-8" as="h1" className="mt-7 max-w-4xl text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-7xl">
              AI automation and software built for business growth.
            </CmsElement>
            <CmsElement cmsId="d7316d76-9" as="p" className="mt-7 max-w-2xl text-base leading-8 text-blue-100/85 md:text-lg">
              From n8n and Make.com workflows to custom AI agents and software, we connect your tools, data and teams with reliable solutions built for measurable outcomes.
            </CmsElement>
            <CmsElement cmsId="d7316d76-10" as="div" className="mt-9 flex flex-wrap gap-3">
              <CmsLink cmsId="d7316d76-11" href="/contact" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--wc-secondary)] px-6 py-3 font-extrabold text-white shadow-xl shadow-black/15 transition hover:-translate-y-0.5">
                Start a conversation <Icon name="arrow_forward" />
              </CmsLink>
              <CmsElement cmsId="d7316d76-12" as="a" href="#services" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15">
                Explore capabilities <Icon name="south" />
              </CmsElement>
            </CmsElement>
          </CmsElement>
          <CmsElement cmsId="d7316d76-13" as="div" className="grid grid-cols-2 gap-3">
            {featured.map((service, index) => (
              <CmsElement cmsId="d7316d76-14" as="div" instance={String(service.id)} key={service.id} className={`rounded-3xl border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-md ${index % 2 ? "translate-y-8" : ""}`}>
                <CmsElement cmsId="d7316d76-15" as="span" className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--wc-secondary)] text-white">
                  <Icon name={service.icon} className="text-2xl" />
                </CmsElement>
                <CmsElement cmsId="d7316d76-16" as="p" className="mt-7 text-xs font-bold uppercase tracking-wider text-blue-200">{service.category}</CmsElement>
                <CmsElement cmsId="d7316d76-17" as="h2" className="mt-2 text-lg font-extrabold">{service.title}</CmsElement>
              </CmsElement>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="d7316d76-18" as="section" className="border-b border-outline-variant/50 bg-surface-low px-5 py-20 md:px-margin-page md:py-24">
        <CmsElement cmsId="d7316d76-19" as="div" className="mx-auto max-w-container-max">
          <CmsElement cmsId="d7316d76-20" as="div" className="max-w-3xl">
            <CmsElement cmsId="d7316d76-21" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-[var(--wc-secondary)]">AI & workflow automation</CmsElement>
            <CmsElement cmsId="d7316d76-22" as="h2" className="mt-3 text-3xl font-black leading-tight md:text-5xl">Choose the automation expertise your workflow needs.</CmsElement>
            <CmsElement cmsId="d7316d76-23" as="p" className="mt-5 text-base leading-7 text-on-surface-variant">We work with businesses worldwide to remove repetitive work, connect disconnected systems and introduce AI with practical safeguards.</CmsElement>
          </CmsElement>
          <CmsElement cmsId="d7316d76-24" as="div" className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {automationServices.map((service) => (
              <CmsElement cmsId="d7316d76-25" as="article" instance={String(service.slug)} key={service.slug} className="group rounded-3xl border border-outline-variant/60 bg-surface p-7 transition hover:-translate-y-1 hover:shadow-xl">
                <Icon name="automation" className="text-3xl text-[var(--wc-secondary)]" />
                <CmsElement cmsId="d7316d76-26" as="h3" className="mt-5 text-2xl font-black">{service.shortName}</CmsElement>
                <CmsElement cmsId="d7316d76-27" as="p" className="mt-4 leading-7 text-on-surface-variant">{service.metaDescription}</CmsElement>
                <CmsLink cmsId="d7316d76-28" href={`/services/${service.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-primary transition group-hover:gap-3">
                  Explore service <Icon name="arrow_forward" />
                </CmsLink>
              </CmsElement>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="d7316d76-29" as="section" id="services" className="px-5 py-20 md:px-margin-page md:py-28">
        <CmsElement cmsId="d7316d76-30" as="div" className="mx-auto max-w-container-max">
          <CmsElement cmsId="d7316d76-31" as="div" className="grid gap-7 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <CmsElement cmsId="d7316d76-32" as="div">
              <CmsElement cmsId="d7316d76-33" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-[var(--wc-secondary)]">What we deliver</CmsElement>
              <CmsElement cmsId="d7316d76-34" as="h2" className="mt-3 text-3xl font-black leading-tight md:text-5xl">Capabilities built for real business outcomes.</CmsElement>
            </CmsElement>
            <CmsElement cmsId="d7316d76-35" as="p" className="max-w-2xl text-base leading-7 text-on-surface-variant lg:justify-self-end">
              Choose one focused service or combine disciplines into a complete delivery team. Every engagement is shaped around your goals, users and operating reality.
            </CmsElement>
          </CmsElement>
          <CmsElement cmsId="d7316d76-36" as="div" className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <CmsElement cmsId="d7316d76-37" as="article" instance={String(service.id)} key={service.id} className={`group relative overflow-hidden rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${service.featured ? "border-[var(--wc-secondary)]/30 bg-[color-mix(in_srgb,var(--wc-secondary)_6%,var(--wc-surface))]" : "border-outline-variant/60 bg-surface"}`}>
                <CmsElement cmsId="d7316d76-38" as="span" className="absolute right-5 top-4 text-6xl font-black text-on-surface/[.035]">{String(index + 1).padStart(2, "0")}</CmsElement>
                <CmsElement cmsId="d7316d76-39" as="div" className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg transition group-hover:rotate-3 group-hover:scale-105">
                  <Icon name={service.icon} className="text-3xl" />
                </CmsElement>
                <CmsElement cmsId="d7316d76-40" as="p" className="mt-7 text-[11px] font-extrabold uppercase tracking-[.18em] text-[var(--wc-secondary)]">{service.category}</CmsElement>
                <CmsElement cmsId="d7316d76-41" as="h3" className="mt-2 text-2xl font-black">{service.title}</CmsElement>
                <CmsElement cmsId="d7316d76-42" as="p" className="mt-4 leading-7 text-on-surface-variant">{service.short_description}</CmsElement>
                <CmsElement cmsId="d7316d76-43" as="ul" className="mt-6 space-y-3">
                  {service.highlights.map((highlight) => (
                    <CmsElement cmsId="d7316d76-44" as="li" instance={String(highlight)} key={highlight} className="flex items-start gap-3 text-sm font-semibold text-on-surface">
                      <Icon name="check_circle" className="mt-0.5 text-lg text-[var(--wc-secondary)]" /> {highlight}
                    </CmsElement>
                  ))}
                </CmsElement>
                <CmsElement cmsId="d7316d76-45" as="div" className="mt-7 border-t border-outline-variant/50 pt-5">
                  <CmsLink cmsId="d7316d76-46" href={`${service.cta_link}${service.cta_link.includes("?") ? "&" : "?"}service=${encodeURIComponent(service.title)}`} className="inline-flex items-center gap-2 text-sm font-extrabold text-primary transition group-hover:gap-3">
                    {service.cta_label} <Icon name="arrow_forward" />
                  </CmsLink>
                </CmsElement>
              </CmsElement>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="d7316d76-47" as="section" className="px-5 pb-20 md:px-margin-page md:pb-28">
        <CmsElement cmsId="d7316d76-48" as="div" className="mx-auto grid max-w-container-max overflow-hidden rounded-[2rem] bg-primary text-on-primary lg:grid-cols-[1fr_auto] lg:items-center">
          <CmsElement cmsId="d7316d76-49" as="div" className="p-8 md:p-12">
            <CmsElement cmsId="d7316d76-50" as="p" className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-200">Not sure where to begin?</CmsElement>
            <CmsElement cmsId="d7316d76-51" as="h2" className="mt-3 text-3xl font-black md:text-4xl">Tell us the outcome. We’ll shape the solution.</CmsElement>
            <CmsElement cmsId="d7316d76-52" as="p" className="mt-4 max-w-2xl leading-7 text-blue-100/80">Share your goals, current challenges and timeline. Our team will recommend a practical starting point.</CmsElement>
          </CmsElement>
          <CmsElement cmsId="d7316d76-53" as="div" className="p-8 pt-0 lg:p-12">
            <CmsLink cmsId="d7316d76-54" href="/contact" className="inline-flex min-h-14 items-center gap-2 rounded-xl bg-[var(--wc-secondary)] px-7 py-4 font-extrabold text-white">
              Book a discovery call <Icon name="calendar_month" />
            </CmsLink>
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
