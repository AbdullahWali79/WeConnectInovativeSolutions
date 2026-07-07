import { AccessDenied } from "@/components/admin/access-denied";
import { SubmissionsReview } from "@/components/admin/submissions-review";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function SubmissionsPage() {
  const access = await requirePermissionPage("/admin/submissions", "submissions.view");

  if (!access.granted) {
    return <AccessDenied description="Submission review access has not been enabled for this teacher account." />;
  }

  return <SubmissionsReview currentRole={access.profile.role} permissions={access.permissions} />;
}
