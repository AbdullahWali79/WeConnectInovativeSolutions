import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ProjectSubmissionSettings = {
  id: boolean;
  shared_folder_enabled: boolean;
  shared_folder_url: string | null;
  shared_folder_instructions: string | null;
  updated_at: string;
  updated_by: string | null;
};

export async function getProjectSubmissionSettings() {
  const { data, error } = await createSupabaseServiceClient().from("project_submission_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProjectSubmissionSettings | null;
}

export function normalizeSharedDriveFolderUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a valid Google Drive folder URL."); }
  if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) throw new Error("Only a Google Drive folder URL is allowed.");
  const folderId = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.searchParams.get("id");
  if (!folderId) throw new Error("The URL must point to a Google Drive folder.");
  return `https://drive.google.com/drive/folders/${folderId}`;
}

