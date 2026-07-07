import { AccessDenied } from "@/components/admin/access-denied";
import { PromotionalPopupManager } from "@/components/admin/promotional-popup-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function PromotionalPopupsPage() {
  const access = await requirePermissionPage("/admin/promotional-popups", "promotional_popups.view");

  if (!access.granted) {
    return <AccessDenied description="Promotional popup access has not been enabled for this teacher account." />;
  }

  return <PromotionalPopupManager currentRole={access.profile.role} permissions={access.permissions} />;
}
