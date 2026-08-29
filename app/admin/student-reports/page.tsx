import { AccessDenied } from "@/components/admin/access-denied";
import { StudentReportsManager } from "@/components/admin/student-reports-manager";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/lib/supabase/types";

export default async function StudentReportsPage() {
  const access = await requirePermissionPage("/admin/student-reports", "students.view");
  if (!access.granted) {
    return <AccessDenied description="Student report access has not been enabled for this teacher account." />;
  }

  const { data, error } = await createSupabaseServiceClient()
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .eq("status", "approved")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return <StudentReportsManager students={(data ?? []) as Profile[]} />;
}
