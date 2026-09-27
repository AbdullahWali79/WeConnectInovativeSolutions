import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StudentDashboard } from "@/components/student/student-dashboard";

export default async function StudentPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: enrollment } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("course_id", "501c4f6d-c3db-4ca4-985e-518d5fb6ff29").maybeSingle();
    if (enrollment) {
      redirect("/student/talent-portfolio");
    }
  }

  return <StudentDashboard />;
}
