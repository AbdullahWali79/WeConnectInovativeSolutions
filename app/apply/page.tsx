import { CmsElement } from "@/components/cms/cms-element";
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
    <CmsElement cmsId="a1383af3-0" as="main" className="min-h-screen bg-[var(--wc-bg)] pt-24 sm:pt-28 md:pt-32 text-on-surface">
      <PublicHeader />

      <CmsElement cmsId="a1383af3-1" as="section" className="relative overflow-hidden bg-[var(--wc-bg)] py-3 sm:py-5 md:py-6">
        <CmsElement cmsId="a1383af3-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.35),transparent)] pointer-events-none" />
        <CmsElement cmsId="a1383af3-3" as="div" className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <CmsElement cmsId="a1383af3-4" as="div" className="max-w-xl mx-auto">
            <CmsElement cmsId="a1383af3-5" as="div" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--wc-secondary)] mb-2.5">
              <Icon name="send" className="text-xs" /> Apply Now
            </CmsElement>
            <CmsElement cmsId="a1383af3-6" as="h1" className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
              Apply as a Student or Freelancer
            </CmsElement>
            <CmsElement cmsId="a1383af3-7" as="p" className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--wc-on-surface-variant)]">
              Choose Student to enroll in a course, or Freelancer to offer your services. Complete your details below to get started. Need help? Email{" "}
              <CmsElement cmsId="a1383af3-8" as="a" href={CONTACT_EMAIL_HREF} className="break-words [overflow-wrap:anywhere] text-on-surface underline underline-offset-2 hover:text-[var(--wc-secondary)]">
                {CONTACT_EMAIL}
              </CmsElement>.
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="a1383af3-10" as="section" id="application-form" className="relative pb-12 sm:pb-16 md:pb-20">
        <CmsElement cmsId="a1383af3-11" as="div" className="mx-auto max-w-2xl px-4 sm:px-6">
          <CmsElement cmsId="a1383af3-12" as="div" className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-4 sm:p-6 md:p-8 shadow-xl">
            {activeCourses.length === 0 ? (
              <CmsElement cmsId="a1383af3-13" as="div" className="rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-5 text-sm text-[var(--wc-on-surface-variant)]">
                No active courses are available right now. Please contact the team before applying.
              </CmsElement>
            ) : (
              <ApplicationForm courses={activeCourses} selectedCourseId={selectedCourseId} />
            )}
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
