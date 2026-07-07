import { InternshipLetterGenerator } from "@/components/admin/internship-letter-generator";
import { requireAdminPage } from "@/lib/admin-access";

export default async function InternshipLettersPage() {
  await requireAdminPage("/admin/internship-letters");
  return <InternshipLetterGenerator />;
}
