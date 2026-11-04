import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { Vault } from "@/components/admin/vault/vault";

export default async function VaultPage() {
  const access = await requirePermissionPage("/admin/vault", "dashboard.view");

  // Vault is admin-only: it's the admin's personal secure storage.
  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="You do not have permission to access the Vault." />;
  }

  return <Vault />;
}
