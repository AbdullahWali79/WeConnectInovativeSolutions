import { AccessDenied } from "@/components/admin/access-denied";
import { ProgressManager } from "@/components/admin/progress-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function ProgressPage() {
  const access = await requirePermissionPage("/admin/progress", "progress.view");

  if (!access.granted) {
    return <AccessDenied description="Progress report access has not been enabled for this teacher account." />;
  }

  return <ProgressManager currentRole={access.profile.role} permissions={access.permissions} />;
}
