import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public/public-header";
import { ApplicationForm } from "@/components/public/application-form";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

export const revalidate = 300;

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ course?: string }>;
}) {
  const supabase = createSupabasePublicClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "active")
    .order("title", { ascending: true });

  const activeCourses = courses ?? [];
  const selectedCourseId = (await searchParams)?.course;

  return (
    <main className="min-h-screen bg-[var(--wc-bg)] pt-20 text-on-surface md:pt-24">
      <PublicHeader />

      <section className="relative overflow-hidden bg-[var(--wc-bg)] py-8 sm:py-12 md:py-24">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page text-center md:text-left">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-6">
              <Icon name="send" className="text-sm" /> Apply Now
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight text-on-surface">Submit your student application</h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--wc-on-surface-variant)] max-w-2xl">
              Choose a course, fill out your details, and set a password. Our team will review your application. Need help? Email{" "}
              <a href={CONTACT_EMAIL_HREF} className="break-words [overflow-wrap:anywhere] text-on-surface underline underline-offset-4">{CONTACT_EMAIL}</a>.
            </p>
            <a href="#application-form" className="mt-4 inline-flex max-w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-500">
              <Icon name="edit_note" className="text-xl" /> Fill Application Form
            </a>
          </div>
        </div>
      </section>

      <section id="application-form" className="relative scroll-mt-24 bg-[var(--wc-bg)] pb-12 md:pb-24">
        <div className="mx-auto max-w-3xl px-3 sm:px-5 md:px-margin-page">
          <div className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4 sm:rounded-3xl sm:p-6 sm:shadow-lg md:p-10">
            {activeCourses.length === 0 ? (
              <div className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-6 text-sm text-[var(--wc-on-surface-variant)]">
                No active courses are available right now. Please contact the team before applying.
              </div>
            ) : (
              <ApplicationForm courses={activeCourses} selectedCourseId={selectedCourseId} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
