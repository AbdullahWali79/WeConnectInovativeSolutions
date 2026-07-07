import { FeeManagement } from "@/components/admin/fee-management";
import { requireAdminPage } from "@/lib/admin-access";

export default async function FeesPage() {
  await requireAdminPage("/admin/fees");
  return <FeeManagement />;
}
