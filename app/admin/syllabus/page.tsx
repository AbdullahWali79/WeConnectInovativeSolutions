import { AccessDenied } from "@/components/admin/access-denied";
import { SyllabusManager } from "@/components/admin/syllabus-manager";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Course, CourseTopic, Enrollment, Profile, Task } from "@/lib/supabase/types";

const ADVANCE_WEB_DEVELOPMENT = "Advance Web Development";

export default async function AdminSyllabusPage() {
  const access = await requirePermissionPage("/admin/syllabus", "courses.view");

  if (!access.granted) {
    return <AccessDenied description="Syllabus access has not been enabled for this teacher account." />;
  }

  const supabase = createSupabaseServiceClient();
  const { data: courseData } = await supabase
    .from("courses")
    .select("*")
    .ilike("title", ADVANCE_WEB_DEVELOPMENT)
    .maybeSingle();

  const course = (courseData ?? null) as Course | null;
  let topics: CourseTopic[] = [];
  let students: Profile[] = [];
  let tasks: Task[] = [];

  if (course) {
    const [topicsResult, enrollmentsResult, tasksResult] = await Promise.all([
      supabase.from("course_topics").select("*").eq("course_id", course.id).order("day_number"),
      supabase.from("enrollments").select("*").eq("course_id", course.id).eq("status", "active"),
      supabase.from("tasks").select("*").eq("course_id", course.id),
    ]);

    topics = (topicsResult.data ?? []) as CourseTopic[];
    tasks = (tasksResult.data ?? []) as Task[];
    const enrollments = (enrollmentsResult.data ?? []) as Enrollment[];
    const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.student_id))];

    if (studentIds.length > 0) {
      const { data: studentData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", studentIds)
        .eq("role", "student")
        .eq("status", "approved")
        .order("full_name");

      students = ((studentData ?? []) as Profile[]).filter(
        (student) => !student.admin_status || student.admin_status === "active" || student.admin_status === "approved",
      );
    }
  }

  return (
    <SyllabusManager
      course={course}
      topics={topics}
      students={students}
      existingTasks={tasks}
      canAssign={access.permissions.includes("tasks.create")}
    />
  );
}
