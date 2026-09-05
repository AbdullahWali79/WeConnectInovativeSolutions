import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-access";
import { SubmissionFormShare } from "@/components/prompts/submission-form-share";
import { PROMPT_SUBMISSION_GOOGLE_URL } from "@/lib/prompt-submission-form";

export default async function AdminPromptFormPage() {
  await requireAdminPage("/admin/forms/prompts");
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Prompt submission form</h1><p className="mt-2 text-on-surface-variant">Share the WeConnect submission page with your students.</p></header>
    <section className="space-y-5 rounded-2xl border border-outline-variant bg-surface p-6">
      <h2 className="text-xl font-bold">Student link</h2>
      <SubmissionFormShare />
    </section>
    <section className="space-y-4 rounded-2xl border border-outline-variant bg-surface p-6">
      <h2 className="text-xl font-bold">Review and publish responses</h2>
      <p className="text-on-surface-variant">Responses are saved in your existing Google Form. Download the response sheet as Excel, then import it in Prompt library to preview images, edit details and publish.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/prompts" className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary">Open prompt library</Link>
        {PROMPT_SUBMISSION_GOOGLE_URL && <a href={PROMPT_SUBMISSION_GOOGLE_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-outline-variant px-5 py-3 font-semibold">Open Google Form</a>}
      </div>
    </section>
  </div>;
}
