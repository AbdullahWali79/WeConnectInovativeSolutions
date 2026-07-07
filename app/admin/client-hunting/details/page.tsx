import { AccessDenied } from "@/components/admin/access-denied";
import { ClientHuntingManager } from "@/components/admin/client-hunting-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function AdminClientHuntingDetailsPage() {
  const access = await requirePermissionPage("/admin/client-hunting/details", "client_hunting.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="Client hunting access has not been enabled for this teacher account." />;
  }

  return <ClientHuntingManager currentRole={access.profile.role} permissions={access.permissions} showSidebarPanels={false} />;
}
