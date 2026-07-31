import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { ProductShowcaseCarousel } from "@/components/public/product-showcase-carousel";
import { Icon } from "@/components/icon";
import { TypingText } from "@/components/public/typing-text";
import { ProcessShowcase } from "@/components/public/process-showcase";
import { FadeIn, ScrollProgress } from "@/components/public/animations";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

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

  return (
    <main className="overflow-x-clip bg-background text-on-background">
      <ScrollProgress />
      <PublicHeader />

      {/* Agency Vision Hero */}
      <section
        className="relative isolate overflow-hidden pb-24 pt-24 sm:pb-28 sm:pt-28"
        style={{
          backgroundColor: "var(--wc-bg)",
          color: "var(--wc-on-bg)",
        }}
      >
        <div className="landing-hero-backdrop absolute inset-0 -z-10"></div>
        <div
          className="absolute right-0 top-0 -z-10 h-[800px] w-[800px] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--wc-primary) 20%, transparent), color-mix(in srgb, var(--wc-secondary) 10%, transparent))",
          }}
        />

        <div className="homepage-wide-container relative z-10 text-center">
          <FadeIn>
            <div
              className="mb-6 mx-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-[0.2em] uppercase transition-transform duration-300 hover:scale-[1.03]"
              style={{
                border: "1px solid color-mix(in srgb, var(--wc-secondary) 34%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--wc-secondary) 12%, transparent)",
                color: "var(--wc-secondary)",
              }}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--wc-surface-low)] ring-1 ring-inset ring-white/10">
                <Icon name="code_blocks" className="text-[14px]" />
              </span>
              <span className="inline-flex items-center gap-2 text-inherit normal-case tracking-[0.14em]">
                We Connect Innovative Solutions
                <span className="company-suffix-blink text-[0.68em] font-black tracking-[0.06em] leading-none sm:text-[0.64em]">Pvt. Ltd.</span>
              </span>
            </div>
            <h1 className="mx-auto max-w-6xl text-balance text-[clamp(2.05rem,4.5vw,4.35rem)] font-black leading-[0.96] tracking-[-0.055em]">
              <span className="landing-hero-title block">We Build Digital Products That</span>
              <span className="relative mt-4 inline-flex flex-wrap items-center justify-center gap-4 leading-none">
                <span
                  className="absolute inset-x-[-1.25rem] top-1/2 -z-10 h-[72%] -translate-y-1/2 rounded-full blur-3xl"
                  style={{
                    background: "radial-gradient(circle, color-mix(in srgb, var(--wc-secondary) 24%, transparent) 0%, transparent 72%)",
                  }}
                />
                <span
                  className="inline-flex h-[4.25rem] items-center justify-center rounded-[1.75rem] border px-5 py-0 leading-[0] shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:h-[4.75rem]"
                  style={{
                    borderColor: "color-mix(in srgb, var(--wc-secondary) 26%, transparent)",
                    backgroundColor: "var(--landing-hero-panel)",
                  }}
                >
                <span className="inline-flex h-full items-center justify-center bg-clip-text leading-[0] text-transparent" style={{ backgroundImage: "linear-gradient(90deg, var(--wc-primary), var(--wc-secondary))" }}>
                    <TypingText
                      text={["Grow Businesses.", "Scale With Confidence.", "Convert More Customers.", "Automate Your Operations.", "Move Your Brand Forward."]}
                      speed={72}
                      startDelay={250}
                      holdDelay={2200}
                      className="text-[clamp(1.1rem,4.4vw,2.6rem)] leading-[1.02] tracking-[-0.04em] sm:text-[clamp(1.25rem,3.2vw,2.6rem)] sm:leading-none"
                    />
                  </span>
                </span>
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 sm:text-xl sm:leading-9" style={{ color: "var(--wc-on-surface-variant)" }}>
              Custom software, web platforms and intelligent automation—from strategy to launch.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-bold transition-all hover:scale-105"
                style={{
                  backgroundColor: "var(--wc-primary)",
                  color: "var(--wc-on-primary)",
                  boxShadow: "0 0 40px color-mix(in srgb, var(--wc-secondary) 30%, transparent)",
                }}
              >
                Start Your Project <Icon name="arrow_forward" className="text-xl" />
              </Link>
              <Link href="#portfolio" className="landing-hero-secondary inline-flex items-center justify-center rounded-xl border px-8 py-4 text-base font-bold backdrop-blur-sm transition-colors">
                View Our Work
              </Link>
            </div>
            <div className="landing-hero-features mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 rounded-2xl border p-3 text-left backdrop-blur-sm sm:grid-cols-3 sm:text-center">
              {[
                ["lightbulb", "Strategy-led solutions"],
                ["rocket_launch", "Built to scale cleanly"],
                ["handshake", "Client-first delivery"],
              ].map(([icon, label]) => (
                <div key={label} className="landing-hero-feature flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold">
                  <Icon name={icon} className="text-[19px] text-[var(--wc-secondary)]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How To Get Products Built (Process) */}
      <section className="overflow-hidden bg-[var(--wc-surface-lowest)] py-14 sm:py-16 lg:py-20">
        <div className="homepage-wide-container">
          <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-10">
            <FadeIn>
              <div className="wc-section-label mb-4">
                <Icon name="model_training" className="text-sm" /> Our Process
              </div>
              <h2 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl" style={{ color: "var(--wc-on-surface)" }}>
                How We Build Your Product
              </h2>
              <p className="mt-3 text-base text-on-surface-variant sm:text-lg">
                A streamlined, transparent process from your first idea to a successfully launched product.
              </p>
            </FadeIn>
          </div>

          <div className="relative">
            <ProcessShowcase />
          </div>
        </div>
      </section>

      {/* Product Showcase Carousel */}
      <div id="portfolio">
        <ProductShowcaseCarousel products={products} totalCount={productCount} />
      </div>

      {/* Leadership / Team Section */}
      <section className="bg-[var(--wc-surface)] py-16 sm:py-24" style={{ color: "var(--wc-on-surface)" }}>
        <div className="homepage-wide-container">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <FadeIn>
              <div className="wc-section-label mb-4">
                <Icon name="groups" className="text-sm" /> Our Team
              </div>
              <h2 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Meet Our Leadership
              </h2>
              <p className="mt-4 text-base text-[var(--wc-on-surface-variant)] sm:text-lg">
                The experts driving innovation and excellence at We Connect Innovative Solutions.
              </p>
            </FadeIn>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
            <FadeIn delay={100}>
              <div className="group relative flex h-full flex-col items-center rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--wc-primary-container)] text-[var(--wc-on-primary-container)]">
                   <Icon name="person" className="text-5xl" />
                </div>
                <h3 className="text-xl font-bold">Dr. Hammad Habib Qazi</h3>
                <p className="mt-1 text-xs font-black uppercase tracking-wider text-[var(--wc-primary)]">Founder & CEO</p>
                <p className="mt-4 text-sm text-[var(--wc-on-surface-variant)] flex-grow">
                  Leading the vision and strategy for digital excellence and innovation.
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  <a href="tel:03217726944" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wc-surface-container)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:bg-[var(--wc-primary)] hover:text-white">
                    <Icon name="call" className="text-[18px]" /> 0321 772 6944
                  </a>
                  <a href="https://www.linkedin.com/in/hummad-h-qazi-01bb8662/" target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wc-outline)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:border-[#0077b5] hover:bg-[#0077b5] hover:text-white">
                    <span className="font-serif text-[14px] font-bold leading-none" aria-hidden="true">in</span> Connect on LinkedIn
                  </a>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <div className="group relative flex h-full flex-col items-center rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--wc-primary-container)] text-[var(--wc-on-primary-container)]">
                   <Icon name="manage_accounts" className="text-5xl" />
                </div>
                <h3 className="text-xl font-bold">Muhammad Abdullah</h3>
                <p className="mt-1 text-xs font-black uppercase tracking-wider text-[var(--wc-primary)]">Manager</p>
                <p className="mt-4 text-sm text-[var(--wc-on-surface-variant)] flex-grow">
                  Overseeing operations, product development, and ensuring client success.
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  <a href="tel:03046983794" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wc-surface-container)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:bg-[var(--wc-primary)] hover:text-white">
                    <Icon name="call" className="text-[18px]" /> 0304 698 3794
                  </a>
                  <a href="https://www.linkedin.com/in/abdullahwale/" target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wc-outline)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:border-[#0077b5] hover:bg-[#0077b5] hover:text-white">
                    <span className="font-serif text-[14px] font-bold leading-none" aria-hidden="true">in</span> Connect on LinkedIn
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Final Agency CTA */}
      <section className="relative overflow-hidden py-24 text-center" style={{ backgroundColor: "var(--wc-surface)", color: "var(--wc-on-surface)" }}>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)] bg-[length:24px_24px] [background-image:radial-gradient(#ffffff_1px,transparent_1px)]"></div>
        <div className="homepage-wide-container relative z-10">
          <FadeIn>
            <h2 className="text-4xl font-extrabold sm:text-5xl mb-6">Have an Idea? Let&apos;s Build It.</h2>
            <p className="mb-10 text-lg max-w-2xl mx-auto" style={{ color: "var(--wc-on-surface-variant)" }}>
              Partner with our expert development team. Bring your vision to life with robust engineering and stunning design.
            </p>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl px-10 py-5 text-lg font-black transition-transform hover:scale-105" style={{ backgroundColor: "var(--wc-surface-lowest)", color: "var(--wc-primary)", boxShadow: "0 12px 40px rgba(255,255,255,0.15)" }}>
              Discuss Your Project <Icon name="send" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Standard Footer for Agency */}
      <footer className="border-t py-12" style={{ backgroundColor: "var(--wc-bg)", color: "var(--wc-on-surface-variant)", borderColor: "color-mix(in srgb, var(--wc-on-bg) 5%, transparent)" }}>
        <div className="homepage-wide-container flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="text-xl font-bold" style={{ color: "var(--wc-on-bg)" }}>We Connect Innovative Solutions Pvt. Ltd.</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <Link href="/internships" className="transition-colors hover:text-[var(--wc-secondary)]">Looking for Internships?</Link>
            <Link href="/contact" className="transition-colors hover:text-[var(--wc-secondary)]">Contact Us</Link>
            <a
              href="https://www.facebook.com/groups/weconnectinnovativesolutions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-[var(--wc-secondary)]"
              aria-label="Visit the We Connect Facebook community"
            >
              <Icon name="facebook" className="text-lg" />
              Facebook Group
            </a>
            <a
              href="https://www.linkedin.com/company/weconnect-innovative-solutions-pvt-ltd/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-[var(--wc-secondary)]"
              aria-label="Visit the We Connect LinkedIn company page"
            >
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm border border-current text-[11px] font-black leading-none" aria-hidden="true">in</span>
              LinkedIn Company
            </a>
          </div>
          <p className="text-center text-sm lg:text-right">
            &copy; 2026 We Connect Innovative Solutions Pvt. Ltd. All rights reserved.{" "}
            <a href={CONTACT_EMAIL_HREF} className="hover:underline" style={{ color: "var(--wc-secondary)" }}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
