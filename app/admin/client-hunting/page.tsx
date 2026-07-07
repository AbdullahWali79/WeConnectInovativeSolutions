import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { ClientHuntingTargetTable } from "@/components/admin/client-hunting-target-table";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function AdminClientHuntingPage() {
  const access = await requirePermissionPage("/admin/client-hunting", "client_hunting.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="Client hunting access has not been enabled for this teacher account." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lead Intelligence"
        title="Client hunting ranges"
        description="Set the overall client hunting range for all approved students or adjust each student individually."
        action={
          <Link href="/admin/client-hunting/details" className="wc-primary-btn text-sm">
            <Icon name="open_in_new" />
            Open full workflow
          </Link>
        }
      />

      <ClientHuntingTargetTable />
    </div>
  );
}
