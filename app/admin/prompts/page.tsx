import { requireAdminPage } from "@/lib/admin-access";
import { contributorColumns, promptDb } from "@/lib/prompts-server";
import { PromptAdmin } from "@/components/prompts/forms";
import type { Contributor, Prompt } from "@/lib/prompts";
export default async function AdminPromptsPage() {
  await requireAdminPage("/admin/prompts");
  const db = promptDb();
  const [contributors, prompts] = await Promise.all([db.from("prompt_contributors").select(contributorColumns).order("created_at", { ascending: false }), db.from("prompt_library").select("*").order("created_at", { ascending: false })]);
  if (contributors.error || prompts.error) return <div role="alert" className="rounded-2xl border p-6">Prompt tables are unavailable. Apply the prompt-library database migration and retry.</div>;
  return <PromptAdmin contributors={contributors.data as Contributor[]} prompts={prompts.data as Prompt[]} />;
}
