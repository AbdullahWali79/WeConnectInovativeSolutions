import { requireAdminPage } from "@/lib/admin-access";
import { StudentActivityReport } from "@/components/admin/student-activity-report";

export default async function StudentActivityPage() {
  await requireAdminPage("/admin/student-activity");
  return <StudentActivityReport />;
}
