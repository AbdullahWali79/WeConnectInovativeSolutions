import { SubadminsManager } from "@/components/admin/subadmins-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function SubadminsPage() {
  await requireAdminPage("/admin/subadmins");
  return <SubadminsManager />;
}
