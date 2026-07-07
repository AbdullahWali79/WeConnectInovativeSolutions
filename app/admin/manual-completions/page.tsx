import { ManualCompletionManager } from "@/components/admin/manual-completion-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function ManualCompletionsPage() {
  await requireAdminPage("/admin/manual-completions");
  return <ManualCompletionManager />;
}
