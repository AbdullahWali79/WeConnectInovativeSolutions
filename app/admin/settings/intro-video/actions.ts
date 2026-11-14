/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { LandingVideoSettings } from "@/lib/landing-video";

const landingVideoSchema = z.object({
  is_enabled: z.boolean(),
  video_url: z.string().trim().min(5, "Video URL is required"),
  badge_text: z.string().trim().min(1, "Badge text is required").max(100),
  title: z.string().trim().min(1, "Title is required").max(250),
  description: z.string().trim().max(1000).default(""),
  button_label: z.string().trim().min(1, "Button label is required").max(80),
});

export async function saveLandingVideoSettingsAction(input: LandingVideoSettings) {
  try {
    const adminUser = await requireAdminOnly();
    const validated = landingVideoSchema.parse(input);
    const serviceClient = createSupabaseServiceClient();

    const nowIso = new Date().toISOString();
    const payload = {
      is_enabled: validated.is_enabled,
      video_url: validated.video_url,
      badge_text: validated.badge_text,
      title: validated.title,
      description: validated.description,
      button_label: validated.button_label,
    };

    // 1. Save to site_page_content store (guaranteed available in database)
    const { error: contentErr } = await (serviceClient as any)
      .from("site_page_content")
      .upsert({
        path: "/settings/landing-video",
        document: payload,
        updated_by: adminUser.id,
        updated_at: nowIso,
      });

    if (contentErr) {
      console.error("Failed to save landing video to site_page_content:", contentErr);
      return { success: false, error: contentErr.message };
    }

    // 2. Also try upserting to dedicated table if table exists
    try {
      await serviceClient
        .from("landing_video_settings" as any)
        .upsert({
          id: true,
          ...payload,
          updated_at: nowIso,
          updated_by: adminUser.id,
        });
    } catch {
      // Table may not be migrated yet, fallback to site_page_content is sufficient
    }

    revalidatePath("/");
    revalidatePath("/admin/settings/intro-video");

    return { success: true, settings: { ...payload, updated_at: nowIso } };
  } catch (err) {
    console.error("saveLandingVideoSettingsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save settings.",
    };
  }
}
