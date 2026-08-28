import { NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { extractGoogleFormUrl, getGoogleFormProjectSettings } from "@/lib/google-form-settings";

export async function GET() {
  try {
    await requireAdminOnly();
    const row = await getGoogleFormProjectSettings();
    return NextResponse.json({ enabled: row?.enabled ?? false, formUrl: row?.form_url ?? "", title: row?.title ?? "Project Submission Form", instructions: row?.instructions ?? "" });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Google Form settings." }, { status: 403 }); }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requireAdminOnly();
    const input = await request.json();
    const current = await getGoogleFormProjectSettings();
    const rawForm = String(input.formInput ?? current?.form_url ?? "").trim();
    const formUrl = rawForm ? extractGoogleFormUrl(rawForm) : null;
    const enabled = Boolean(input.enabled);
    if (enabled && !formUrl) throw new Error("Add and save a Google Form before activating it.");
    const payload = {
      id: true,
      enabled,
      form_url: formUrl,
      title: String(input.title || "Project Submission Form").trim().slice(0, 120) || "Project Submission Form",
      instructions: String(input.instructions || "").trim().slice(0, 1000) || null,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    };
    const { error } = await createSupabaseServiceClient().from("google_form_project_settings").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ enabled: payload.enabled, formUrl: payload.form_url, title: payload.title, instructions: payload.instructions ?? "" });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Google Form settings." }, { status: 400 }); }
}

