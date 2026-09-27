import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StudentDashboard } from "@/components/student/student-dashboard";

export default async function StudentPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: student } = await supabase.from("students").select("course_id").eq("id", user.id).maybeSingle();
    if (student?.course_id === "501c4f6d-c3db-4ca4-985e-518d5fb6ff29") {
      redirect("/student/talent-portfolio");
    }
  }

  return <StudentDashboard />;
}
