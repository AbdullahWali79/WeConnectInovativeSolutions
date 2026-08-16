import { requireAdminPage } from "@/lib/admin-access";
import { SimpleCertificatesManager } from "@/components/admin/simple-certificates-manager";

export const metadata = { title: "Simple Certificates – Admin | WeConnect" };

export default async function SimpleCertificatesPage() {
  await requireAdminPage("/admin/simple-certificates");
  return <SimpleCertificatesManager />;
}
