import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public/public-header";
import { ContactQueryForm } from "@/components/public/contact-query-form";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

export const revalidate = 300;

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />

      <section className="relative overflow-hidden bg-[var(--wc-bg)] py-16 md:py-24">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page text-center md:text-left">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-6">
              <Icon name="mail" className="text-sm" /> Contact Us
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-on-surface">Send a quick query</h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--wc-on-surface-variant)] max-w-2xl">
              Share your question below and our team will reply by email at{" "}
              <a href={CONTACT_EMAIL_HREF} className="text-on-surface underline underline-offset-4">{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--wc-bg)] pb-16 md:pb-24">
        <div className="mx-auto max-w-3xl px-5 md:px-margin-page">
          <div className="rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-10">
            <ContactQueryForm />
          </div>
        </div>
      </section>
    </main>
  );
}
