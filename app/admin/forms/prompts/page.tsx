import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-access";
import { SubmissionFormShare } from "@/components/prompts/submission-form-share";
import { PROMPT_SUBMISSION_GOOGLE_URL } from "@/lib/prompt-submission-form";

export default async function AdminPromptFormPage() {
  await requireAdminPage("/admin/forms/prompts");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Prompt submission form</h1>
        <p className="mt-2 text-on-surface-variant">
          Share the WeConnect submission page with your students and manage live submissions.
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-outline-variant bg-surface p-6">
        <h2 className="text-xl font-bold">Student link</h2>
        <SubmissionFormShare />
      </section>

      <section className="space-y-4 rounded-2xl border border-outline-variant bg-surface p-6">
        <h2 className="text-xl font-bold">Review and publish responses</h2>
        <p className="text-on-surface-variant leading-relaxed">
          Student prompt submissions are now saved directly in your database in <strong>Pending</strong> status with submitter Name, Phone/WhatsApp number, and direct image uploads. You can review submissions and publish them with a single click in the Prompt Library.
        </p>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-on-surface-variant space-y-1">
          <p className="font-semibold text-primary">✨ Automated Contributor Tracking:</p>
          <p>
            When students submit prompts using their phone number, their name is auto-recognized without creating duplicate accounts, allowing them to share multiple prompts seamlessly.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/admin/prompts"
            className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary shadow-sm hover:opacity-95 transition"
          >
            Open prompt library &amp; Review
          </Link>
          {PROMPT_SUBMISSION_GOOGLE_URL && (
            <a
              href={PROMPT_SUBMISSION_GOOGLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-outline-variant px-5 py-3 font-semibold text-on-surface-variant hover:bg-surface transition"
            >
              Open Google Form (Legacy)
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
