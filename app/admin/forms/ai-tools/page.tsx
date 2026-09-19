import { requireAdminPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PublicAIToolFormsManager } from "@/components/admin/public-ai-tool-forms-manager";
import type { PublicAIToolForm, PublicAIToolCategory, PublicAIToolSubmission } from "@/lib/supabase/types";

export default async function AdminPublicAIToolFormsPage() {
  await requireAdminPage("/admin/forms/ai-tools");
  
  const supabase = createSupabaseServiceClient();
  
  const [formsResult, categoriesResult, submissionsResult] = await Promise.all([
    supabase.from("public_ai_tool_forms").select("*").order("created_at", { ascending: false }),
    supabase.from("public_ai_tool_categories").select("*").order("created_at", { ascending: false }),
    supabase.from("public_ai_tool_submissions").select("*").order("submitted_at", { ascending: false }),
  ]);
  
  const setupError = formsResult.error?.message || categoriesResult.error?.message || submissionsResult.error?.message || null;
  
  return (
    <>
      {setupError ? <div className="mb-5 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm font-bold text-orange-800">Database migration is required: {setupError}</div> : null}
      <PublicAIToolFormsManager 
        forms={(formsResult.data ?? []) as PublicAIToolForm[]} 
        categories={(categoriesResult.data ?? []) as PublicAIToolCategory[]} 
        submissions={(submissionsResult.data ?? []) as PublicAIToolSubmission[]} 
      />
    </>
  );
}
