import { redirect } from "next/navigation";
import { StudentAssignedProjectsBoard } from "@/components/student/assigned-projects-board";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function StudentAssignedProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  return <StudentAssignedProjectsBoard studentId={user.id} />;
}
