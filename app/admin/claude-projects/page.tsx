import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { ClaudeProjectsManager } from "@/components/admin/claude-projects/claude-projects-manager";

export const metadata = {
  title: "Claude Projects Manager | WeConnect Admin",
  description: "Save, manage, tag, and filter your Claude AI projects, custom instructions, and knowledge context.",
};

export default async function ClaudeProjectsPage() {
  const access = await requirePermissionPage("/admin/claude-projects", "dashboard.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="You do not have permission to access Claude Projects Manager." />;
  }

  return <ClaudeProjectsManager />;
}
