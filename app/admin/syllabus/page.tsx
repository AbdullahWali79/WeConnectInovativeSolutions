import { AccessDenied } from "@/components/admin/access-denied";
import { SyllabusCatalog, type SyllabusBundle } from "@/components/admin/syllabus-catalog";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Course, CourseTopic, Enrollment, Profile, Task } from "@/lib/supabase/types";

export default async function AdminSyllabusPage() {
  const access = await requirePermissionPage("/admin/syllabus", "courses.view");

  if (!access.granted) {
    return <AccessDenied description="Syllabus access has not been enabled for this teacher account." />;
  }

  const supabase = createSupabaseServiceClient();
  const { data: topicsData } = await supabase.from("course_topics").select("*").order("day_number");
  const topics = (topicsData ?? []) as CourseTopic[];
  const courseIds = [...new Set(topics.map((topic) => topic.course_id))];
  let bundles: SyllabusBundle[] = [];

  if (courseIds.length > 0) {
    const [coursesResult, enrollmentsResult, tasksResult] = await Promise.all([
      supabase.from("courses").select("*").in("id", courseIds).eq("status", "active").order("title"),
      supabase.from("enrollments").select("*").in("course_id", courseIds).eq("status", "active"),
      supabase.from("tasks").select("*").in("course_id", courseIds),
    ]);

    const courses = (coursesResult.data ?? []) as Course[];
    const enrollments = (enrollmentsResult.data ?? []) as Enrollment[];
    const tasks = (tasksResult.data ?? []) as Task[];
    const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.student_id))];
    let students: Profile[] = [];

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

    bundles = courses.map((course) => {
      const enrolledStudentIds = new Set(
        enrollments.filter((enrollment) => enrollment.course_id === course.id).map((enrollment) => enrollment.student_id),
      );

      return {
        course,
        topics: topics.filter((topic) => topic.course_id === course.id),
        students: students.filter((student) => enrolledStudentIds.has(student.id)),
        existingTasks: tasks.filter((task) => task.course_id === course.id),
      };
    });
  }

  return (
    <SyllabusCatalog
      bundles={bundles}
      canAssign={access.permissions.includes("tasks.create")}
      canEdit={access.permissions.includes("courses.edit")}
    />
  );
}
