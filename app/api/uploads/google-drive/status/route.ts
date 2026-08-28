import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDriveSettings } from "@/lib/google-drive";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ configured: false }, { status: 401 });
  const settings = await getDriveSettings().catch(() => null);
  return NextResponse.json({ configured: Boolean(settings?.enabled && settings.folder_id && settings.refresh_token_encrypted), maxImageMb: settings?.max_image_mb ?? 15, maxVideoMb: settings?.max_video_mb ?? 500 });
}

