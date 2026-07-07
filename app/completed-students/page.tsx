import { Icon } from "@/components/icon";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { FadeIn } from "@/components/public/animations";
import { PublicHeader } from "@/components/public/public-header";
import { CompletedStudentsList } from "@/components/public/completed-students-list";
import type { CompletedStudentShowcase, Course, ManualEnrollment, Trainee } from "@/lib/supabase/types";

export const revalidate = 300;

export default async function CompletedStudentsPage() {
  const supabase = createSupabasePublicClient();

  const [{ data: completedStudents }, { data: manualEnrollments }, { data: completedTrainees }, { data: courses }] = await Promise.all([
    supabase
      .from("completed_student_showcase")
      .select("*")
      .order("completed_at", { ascending: false }),
    supabase
      .from("manual_enrollments")
      .select("*")
      .eq("show_on_completed_page", true)
      .order("completion_date", { ascending: false }),
    supabase
      .from("trainees")
      .select("*")
      .eq("status", "completed")
      .order("updated_at", { ascending: false }),
    supabase
      .from("courses")
      .select("*"),
  ]);

  const courseById = new Map(((courses as Course[]) ?? []).map((course) => [course.id, course]));

  function buildDedupKey(input: { student_email?: string | null; student_name?: string | null; course_name?: string | null }) {
    const identity = (input.student_email ?? input.student_name ?? "").trim().toLowerCase();
    const course = (input.course_name ?? "").trim().toLowerCase();
    return `${identity}::${course}`;
  }

  // Convert manual enrollments to the CompletedStudentShowcase shape
  const manualAsShowcase: (CompletedStudentShowcase & { student_email?: string | null })[] = ((manualEnrollments as ManualEnrollment[]) ?? []).map((m) => ({
    id: m.id,
    student_id: m.id,
    course_id: m.id,
    student_name: m.full_name,
    student_email: m.email,
    course_name: m.course_name,
    final_score: m.total_marks,
    progress_percentage: 100,
    completed_at: m.completion_date ?? m.created_at,
    // extra fields for linking to certificate
    certificate_url: `/certificate/${m.id}`,
    is_manual: true,
    source_type: "manual_record",
  } as CompletedStudentShowcase & { certificate_url: string; is_manual: boolean }));

  const traineesAsShowcase: (CompletedStudentShowcase & { student_email?: string | null })[] = ((completedTrainees as Trainee[]) ?? []).map((trainee) => ({
    id: `trainee-${trainee.id}`,
    student_id: trainee.id,
    course_id: trainee.course_id ?? trainee.id,
    student_name: trainee.name,
    student_email: trainee.email ?? null,
    course_name: trainee.course_id ? (courseById.get(trainee.course_id)?.title ?? "Course") : "Not assigned",
    final_score: trainee.progress_percentage,
    progress_percentage: trainee.progress_percentage,
    completed_at: trainee.updated_at ?? trainee.created_at,
    source_type: "completed_trainee",
  } as CompletedStudentShowcase & { source_type: string }));

  const certifiedAsShowcase = ((completedStudents ?? []) as (CompletedStudentShowcase & { source_type?: string; student_email?: string | null })[]).map((student) => ({
    ...student,
    student_email: (student as CompletedStudentShowcase & { student_email?: string | null }).student_email ?? null,
    source_type: "certificate_record",
  }));

  const seen = new Set<string>();
  const students = [...certifiedAsShowcase, ...manualAsShowcase, ...traineesAsShowcase]
    .filter((student) => {
      const key = buildDedupKey(student);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
    const aDate = new Date(a.completed_at ?? 0).getTime();
    const bDate = new Date(b.completed_at ?? 0).getTime();
    return bDate - aDate;
    });

  return (
    <main className="bg-background text-on-background">
      <PublicHeader />

      {/* Page Header */}
      <section className="relative bg-[linear-gradient(180deg,var(--wc-surface-lowest)_0%,var(--wc-surface)_100%)] py-16">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <div className="max-w-3xl">
              <div className="wc-section-label mb-4">
                <Icon name="workspace_premium" className="text-sm" /> Student Achievements
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">Completed Students</h1>
              <p className="text-lg text-on-surface-variant">
                Verify completed trainees by student name or course. This public record shows each graduate&apos;s course,
                progress, final score, and completion date.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Students Section */}
      <section className="relative bg-[linear-gradient(180deg,var(--wc-surface-low)_0%,var(--wc-surface)_100%)] py-xxl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,color-mix(in_srgb,var(--wc-primary)_8%,transparent),transparent_50%)]" />
        <div className="relative mx-auto max-w-container-max px-5 md:px-margin-page">
          <CompletedStudentsList students={students} />
        </div>
      </section>
    </main>
  );
}
