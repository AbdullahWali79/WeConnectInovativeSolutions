import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/admin-access";
import { googleOAuthRedirectUri } from "@/lib/google-drive";

export async function GET(request: Request) {
  try {
    await requireAdminOnly();
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    if (!clientId) throw new Error("GOOGLE_DRIVE_CLIENT_ID is not configured.");
    const state = randomBytes(32).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: googleOAuthRedirectUri(request.url),
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
      state,
    }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set("wc_drive_oauth_state", state, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/admin/settings/google-drive?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to connect Drive.")}`, request.url));
  }
}

