import { requireAdminPage } from "@/lib/admin-access";
import { CourseContentManager } from "@/components/admin/course-content-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function AdminCourseContentPage({ params }: { params: { id: string } }) {
  await requireAdminPage(`/admin/courses/${params.id}/content`);
  
  const supabase = await createSupabaseServerClient();
  const { data: course } = await supabase.from("courses").select("*").eq("id", params.id).single();

  if (!course) {
    notFound();
  }

  return <CourseContentManager courseId={course.id} courseTitle={course.title} />;
}
