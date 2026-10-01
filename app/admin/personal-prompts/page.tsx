import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { PersonalPrompts } from "@/components/admin/personal-prompts/personal-prompts";

export default async function PersonalPromptsPage() {
  const access = await requirePermissionPage("/admin/personal-prompts", "dashboard.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="You do not have permission to access Personal Prompts." />;
  }

  return <PersonalPrompts />;
}
