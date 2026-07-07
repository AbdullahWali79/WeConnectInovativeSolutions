import { CompletionManager } from "@/components/admin/completion-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function CompletionsPage() {
  await requireAdminPage("/admin/completions");
  return <CompletionManager />;
}
