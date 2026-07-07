import { AccessDenied } from "@/components/admin/access-denied";
import { TasksManager } from "@/components/admin/tasks-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function TasksPage() {
  const access = await requirePermissionPage("/admin/tasks", "tasks.view");

  if (!access.granted) {
    return <AccessDenied description="Task access has not been enabled for this teacher account." />;
  }

  return <TasksManager currentRole={access.profile.role} permissions={access.permissions} />;
}
