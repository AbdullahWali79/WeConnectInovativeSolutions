import { PublicHeader } from "@/components/public/public-header";
import { TraineesBoard } from "@/components/public/trainees-board";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Course, Enrollment, ManualEnrollment, Profile, StudentFeeRecord, StudentProject, Submission, Task, Trainee } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function TraineesPage() {
  const supabase = createSupabaseServiceClient();

  const [traineeResult, courseResult, feeResult, studentResult] = await Promise.all([
    supabase.from("trainees").select("*").order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("title"),
    supabase.from("student_fee_records").select("*").order("month_key", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
  ]);

  const [taskResult, submissionResult, manualResult, projectResult] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
    supabase.from("manual_enrollments").select("*"),
    supabase.from("student_projects").select("*").eq("status", "approved").order("reviewed_at", { ascending: false }),
  ]);

  const enrollmentResult = await supabase.from("enrollments").select("*").order("created_at", { ascending: false });

  const trainees = (traineeResult.data ?? []) as Trainee[];
  const courses = (courseResult.data ?? []) as Course[];
  const feeRecords = (feeResult.data ?? []) as StudentFeeRecord[];
  const students = (studentResult.data ?? []) as Profile[];
  const tasks = (taskResult.data ?? []) as Task[];
  const submissions = (submissionResult.data ?? []) as Submission[];
  const manualEnrollments = (manualResult.data ?? []) as ManualEnrollment[];
  const projects = (projectResult.data ?? []) as StudentProject[];
  const enrollments = (enrollmentResult.data ?? []) as Enrollment[];

  return (
    <main className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />
      <TraineesBoard
        initialTrainees={trainees}
        initialCourses={courses}
        initialFeeRecords={feeRecords}
        initialStudents={students}
        initialTasks={tasks}
        initialSubmissions={submissions}
        initialEnrollments={enrollments}
        initialManualEnrollments={manualEnrollments}
        initialProjects={projects}
      />
    </main>
  );
}
