import { StudentProjectsManager } from "@/components/admin/student-projects-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  await requireAdminPage("/admin/projects");
  const { studentId } = await searchParams;
  return <StudentProjectsManager initialStudentId={studentId} />;
}
