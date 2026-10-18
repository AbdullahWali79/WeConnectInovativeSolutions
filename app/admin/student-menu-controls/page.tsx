import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { StudentMenuControls } from "@/components/admin/student-menu-controls";

export default async function StudentMenuControlsPage() {
  const access = await requirePermissionPage("/admin/student-menu-controls", "students.view");
  if (!access.granted) return <AccessDenied description="Student menu access has not been enabled for this account." />;
  return <StudentMenuControls />;
}
