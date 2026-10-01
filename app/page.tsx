import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { ProductShowcaseCarousel } from "@/components/public/product-showcase-carousel";
import { Icon } from "@/components/icon";
import { TypingText } from "@/components/public/typing-text";
import { ProcessShowcase } from "@/components/public/process-showcase";
import { FadeIn, ScrollProgress } from "@/components/public/animations";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { automationServices } from "@/lib/automation-services";
import { absoluteUrl, createPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Custom Software Development & AI Automation Company",
  description: "We build custom software, websites, mobile apps and AI automation with n8n, Make.com, ChatGPT, Claude and Gemini for businesses worldwide.",
  path: "/",
  keywords: ["custom software development company", "web development services", "mobile app development company", "AI automation agency", "n8n automation services", "Make.com automation", "custom AI automation", "workflow automation company"],
});

export const revalidate = 300;

export default async function LandingPage() {
  const supabase = createSupabasePublicClient();
  const [{ data: featuredProducts }, { count: totalProductsCount }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(6),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const products = featuredProducts ?? [];
  const productCount = totalProductsCount ?? products.length;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    email: CONTACT_EMAIL,
    description: "A custom software development and AI automation company helping businesses move from idea to scalable digital brand.",
    sameAs: ["https://www.facebook.com/groups/weconnectinnovativesolutions", "https://www.linkedin.com/company/weconnect-innovative-solutions-pvt-ltd/"],
  };

  return (
    <CmsElement cmsId="6f76c4f4-0" as="main" className="overflow-x-clip bg-background text-on-background">
      <ScrollProgress />
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />

      {/* Agency Vision Hero */}
      <CmsElement cmsId="6f76c4f4-1" as="section"
        className="relative isolate overflow-hidden pb-24 pt-24 sm:pb-28 sm:pt-28"
        style={{
          backgroundColor: "var(--wc-bg)",
          color: "var(--wc-on-bg)",
        }}
      >
        <CmsElement cmsId="6f76c4f4-2" as="div" className="landing-hero-backdrop absolute inset-0 -z-10"></CmsElement>
        <CmsElement cmsId="6f76c4f4-3" as="div"
          className="absolute right-0 top-0 -z-10 h-[800px] w-[800px] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--wc-primary) 20%, transparent), color-mix(in srgb, var(--wc-secondary) 10%, transparent))",
          }}
        />

        <CmsElement cmsId="6f76c4f4-4" as="div" className="homepage-wide-container relative z-10 text-center">
          <FadeIn>
            <CmsElement cmsId="6f76c4f4-5" as="div"
              className="mb-6 mx-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-[0.2em] uppercase transition-transform duration-300 hover:scale-[1.03]"
              style={{
                border: "1px solid color-mix(in srgb, var(--wc-secondary) 34%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--wc-secondary) 12%, transparent)",
                color: "var(--wc-secondary)",
              }}
            >
              <CmsElement cmsId="6f76c4f4-6" as="span" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--wc-surface-low)] ring-1 ring-inset ring-white/10">
                <Icon name="code_blocks" className="text-[14px]" />
              </CmsElement>
              <CmsElement cmsId="6f76c4f4-7" as="span" className="inline-flex items-center gap-2 text-inherit normal-case tracking-[0.14em]">
                We Connect Innovative Solutions
                <CmsElement cmsId="6f76c4f4-8" as="span" className="company-suffix-blink text-[0.68em] font-black tracking-[0.06em] leading-none sm:text-[0.64em]">Pvt. Ltd.</CmsElement>
              </CmsElement>
            </CmsElement>
            <CmsElement cmsId="6f76c4f4-9" as="h1" className="mx-auto max-w-6xl text-balance text-[clamp(2.05rem,4.5vw,4.35rem)] font-black leading-[0.96] tracking-[-0.055em]">
              <CmsElement cmsId="6f76c4f4-10" as="span" className="landing-hero-title block">From Business Idea to a Powerful Digital Brand</CmsElement>
              <CmsElement cmsId="6f76c4f4-11" as="span" className="relative mt-4 inline-flex flex-wrap items-center justify-center gap-4 leading-none">
                <CmsElement cmsId="6f76c4f4-12" as="span"
                  className="absolute inset-x-[-1.25rem] top-1/2 -z-10 h-[72%] -translate-y-1/2 rounded-full blur-3xl"
                  style={{
                    background: "radial-gradient(circle, color-mix(in srgb, var(--wc-secondary) 24%, transparent) 0%, transparent 72%)",
                  }}
                />
                <CmsElement cmsId="6f76c4f4-13" as="span"
                  className="inline-flex h-[4.25rem] items-center justify-center rounded-[1.75rem] border px-5 py-0 leading-[0] shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:h-[4.75rem]"
                  style={{
                    borderColor: "color-mix(in srgb, var(--wc-secondary) 26%, transparent)",
                    backgroundColor: "var(--landing-hero-panel)",
                  }}
                >
                <CmsElement cmsId="6f76c4f4-14" as="span" className="inline-flex h-full items-center justify-center bg-clip-text leading-[0] text-transparent" style={{ backgroundImage: "linear-gradient(90deg, var(--wc-primary), var(--wc-secondary))" }}>
                    <TypingText
                      text={["Custom Software.", "Web Experiences.", "Mobile Apps.", "AI Automation.", "Scalable Products."]}
                      speed={72}
                      startDelay={250}
                      holdDelay={2200}
                      className="text-[clamp(1.1rem,4.4vw,2.6rem)] leading-[1.02] tracking-[-0.04em] sm:text-[clamp(1.25rem,3.2vw,2.6rem)] sm:leading-none"
                    />
                  </CmsElement>
                </CmsElement>
              </CmsElement>
            </CmsElement>
            <CmsElement cmsId="6f76c4f4-15" as="p" className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 sm:text-xl sm:leading-9" style={{ color: "var(--wc-on-surface-variant)" }}>
              We build custom software, websites, mobile apps and AI automations with n8n, Make.com, ChatGPT, Claude and Gemini—helping businesses launch, grow and scale.
            </CmsElement>
            <CmsElement cmsId="6f76c4f4-16" as="div" className="mt-10 flex flex-wrap justify-center gap-4">
              <CmsLink cmsId="6f76c4f4-17"
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-bold transition-all hover:scale-105"
                style={{
                  backgroundColor: "var(--wc-primary)",
                  color: "var(--wc-on-primary)",
                  boxShadow: "0 0 40px color-mix(in srgb, var(--wc-secondary) 30%, transparent)",
                }}
              >
                Start Your Project <Icon name="arrow_forward" className="text-xl" />
              </CmsLink>
              <CmsLink cmsId="6f76c4f4-18" href="/services" className="landing-hero-secondary inline-flex items-center justify-center rounded-xl border px-8 py-4 text-base font-bold backdrop-blur-sm transition-colors">
                Explore Our Solutions
              </CmsLink>
            </CmsElement>
            <CmsElement cmsId="6f76c4f4-19" as="div" className="landing-hero-features mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 rounded-2xl border p-3 text-left backdrop-blur-sm sm:grid-cols-3 sm:text-center">
              {[
                ["lightbulb", "Strategy & brand foundation"],
                ["rocket_launch", "Software built to scale"],
                ["handshake", "Long-term technology partner"],
              ].map(([icon, label]) => (
                <CmsElement cmsId="6f76c4f4-20" as="div" instance={String(label)} key={label} className="landing-hero-feature flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold">
                  <Icon name={icon} className="text-[19px] text-[var(--wc-secondary)]" />
                  <CmsElement cmsId="6f76c4f4-21" as="span">{label}</CmsElement>
                </CmsElement>
              ))}
            </CmsElement>
          </FadeIn>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="6f76c4f4-22" as="section" className="bg-[var(--wc-surface-lowest)] py-16 sm:py-20" aria-labelledby="digital-solutions-heading">
        <CmsElement cmsId="6f76c4f4-23" as="div" className="homepage-wide-container">
          <CmsElement cmsId="6f76c4f4-24" as="div" className="mx-auto max-w-3xl text-center">
            <CmsElement cmsId="6f76c4f4-25" as="div" className="wc-section-label mb-4"><Icon name="hub" className="text-sm" /> Complete Digital Solutions</CmsElement>
            <CmsElement cmsId="6f76c4f4-26" as="h2" id="digital-solutions-heading" className="text-3xl font-extrabold sm:text-4xl lg:text-5xl" style={{ color: "var(--wc-on-surface)" }}>
              One technology partner from strategy to scale
            </CmsElement>
            <CmsElement cmsId="6f76c4f4-27" as="p" className="mt-4 text-base leading-7 text-on-surface-variant sm:text-lg">
              We combine product strategy, design, engineering and automation to turn business requirements into reliable digital products.
            </CmsElement>
          </CmsElement>
          <CmsElement cmsId="6f76c4f4-28" as="div" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["web", "Web Development", "Fast, conversion-focused websites, e-commerce experiences and scalable web applications.", "/services/web-development-services"],
              ["phone_iphone", "Mobile App Development", "Polished iOS, Android and cross-platform apps connected to your business systems.", "/services/mobile-app-development"],
              ["deployed_code", "Custom Software", "SaaS products, portals, dashboards and internal systems built around your operations.", "/services/custom-software-development"],
              ["automation", "AI Automation", "n8n, Make.com and AI-powered workflows that reduce manual work and speed up delivery.", "/services/n8n-automation-services"],
              ["design_services", "UI/UX & Product Design", "Clear digital experiences shaped around your users, goals and brand identity.", "/contact"],
              ["trending_up", "Growth & Ongoing Support", "Technical improvement, integrations and long-term support as your business grows.", "/contact"],
            ].map(([icon, title, description, href]) => (
              <CmsLink cmsId="6f76c4f4-29" instance={String(title)} key={title} href={href} className="group rounded-2xl border border-outline-variant/60 bg-[var(--wc-bg)] p-6 transition hover:-translate-y-1 hover:border-[var(--wc-secondary)]/50 hover:shadow-xl">
                <Icon name={icon} className="text-3xl text-[var(--wc-secondary)]" />
                <CmsElement cmsId="6f76c4f4-30" as="h3" className="mt-5 text-xl font-black text-on-surface">{title}</CmsElement>
                <CmsElement cmsId="6f76c4f4-31" as="p" className="mt-3 text-sm leading-6 text-on-surface-variant">{description}</CmsElement>
                <CmsElement cmsId="6f76c4f4-32" as="span" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary">Learn more <Icon name="arrow_forward" /></CmsElement>
              </CmsLink>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="6f76c4f4-33" as="section" className="border-y border-outline-variant/50 bg-[var(--wc-surface)] py-16 sm:py-20">
        <CmsElement cmsId="6f76c4f4-34" as="div" className="homepage-wide-container">
          <CmsElement cmsId="6f76c4f4-35" as="div" className="mx-auto max-w-3xl text-center">
            <CmsElement cmsId="6f76c4f4-36" as="div" className="wc-section-label mb-4"><Icon name="automation" className="text-sm" /> AI Automation Services</CmsElement>
            <CmsElement cmsId="6f76c4f4-37" as="h2" className="text-3xl font-extrabold sm:text-4xl lg:text-5xl" style={{ color: "var(--wc-on-surface)" }}>Connect your tools. Automate the work. Scale your team.</CmsElement>
            <CmsElement cmsId="6f76c4f4-38" as="p" className="mt-4 text-base leading-7 text-on-surface-variant sm:text-lg">From a single workflow to an AI-enabled operations system, we build automation around your real business process.</CmsElement>
          </CmsElement>
          <CmsElement cmsId="6f76c4f4-39" as="div" className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {automationServices.map((service) => (
              <CmsLink cmsId="6f76c4f4-40" instance={String(service.slug)} key={service.slug} href={`/services/${service.slug}`} className="group rounded-2xl border border-outline-variant/60 bg-[var(--wc-bg)] p-6 transition hover:-translate-y-1 hover:border-[var(--wc-secondary)]/50 hover:shadow-xl">
                <Icon name="arrow_outward" className="text-2xl text-[var(--wc-secondary)]" />
                <CmsElement cmsId="6f76c4f4-41" as="h3" className="mt-5 text-xl font-black text-on-surface">{service.shortName}</CmsElement>
                <CmsElement cmsId="6f76c4f4-42" as="p" className="mt-3 text-sm leading-6 text-on-surface-variant">{service.description}</CmsElement>
              </CmsLink>
            ))}
          </CmsElement>
          <CmsElement cmsId="6f76c4f4-43" as="div" className="mt-8 text-center"><CmsLink cmsId="6f76c4f4-44" href="/services" className="inline-flex items-center gap-2 font-extrabold text-primary">Explore all services <Icon name="arrow_forward" /></CmsLink></CmsElement>
        </CmsElement>
      </CmsElement>

      {/* How To Get Products Built (Process) */}
      <CmsElement cmsId="6f76c4f4-45" as="section" className="overflow-hidden bg-[var(--wc-surface-lowest)] py-14 sm:py-16 lg:py-20">
        <CmsElement cmsId="6f76c4f4-46" as="div" className="homepage-wide-container">
          <CmsElement cmsId="6f76c4f4-47" as="div" className="mx-auto mb-9 max-w-3xl text-center sm:mb-10">
            <FadeIn>
              <CmsElement cmsId="6f76c4f4-48" as="div" className="wc-section-label mb-4">
                <Icon name="model_training" className="text-sm" /> Our Process
              </CmsElement>
              <CmsElement cmsId="6f76c4f4-49" as="h2" className="text-3xl font-extrabold sm:text-4xl lg:text-5xl" style={{ color: "var(--wc-on-surface)" }}>
                How We Build Your Product
              </CmsElement>
              <CmsElement cmsId="6f76c4f4-50" as="p" className="mt-3 text-base text-on-surface-variant sm:text-lg">
                A streamlined, transparent process from your first idea to a successfully launched product.
              </CmsElement>
            </FadeIn>
          </CmsElement>

          <CmsElement cmsId="6f76c4f4-51" as="div" className="relative">
            <ProcessShowcase />
          </CmsElement>
        </CmsElement>
      </CmsElement>

      {/* Product Showcase Carousel */}
      <CmsElement cmsId="6f76c4f4-52" as="div" id="portfolio">
        <ProductShowcaseCarousel products={products} totalCount={productCount} />
      </CmsElement>

      {/* Final Agency CTA */}
      <CmsElement cmsId="6f76c4f4-53" as="section" className="relative overflow-hidden py-24 text-center" style={{ backgroundColor: "var(--wc-surface)", color: "var(--wc-on-surface)" }}>
        <CmsElement cmsId="6f76c4f4-54" as="div" className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)] bg-[length:24px_24px] [background-image:radial-gradient(#ffffff_1px,transparent_1px)]"></CmsElement>
        <CmsElement cmsId="6f76c4f4-55" as="div" className="homepage-wide-container relative z-10">
          <FadeIn>
            <CmsElement cmsId="6f76c4f4-56" as="h2" className="text-4xl font-extrabold sm:text-5xl mb-6">Have an Idea? Let&apos;s Build It.</CmsElement>
            <CmsElement cmsId="6f76c4f4-57" as="p" className="mb-10 text-lg max-w-2xl mx-auto" style={{ color: "var(--wc-on-surface-variant)" }}>
              Partner with our expert development team. Bring your vision to life with robust engineering and stunning design.
            </CmsElement>
            <CmsLink cmsId="6f76c4f4-58" href="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl px-10 py-5 text-lg font-black transition-transform hover:scale-105" style={{ backgroundColor: "var(--wc-surface-lowest)", color: "var(--wc-primary)", boxShadow: "0 12px 40px rgba(255,255,255,0.15)" }}>
              Discuss Your Project <Icon name="send" />
            </CmsLink>
          </FadeIn>
        </CmsElement>
      </CmsElement>

      {/* Standard Footer for Agency */}
      <CmsElement cmsId="6f76c4f4-59" as="footer" className="border-t py-12" style={{ backgroundColor: "var(--wc-bg)", color: "var(--wc-on-surface-variant)", borderColor: "color-mix(in srgb, var(--wc-on-bg) 5%, transparent)" }}>
        <CmsElement cmsId="6f76c4f4-60" as="div" className="homepage-wide-container flex flex-col items-center justify-between gap-6 lg:flex-row">
          <CmsElement cmsId="6f76c4f4-61" as="div" className="text-xl font-bold" style={{ color: "var(--wc-on-bg)" }}>We Connect Innovative Solutions Pvt. Ltd.</CmsElement>
          <CmsElement cmsId="6f76c4f4-62" as="div" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <CmsLink cmsId="6f76c4f4-63" href="/internships" className="transition-colors hover:text-[var(--wc-secondary)]">Looking for Internships?</CmsLink>
            <CmsLink cmsId="6f76c4f4-64" href="/contact" className="transition-colors hover:text-[var(--wc-secondary)]">Contact Us</CmsLink>
            <CmsElement cmsId="6f76c4f4-65" as="a"
              href="https://www.facebook.com/groups/weconnectinnovativesolutions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-[var(--wc-secondary)]"
              aria-label="Visit the We Connect Facebook community"
            >
              <Icon name="facebook" className="text-lg" />
              Facebook Group
            </CmsElement>
            <CmsElement cmsId="6f76c4f4-66" as="a"
              href="https://www.linkedin.com/company/weconnect-innovative-solutions-pvt-ltd/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-[var(--wc-secondary)]"
              aria-label="Visit the We Connect LinkedIn company page"
            >
              <CmsElement cmsId="6f76c4f4-67" as="span" className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm border border-current text-[11px] font-black leading-none" aria-hidden="true">in</CmsElement>
              LinkedIn Company
            </CmsElement>
          </CmsElement>
          <CmsElement cmsId="6f76c4f4-68" as="p" className="text-center text-sm lg:text-right">
            &copy; 2026 We Connect Innovative Solutions Pvt. Ltd. All rights reserved.{" "}
            <CmsElement cmsId="6f76c4f4-69" as="a" href={CONTACT_EMAIL_HREF} className="hover:underline" style={{ color: "var(--wc-secondary)" }}>{CONTACT_EMAIL}</CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
