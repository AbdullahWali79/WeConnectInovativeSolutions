import { AccessDenied } from "@/components/admin/access-denied";
import { SubmissionsReview } from "@/components/admin/submissions-review";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const access = await requirePermissionPage("/admin/submissions", "submissions.view");

  if (!access.granted) {
    return <AccessDenied description="Submission review access has not been enabled for this teacher account." />;
  }

  const { studentId } = await searchParams;
  return <SubmissionsReview currentRole={access.profile.role} permissions={access.permissions} initialStudentId={studentId} />;
}
