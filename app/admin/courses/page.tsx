import { AccessDenied } from "@/components/admin/access-denied";
import { CoursesManager } from "@/components/admin/courses-manager";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { loadTeacherCourseScope, filterCoursesByScope } from "@/lib/admin-course-scope";
import type { Course, CourseCategory } from "@/lib/supabase/types";

export default async function CoursesPage() {
  const access = await requirePermissionPage("/admin/courses", "courses.view");

  if (!access.granted) {
    return <AccessDenied description="Course access has not been enabled for this teacher account." />;
  }

  const supabase = createSupabaseServiceClient();
  
  let scope = null;
  try {
    scope = await loadTeacherCourseScope(supabase as never, access.profile.role);
  } catch {
    scope = [];
  }

  const [categoryResult, courseResult] = await Promise.all([
    supabase.from("course_categories").select("*").order("created_at", { ascending: true }),
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
  ]);

  const categories = (categoryResult.data ?? []) as CourseCategory[];
  const rawCourses = (courseResult.data ?? []) as Course[];
  const courses = filterCoursesByScope(rawCourses, scope);

  return (
    <CoursesManager 
      currentRole={access.profile.role} 
      permissions={access.permissions} 
      initialCategories={categories}
      initialCourses={courses}
    />
  );
}
