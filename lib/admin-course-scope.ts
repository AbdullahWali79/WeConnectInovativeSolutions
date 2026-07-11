import type { Course, Enrollment } from "@/lib/supabase/types";

type SupabaseLike = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error?: { message: string } | null }> };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
    };
  };
};

export type CourseScope = string[] | null;

export async function loadTeacherCourseScope(supabase: SupabaseLike, currentRole: string | undefined): Promise<CourseScope> {
  if (currentRole !== "teacher") return null;

  const { data: userData } = await supabase.auth.getUser();
  const teacherId = userData.user?.id;
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from("teacher_course_assignments")
    .select("course_id")
    .eq("teacher_id", teacherId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.course_id)).filter(Boolean);
}

export function courseInScope(courseId: string | null | undefined, scope: CourseScope) {
  return scope === null || (Boolean(courseId) && scope.includes(courseId));
}

export function filterCoursesByScope(courses: Course[], scope: CourseScope) {
  return scope === null ? courses : courses.filter((course) => scope.includes(course.id));
}

export function filterEnrollmentsByScope(enrollments: Enrollment[], scope: CourseScope) {
  return scope === null ? enrollments : enrollments.filter((enrollment) => scope.includes(enrollment.course_id));
}
