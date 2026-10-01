import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { AccountsManager } from "@/components/admin/accounts-manager/accounts-manager";

export default async function AccountsManagerPage() {
  const access = await requirePermissionPage("/admin/accounts-manager", "dashboard.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="You do not have permission to access Accounts Manager." />;
  }

  return <AccountsManager />;
}
