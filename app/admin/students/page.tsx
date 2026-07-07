import { AccessDenied } from "@/components/admin/access-denied";
import { StudentsManager } from "@/components/admin/students-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function StudentsPage() {
  const access = await requirePermissionPage("/admin/students", "students.view");

  if (!access.granted) {
    return <AccessDenied description="Student access has not been enabled for this teacher account." />;
  }

  return <StudentsManager currentRole={access.profile.role} permissions={access.permissions} />;
}
