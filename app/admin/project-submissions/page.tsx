import { redirect } from "next/navigation";
import { ProjectSubmissionSettingsPanel } from "@/components/admin/project-submission-settings";
import { getCurrentUserProfile } from "@/lib/admin-access";

export default async function ProjectSubmissionsPage() {
  const profile = await getCurrentUserProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin/project-submissions");
  if (profile.role !== "admin" || profile.status !== "approved") redirect("/admin");
  return <ProjectSubmissionSettingsPanel />;
}
