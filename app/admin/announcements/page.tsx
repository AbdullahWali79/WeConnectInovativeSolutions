import { AccessDenied } from "@/components/admin/access-denied";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function AnnouncementsPage() {
  const access = await requirePermissionPage("/admin/announcements", "announcements.view");

  if (!access.granted) {
    return <AccessDenied description="Announcement access has not been enabled for this teacher account." />;
  }

  return <AnnouncementsManager currentRole={access.profile.role} permissions={access.permissions} />;
}
