import { CmsElement } from "@/components/cms/cms-element";
import { Icon } from "@/components/icon";
import { EmptyState } from "@/components/empty-state";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CourseBrowser } from "@/components/public/course-browser";
import { FadeIn } from "@/components/public/animations";
import { PublicHeader } from "@/components/public/public-header";
import type { Course, CourseCategory } from "@/lib/supabase/types";

export const revalidate = 300;

export default async function CoursesPage() {
  const supabase = createSupabasePublicClient();

  const [{ data: courseRows }, { data: categoryRows }] = await Promise.all([
    supabase.from("courses").select("*").eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("course_categories").select("*").order("created_at", { ascending: true }),
  ]);

  const courses = (courseRows ?? []) as Course[];
  const categories = (categoryRows ?? []) as CourseCategory[];

  return (
    <CmsElement cmsId="f8d6ea75-0" as="main" className="bg-background text-on-background">
      <PublicHeader />

      <CmsElement cmsId="f8d6ea75-1" as="section" className="relative overflow-hidden bg-[var(--wc-bg)] py-16 md:py-24">
        {/* Background glow effects */}
        <CmsElement cmsId="f8d6ea75-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></CmsElement>

        <CmsElement cmsId="f8d6ea75-3" as="div" className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page text-center md:text-left">
          <FadeIn>
            <CmsElement cmsId="f8d6ea75-4" as="div" className="max-w-3xl">
              <CmsElement cmsId="f8d6ea75-5" as="div" className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-6">
                <Icon name="school" className="text-sm" /> Course Library
              </CmsElement>
              <CmsElement cmsId="f8d6ea75-6" as="h1" className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-on-surface">All Courses</CmsElement>
              <CmsElement cmsId="f8d6ea75-7" as="p" className="mt-6 text-lg leading-relaxed text-[var(--wc-on-surface-variant)]">
                Browse all active courses, filter by the details that matter, and choose the pathway that matches your goals.
              </CmsElement>
            </CmsElement>
          </FadeIn>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="f8d6ea75-8" as="section" className="relative bg-[var(--wc-bg)] py-12 md:py-16">
        <CmsElement cmsId="f8d6ea75-9" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page">
          {courses.length > 0 ? (
            <CourseBrowser courses={courses} categories={categories} />
          ) : (
            <EmptyState
              title="No active courses yet"
              description="Run the seed file or create active courses in the admin dashboard to populate this page."
              icon="school"
            />
          )}
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
