import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { FeedbackForm } from "@/components/public/feedback-form";
import { Icon } from "@/components/icon";

export const revalidate = 300;

export default function FeedbackPage() {
  return (
    <main className="overflow-x-clip bg-[#030B1C] text-white">
      <PublicHeader />

      <section className="relative isolate overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),rgba(3,11,28,1))]" />
        <div className="absolute top-0 left-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#FFD24A]/10 blur-[120px]" />

        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A]">
              <Icon name="reviews" className="text-sm" /> Feedback
            </div>
            <Link href="/testimonials" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
              <Icon name="preview" className="text-sm" /> View approved feedback
            </Link>
          </div>

          <div className="mb-12 max-w-3xl">
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Share your experience as a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD24A] to-[#FFA03A]">student or client</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#91A3C7]">
              Send your story, choose a category, and our admin team will review it before publishing. Approved feedback appears publicly as a testimonial.
            </p>
          </div>

          <FeedbackForm />
        </div>
      </section>
    </main>
  );
}
