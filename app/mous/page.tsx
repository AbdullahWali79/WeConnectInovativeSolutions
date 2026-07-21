import { PublicHeader } from "@/components/public/public-header";
import { FadeIn } from "@/components/public/animations";
import { Icon } from "@/components/icon";
import Link from "next/link";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { MousCarousel } from "@/components/public/mous-carousel";

export const revalidate = 300;

export const metadata = {
  title: "Partner Software Houses | WeConnect-Innovation",
  description: "Explore our trusted industry partners and software houses.",
};

export default async function MOUsPage() {
  const supabase = createSupabasePublicClient();
  const { data: mouPartners } = await supabase
    .from("software_houses")
    .select("id,name,tagline,logo_url,website_url,facebook_url")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const partners = mouPartners ?? [];

  return (
    <main className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--wc-bg)] py-20 lg:py-32">
        {/* Background glow effects */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></div>

        <div className="relative z-10 homepage-wide-container text-center px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              <Icon name="handshake" className="text-sm" /> Industry Network
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-on-surface">
              Trusted Industry <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] bg-clip-text text-transparent">Collaborations</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--wc-on-surface-variant)]">
              WeConnect-Innovation has established professional MOUs with multiple software houses to create practical learning experiences, real project opportunities, and seamless internship pathways.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Partners 3D Carousel */}
      <section className="relative bg-[var(--wc-bg)] pb-32 pt-10">
        <div className="relative z-10 w-full overflow-hidden">
          <MousCarousel partners={partners} />
        </div>
      </section>

      {/* Become a Partner CTA */}
      <section className="relative overflow-hidden bg-[var(--wc-surface-lowest)]/40 py-24 text-center border-t border-[var(--wc-outline-variant)]">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(var(--landing-accent-rgb),0.1),transparent)] pointer-events-none"></div>
        <div className="relative z-10 homepage-wide-container px-5 md:px-margin-page">
          <FadeIn>
            <h2 className="text-3xl font-black text-on-surface md:text-4xl">Interested in Partnering with Us?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--wc-on-surface-variant)]">
              Are you a software house looking for fresh, industry-ready talent? Let&apos;s collaborate.
            </p>
            <Link href="/contact" className="mt-10 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] px-10 py-4 text-sm font-black text-on-primary shadow-[0_0_20px_rgba(var(--landing-accent-rgb),0.3)] transition-transform hover:scale-[1.02]">
              CONTACT US FOR MOUS
            </Link>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
