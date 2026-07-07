import Link from "next/link";
import { Icon } from "@/components/icon";
import { ManualEnrollmentDetail } from "@/components/admin/manual-enrollment-detail";

export const metadata = {
  title: "Student Detail – Admin | WeConnect",
};

export default async function ManualEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/manual-enrollments"
          className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-primary transition"
        >
          <Icon name="arrow_back" className="text-base" />
          Back to Manual Enrollments
        </Link>
      </div>
      <ManualEnrollmentDetail enrollmentId={id} />
    </div>
  );
}
