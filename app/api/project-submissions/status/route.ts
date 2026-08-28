import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectSubmissionSettings } from "@/lib/project-submission-settings";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const row = await getProjectSubmissionSettings().catch(() => null);
  return NextResponse.json({
    sharedFolderEnabled: Boolean(row?.shared_folder_enabled && row.shared_folder_url),
    sharedFolderUrl: row?.shared_folder_enabled ? row.shared_folder_url : null,
    sharedFolderInstructions: row?.shared_folder_instructions ?? null,
  });
}

