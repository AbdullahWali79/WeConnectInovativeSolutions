import { AccessDenied } from "@/components/admin/access-denied";
import { CoursesManager } from "@/components/admin/courses-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function CoursesPage() {
  const access = await requirePermissionPage("/admin/courses", "courses.view");

  if (!access.granted) {
    return <AccessDenied description="Course access has not been enabled for this teacher account." />;
  }

  return <CoursesManager currentRole={access.profile.role} permissions={access.permissions} />;
}
