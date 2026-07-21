import { StudentProjectsManager } from "@/components/admin/student-projects-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function AdminProjectsPage() {
  await requireAdminPage("/admin/projects");
  return <StudentProjectsManager />;
}