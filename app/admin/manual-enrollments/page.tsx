import { ManualEnrollmentManager } from "@/components/admin/manual-enrollment-manager";

export const metadata = {
  title: "Manual Enrollments – Admin | WeConnect",
  description: "Manage manually enrolled students who studied offline.",
};

export default function ManualEnrollmentsPage() {
  return <ManualEnrollmentManager />;
}
