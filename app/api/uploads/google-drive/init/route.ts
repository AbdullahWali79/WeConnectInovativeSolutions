import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDriveAccessToken, getDriveSettings } from "@/lib/google-drive";

const allowedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedVideos = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function safeName(value: string) { return value.replace(/[^a-zA-Z0-9._ -]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "upload"; }

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("id,role,status,full_name").eq("id", user.id).single();
    if (!profile || profile.role !== "student" || profile.status !== "approved") return NextResponse.json({ error: "Student upload access denied." }, { status: 403 });
    const input = await request.json();
    const mimeType = String(input.mimeType || "").toLowerCase();
    const size = Number(input.size);
    const isImage = allowedImages.has(mimeType);
    const isVideo = allowedVideos.has(mimeType);
    if (!isImage && !isVideo) throw new Error("Only JPG, PNG, WEBP, GIF, MP4, WEBM, and MOV files are allowed.");
    const settings = await getDriveSettings();
    if (!settings?.enabled || !settings.folder_id || !settings.refresh_token_encrypted) throw new Error("Project uploads are temporarily unavailable. Ask admin to connect Google Drive.");
    const maxBytes = (isImage ? settings.max_image_mb : settings.max_video_mb) * 1024 * 1024;
    if (!Number.isFinite(size) || size < 1 || size > maxBytes) throw new Error(`${isImage ? "Image" : "Video"} must be under ${isImage ? settings.max_image_mb : settings.max_video_mb} MB.`);
    const accessToken = await getDriveAccessToken(settings);
    const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeName(profile.full_name || "student")}_${safeName(String(input.name || "upload"))}`;
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink,parents", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json; charset=UTF-8", "x-upload-content-type": mimeType, "x-upload-content-length": String(size) },
      body: JSON.stringify({ name: filename, mimeType, parents: [settings.folder_id], description: `Uploaded by ${profile.full_name || user.email || user.id} for a WeConnect student project.`, appProperties: { weconnectUploaderId: user.id } }),
    });
    if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail?.error?.message || "Google Drive could not start the upload."); }
    const uploadUrl = response.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive did not return an upload session.");
    return NextResponse.json({ uploadUrl });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start upload." }, { status: 400 }); }
}
