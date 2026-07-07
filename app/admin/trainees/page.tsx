import { AccessDenied } from "@/components/admin/access-denied";
import { TraineesManager } from "@/components/admin/trainees-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function AdminTraineesPage() {
  const access = await requirePermissionPage("/admin/trainees", "trainees.view");

  if (!access.granted) {
    return <AccessDenied description="Trainee access has not been enabled for this teacher account." />;
  }

  return <TraineesManager currentRole={access.profile.role} permissions={access.permissions} />;
}
