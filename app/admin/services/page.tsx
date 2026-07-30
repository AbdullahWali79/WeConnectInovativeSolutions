import { ServicesManager } from "@/components/admin/services-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function AdminServicesPage() {
  await requireAdminPage("/admin/services");
  return <ServicesManager />;
}
