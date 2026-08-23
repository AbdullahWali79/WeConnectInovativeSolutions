import { requireAdminPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PublicClientHuntFormsManager } from "@/components/admin/public-client-hunt-forms-manager";
import type { PublicClientHuntForm, PublicClientHuntKeyword, PublicClientHuntSubmission } from "@/lib/supabase/types";

export default async function AdminPublicClientHuntFormsPage() {
  await requireAdminPage("/admin/forms/client-hunt");
  const supabase = createSupabaseServiceClient();
  const [formsResult, keywordsResult, submissionsResult] = await Promise.all([
    supabase.from("public_client_hunt_forms").select("*").order("created_at", { ascending: false }),
    supabase.from("public_client_hunt_keywords").select("*").order("created_at", { ascending: false }),
    supabase.from("public_client_hunt_submissions").select("*").order("submitted_at", { ascending: false }),
  ]);
  const setupError = formsResult.error?.message || keywordsResult.error?.message || submissionsResult.error?.message || null;
  return <PublicClientHuntFormsManager forms={(formsResult.data ?? []) as PublicClientHuntForm[]} keywords={(keywordsResult.data ?? []) as PublicClientHuntKeyword[]} submissions={(submissionsResult.data ?? []) as PublicClientHuntSubmission[]} setupError={setupError} />;
}
