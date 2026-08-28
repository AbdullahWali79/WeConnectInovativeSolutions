import { NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDriveSettings } from "@/lib/google-drive";
import { getGoogleFormProjectSettings } from "@/lib/google-form-settings";
import { getProjectSubmissionSettings, normalizeSharedDriveFolderUrl } from "@/lib/project-submission-settings";

async function snapshot() {
  const [shared, drive, form] = await Promise.all([
    getProjectSubmissionSettings(),
    getDriveSettings().catch(() => null),
    getGoogleFormProjectSettings().catch(() => null),
  ]);
  const activeMethod = form?.enabled ? "google_form" : drive?.enabled ? "google_drive" : shared?.shared_folder_enabled ? "shared_folder" : "manual";
  return {
    activeMethod,
    sharedFolderUrl: shared?.shared_folder_url ?? "",
    sharedFolderInstructions: shared?.shared_folder_instructions ?? "Create a folder using your project name, upload images/videos, set each file to Anyone with the link — Viewer, then paste the file links in the project form.",
    googleDriveReady: Boolean(drive?.refresh_token_encrypted && drive.folder_id),
    googleFormReady: Boolean(form?.form_url),
  };
}

export async function GET() {
  try { await requireAdminOnly(); return NextResponse.json(await snapshot()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load project submission settings." }, { status: 403 }); }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requireAdminOnly();
    const input = await request.json();
    const method = String(input.method || "manual");
    if (!["manual", "shared_folder", "google_drive", "google_form"].includes(method)) throw new Error("Invalid submission method.");
    const current = await getProjectSubmissionSettings();
    const rawUrl = String(input.sharedFolderUrl ?? current?.shared_folder_url ?? "").trim();
    const sharedFolderUrl = rawUrl ? normalizeSharedDriveFolderUrl(rawUrl) : null;
    if (method === "shared_folder" && !sharedFolderUrl) throw new Error("Save a Google Drive folder link before activating this method.");
    const drive = await getDriveSettings().catch(() => null);
    if (method === "google_drive" && !(drive?.refresh_token_encrypted && drive.folder_id)) throw new Error("Connect and mount Google Drive before activating API uploads.");
    const form = await getGoogleFormProjectSettings().catch(() => null);
    if (method === "google_form" && !form?.form_url) throw new Error("Save a Google Form before activating it.");
    const admin = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const { error: sharedError } = await admin.from("project_submission_settings").upsert({
      id: true,
      shared_folder_enabled: method === "shared_folder",
      shared_folder_url: sharedFolderUrl,
      shared_folder_instructions: String(input.sharedFolderInstructions ?? current?.shared_folder_instructions ?? "").trim().slice(0, 1500) || null,
      updated_at: now,
      updated_by: profile.id,
    }, { onConflict: "id" });
    if (sharedError) throw new Error(sharedError.message);
    const { error: driveError } = await admin.from("google_drive_settings").update({ enabled: method === "google_drive", updated_at: now, updated_by: profile.id }).eq("id", true);
    if (driveError) throw new Error(driveError.message);
    const { error: formError } = await admin.from("google_form_project_settings").update({ enabled: method === "google_form", updated_at: now, updated_by: profile.id }).eq("id", true);
    if (formError) throw new Error(formError.message);
    return NextResponse.json(await snapshot());
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update project submission method." }, { status: 400 }); }
}

