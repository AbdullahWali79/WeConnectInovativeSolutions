import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type GoogleFormProjectSettings = {
  id: boolean;
  enabled: boolean;
  form_url: string | null;
  title: string;
  instructions: string | null;
  updated_at: string;
  updated_by: string | null;
};

export async function getGoogleFormProjectSettings() {
  const { data, error } = await createSupabaseServiceClient().from("google_form_project_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data as GoogleFormProjectSettings | null;
}

export function extractGoogleFormUrl(input: string) {
  const value = input.trim();
  const iframeMatch = value.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/i);
  const candidate = (iframeMatch?.[1] ?? value).replace(/&amp;/g, "&");
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error("Paste a valid Google Form embed code or full form URL."); }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || !url.pathname.startsWith("/forms/")) {
    throw new Error("Only a full docs.google.com/forms URL or Google Form embed code is allowed.");
  }
  if (!/\/viewform\/?$/i.test(url.pathname)) throw new Error("Use the Google Form Send → Embed code, or its full viewform URL.");
  url.searchParams.set("embedded", "true");
  return url.toString();
}

