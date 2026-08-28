import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type GoogleDriveSettings = {
  id: boolean;
  refresh_token_encrypted: string | null;
  account_email: string | null;
  folder_id: string | null;
  folder_name: string | null;
  enabled: boolean;
  max_image_mb: number;
  max_video_mb: number;
  connected_at: string | null;
  updated_at: string;
  updated_by: string | null;
};

function encryptionKey() {
  const secret = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY is not configured.");
  return createHash("sha256").update(secret).digest();
}

export function encryptDriveToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptDriveToken(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Stored Google Drive credential is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export async function getDriveSettings() {
  const { data, error } = await createSupabaseServiceClient().from("google_drive_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data as GoogleDriveSettings | null;
}

export function googleOAuthRedirectUri(requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const origin = requestUrl ? new URL(requestUrl).origin : null;
  const base = configured || origin;
  if (!base) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  return `${base}/api/admin/google-drive/callback`;
}

export async function getDriveAccessToken(settings?: GoogleDriveSettings | null) {
  const active = settings ?? await getDriveSettings();
  if (!active?.refresh_token_encrypted) throw new Error("Admin has not connected Google Drive.");
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google Drive OAuth credentials are not configured.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decryptDriveToken(active.refresh_token_encrypted), grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Google Drive authorization expired. Reconnect the Drive.");
  return String(payload.access_token);
}

export async function driveJson<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Google Drive request failed (${response.status}).`);
  return payload as T;
}

export function parseDriveFolderId(value: string) {
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.searchParams.get("id");
  } catch { return null; }
}

