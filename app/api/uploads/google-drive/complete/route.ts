import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { driveJson, getDriveAccessToken, getDriveSettings } from "@/lib/google-drive";

type DriveFile = { id: string; name: string; mimeType: string; size?: string; parents?: string[]; trashed?: boolean; webViewLink?: string; appProperties?: Record<string, string> };

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
    if (!profile || profile.role !== "student" || profile.status !== "approved") return NextResponse.json({ error: "Upload access denied." }, { status: 403 });
    const { fileId } = await request.json();
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(String(fileId || ""))) throw new Error("Invalid Google Drive file response.");
    const settings = await getDriveSettings();
    if (!settings?.folder_id) throw new Error("Google Drive folder is not configured.");
    const token = await getDriveAccessToken(settings);
    const file = await driveJson<DriveFile>(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,parents,trashed,webViewLink,appProperties&supportsAllDrives=true`, token);
    if (file.trashed || !file.parents?.includes(settings.folder_id) || file.appProperties?.weconnectUploaderId !== user.id) throw new Error("Uploaded file does not belong to this student upload session.");
    await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/permissions?supportsAllDrives=true`, token, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "anyone", role: "reader", allowFileDiscovery: false }) });
    return NextResponse.json({ id: file.id, name: file.name, mimeType: file.mimeType, size: Number(file.size || 0), url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to finalize upload." }, { status: 400 }); }
}
