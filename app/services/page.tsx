import Link from "next/link";
import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { fallbackServices } from "@/lib/services";
import type { Service } from "@/lib/supabase/types";

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
    <main className="min-h-screen overflow-hidden bg-[var(--wc-bg)] text-on-background">
      <PublicHeader />
      <section className="relative isolate border-b border-white/10 px-5 pb-20 pt-24 md:px-margin-page md:pb-28 md:pt-32">
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,var(--wc-primary)_0%,#08275f_52%,#06162f_100%)]" />
        <div className="absolute -right-24 top-0 -z-10 h-96 w-96 rounded-full bg-[var(--wc-secondary)]/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="mx-auto grid max-w-container-max gap-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.18em] text-blue-100 backdrop-blur">
              <Icon name="design_services" /> Digital services
            </div>
            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-7xl">
              Strategy, technology and talent—connected.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-blue-100/85 md:text-lg">
              We turn ambitious ideas into practical digital products, intelligent workflows and measurable growth—supported by the same specialists who shape our products and training programs.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--wc-secondary)] px-6 py-3 font-extrabold text-white shadow-xl shadow-black/15 transition hover:-translate-y-0.5">
                Start a conversation <Icon name="arrow_forward" />
              </Link>
              <a href="#services" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15">
                Explore capabilities <Icon name="south" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map((service, index) => (
              <div key={service.id} className={`rounded-3xl border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-md ${index % 2 ? "translate-y-8" : ""}`}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--wc-secondary)] text-white">
                  <Icon name={service.icon} className="text-2xl" />
                </span>
                <p className="mt-7 text-xs font-bold uppercase tracking-wider text-blue-200">{service.category}</p>
                <h2 className="mt-2 text-lg font-extrabold">{service.title}</h2>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="px-5 py-20 md:px-margin-page md:py-28">
        <div className="mx-auto max-w-container-max">
          <div className="grid gap-7 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[var(--wc-secondary)]">What we deliver</p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">Capabilities built for real business outcomes.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-on-surface-variant lg:justify-self-end">
              Choose one focused service or combine disciplines into a complete delivery team. Every engagement is shaped around your goals, users and operating reality.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <article key={service.id} className={`group relative overflow-hidden rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${service.featured ? "border-[var(--wc-secondary)]/30 bg-[color-mix(in_srgb,var(--wc-secondary)_6%,var(--wc-surface))]" : "border-outline-variant/60 bg-surface"}`}>
                <span className="absolute right-5 top-4 text-6xl font-black text-on-surface/[.035]">{String(index + 1).padStart(2, "0")}</span>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg transition group-hover:rotate-3 group-hover:scale-105">
                  <Icon name={service.icon} className="text-3xl" />
                </div>
                <p className="mt-7 text-[11px] font-extrabold uppercase tracking-[.18em] text-[var(--wc-secondary)]">{service.category}</p>
                <h3 className="mt-2 text-2xl font-black">{service.title}</h3>
                <p className="mt-4 leading-7 text-on-surface-variant">{service.short_description}</p>
                <ul className="mt-6 space-y-3">
                  {service.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3 text-sm font-semibold text-on-surface">
                      <Icon name="check_circle" className="mt-0.5 text-lg text-[var(--wc-secondary)]" /> {highlight}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 border-t border-outline-variant/50 pt-5">
                  <Link href={`${service.cta_link}${service.cta_link.includes("?") ? "&" : "?"}service=${encodeURIComponent(service.title)}`} className="inline-flex items-center gap-2 text-sm font-extrabold text-primary transition group-hover:gap-3">
                    {service.cta_label} <Icon name="arrow_forward" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-margin-page md:pb-28">
        <div className="mx-auto grid max-w-container-max overflow-hidden rounded-[2rem] bg-primary text-on-primary lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="p-8 md:p-12">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-200">Not sure where to begin?</p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">Tell us the outcome. We’ll shape the solution.</h2>
            <p className="mt-4 max-w-2xl leading-7 text-blue-100/80">Share your goals, current challenges and timeline. Our team will recommend a practical starting point.</p>
          </div>
          <div className="p-8 pt-0 lg:p-12">
            <Link href="/contact" className="inline-flex min-h-14 items-center gap-2 rounded-xl bg-[var(--wc-secondary)] px-7 py-4 font-extrabold text-white">
              Book a discovery call <Icon name="calendar_month" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
