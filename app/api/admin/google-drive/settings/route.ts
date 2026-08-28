import { NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { driveJson, getDriveAccessToken, getDriveSettings, parseDriveFolderId } from "@/lib/google-drive";

type DriveFolder = { id: string; name: string; mimeType: string; trashed?: boolean };

async function publicSettings() {
  const settings = await getDriveSettings();
  if (!settings) return { connected: false, enabled: false, accountEmail: null, folderId: null, folderName: null, maxImageMb: 15, maxVideoMb: 500, storage: null };
  let storage: { limit?: string; usage?: string } | null = null;
  if (settings.refresh_token_encrypted) {
    try {
      const token = await getDriveAccessToken(settings);
      const about = await driveJson<{ storageQuota?: { limit?: string; usage?: string } }>("https://www.googleapis.com/drive/v3/about?fields=storageQuota", token);
      storage = about.storageQuota ?? null;
    } catch { /* The UI still needs to load so admin can reconnect. */ }
  }
  return { connected: Boolean(settings.refresh_token_encrypted), enabled: settings.enabled, accountEmail: settings.account_email, folderId: settings.folder_id, folderName: settings.folder_name, maxImageMb: settings.max_image_mb, maxVideoMb: settings.max_video_mb, storage };
}

export async function GET() {
  try { await requireAdminOnly(); return NextResponse.json(await publicSettings()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Drive settings." }, { status: 403 }); }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requireAdminOnly();
    const current = await getDriveSettings();
    if (!current?.refresh_token_encrypted) throw new Error("Connect a Google Drive account first.");
    const input = await request.json();
    const folderId = parseDriveFolderId(String(input.folder ?? current.folder_id ?? ""));
    if (!folderId) throw new Error("Enter a valid Google Drive folder link or folder ID.");
    const token = await getDriveAccessToken(current);
    const folder = await driveJson<DriveFolder>(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed&supportsAllDrives=true`, token);
    if (folder.trashed || folder.mimeType !== "application/vnd.google-apps.folder") throw new Error("The selected item is not an available Google Drive folder.");
    const maxImageMb = Math.min(100, Math.max(1, Number(input.maxImageMb) || 15));
    const maxVideoMb = Math.min(5000, Math.max(1, Number(input.maxVideoMb) || 500));
    const { error } = await createSupabaseServiceClient().from("google_drive_settings").update({ folder_id: folder.id, folder_name: folder.name, enabled: input.enabled !== false, max_image_mb: maxImageMb, max_video_mb: maxVideoMb, updated_at: new Date().toISOString(), updated_by: profile.id }).eq("id", true);
    if (error) throw new Error(error.message);
    return NextResponse.json(await publicSettings());
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Drive settings." }, { status: 400 }); }
}

export async function DELETE() {
  try {
    const profile = await requireAdminOnly();
    const current = await getDriveSettings();
    if (current?.refresh_token_encrypted) {
      try { const token = await getDriveAccessToken(current); await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }); } catch { /* Local disconnect must still succeed. */ }
    }
    const { error } = await createSupabaseServiceClient().from("google_drive_settings").update({ refresh_token_encrypted: null, account_email: null, folder_id: null, folder_name: null, enabled: false, connected_at: null, updated_at: new Date().toISOString(), updated_by: profile.id }).eq("id", true);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to disconnect Drive." }, { status: 400 }); }
}

