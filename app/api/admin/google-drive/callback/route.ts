import { NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { driveJson, encryptDriveToken, googleOAuthRedirectUri } from "@/lib/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const profile = await requireAdminOnly();
    const state = url.searchParams.get("state");
    const cookieState = request.headers.get("cookie")?.match(/(?:^|; )wc_drive_oauth_state=([^;]+)/)?.[1];
    if (!state || !cookieState || state !== decodeURIComponent(cookieState)) throw new Error("Google connection security check failed. Please retry.");
    const code = url.searchParams.get("code");
    if (!code) throw new Error(url.searchParams.get("error") || "Google did not return an authorization code.");
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) throw new Error("Google Drive OAuth credentials are not configured.");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: googleOAuthRedirectUri(request.url), grant_type: "authorization_code" }) });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.refresh_token) throw new Error(tokens.error_description || "Google did not provide long-term Drive access. Reconnect and approve access.");
    const user = await driveJson<{ email: string }>("https://www.googleapis.com/oauth2/v2/userinfo", tokens.access_token);
    const { error } = await createSupabaseServiceClient().from("google_drive_settings").upsert({ id: true, refresh_token_encrypted: encryptDriveToken(tokens.refresh_token), account_email: user.email, folder_id: null, folder_name: null, enabled: false, connected_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: profile.id }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    const response = NextResponse.redirect(new URL("/admin/settings/google-drive?connected=1", request.url));
    response.cookies.delete("wc_drive_oauth_state");
    return response;
  } catch (error) {
    const response = NextResponse.redirect(new URL(`/admin/settings/google-drive?error=${encodeURIComponent(error instanceof Error ? error.message : "Google Drive connection failed.")}`, request.url));
    response.cookies.delete("wc_drive_oauth_state");
    return response;
  }
}
