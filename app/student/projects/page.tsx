import { StudentProjectsBoard } from "@/components/student/projects-board";
import { GoogleFormProjectSubmission } from "@/components/student/google-form-project-submission";
import { getGoogleFormProjectSettings } from "@/lib/google-form-settings";
import { getProjectSubmissionSettings } from "@/lib/project-submission-settings";

export default async function StudentProjectsPage() {
  const [form, submission] = await Promise.all([
    getGoogleFormProjectSettings().catch(() => null),
    getProjectSubmissionSettings().catch(() => null),
  ]);
  if (!submission?.shared_folder_enabled && form?.enabled && form.form_url) {
    return <GoogleFormProjectSubmission title={form.title} instructions={form.instructions} formUrl={form.form_url} />;
  }
  return <StudentProjectsBoard />;
}
