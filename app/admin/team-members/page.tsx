import { AccessDenied } from "@/components/admin/access-denied";
import { TeamMembersManager } from "@/components/admin/team-members-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function TeamMembersPage() {
  const access = await requirePermissionPage("/admin/team-members", "team_members.view");

  if (!access.granted) {
    return <AccessDenied description="Team member access has not been enabled for this teacher account." />;
  }

  return <TeamMembersManager currentRole={access.profile.role} permissions={access.permissions} />;
}
