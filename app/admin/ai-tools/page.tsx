import { requireAdminPage } from "@/lib/admin-access";
import { AIToolsManager } from "@/components/admin/ai-tools-manager";
export default async function AdminAIToolsPage(){await requireAdminPage("/admin/ai-tools");return <AIToolsManager/>;}

