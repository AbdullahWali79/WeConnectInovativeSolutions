import { AccessDenied } from "@/components/admin/access-denied";
import { TeamMembersManager } from "@/components/admin/team-members-manager";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/lib/supabase/types";

export default async function TeamMembersPage() {
  const access = await requirePermissionPage("/admin/team-members", "team_members.view");

  if (!access.granted) {
    return <AccessDenied description="Team member access has not been enabled for this teacher account." />;
  }

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .eq("status", "approved")
    .order("full_name");

  const students = ((data ?? []) as Profile[]).filter(
    (student) => !student.admin_status || student.admin_status === "active" || student.admin_status === "approved",
  );

  return <TeamMembersManager currentRole={access.profile.role} permissions={access.permissions} students={students} />;
}
