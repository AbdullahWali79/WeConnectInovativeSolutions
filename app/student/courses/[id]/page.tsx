import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CourseViewer } from "@/components/student/course-viewer";

export default async function StudentCoursePage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check enrollment (basic check)
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (profile?.status !== "approved") {
    redirect("/student");
  }

  return <CourseViewer courseId={params.id} />;
}
