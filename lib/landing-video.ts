/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getGoogleDriveFileId, getGoogleDrivePreviewUrl, getPlayableVideoUrl, getYouTubeEmbedUrl } from "@/lib/promo-media";

export type LandingVideoSettings = {
  is_enabled: boolean;
  video_url: string;
  badge_text: string;
  title: string;
  description: string;
  button_label: string;
  updated_at?: string;
};

export const DEFAULT_LANDING_VIDEO_SETTINGS: LandingVideoSettings = {
  is_enabled: true,
  video_url: "https://drive.google.com/file/d/1HsJoWqo2Fd-EBlRwAHP5iFgWYrk-vV2o/view?usp=sharing",
  badge_text: "Company Intro Video",
  title: "See How We Build & Automate Digital Solutions",
  description: "Watch our quick introductory walkthrough of what WeConnect Innovative Solutions does, how we build custom software, and how we automate workflows for businesses worldwide.",
  button_label: "Watch Intro Video",
};

export function parseVideoEmbed(url: string | null | undefined): {
  type: "embed" | "direct" | "unknown";
  src: string | null;
  fileId?: string | null;
} {
  const cleanUrl = url?.trim();
  if (!cleanUrl) return { type: "unknown", src: null };

  const ytEmbed = getYouTubeEmbedUrl(cleanUrl);
  if (ytEmbed) return { type: "embed", src: ytEmbed };

  const gDriveId = getGoogleDriveFileId(cleanUrl);
  const gDrivePreview = getGoogleDrivePreviewUrl(cleanUrl);
  if (gDrivePreview) return { type: "embed", src: gDrivePreview, fileId: gDriveId };

  const directUrl = getPlayableVideoUrl(cleanUrl);
  if (directUrl) return { type: "direct", src: directUrl };

  return { type: "unknown", src: cleanUrl };
}

export async function getLandingVideoSettings(): Promise<LandingVideoSettings> {
  try {
    const supabase = createSupabasePublicClient();

    // 1. Try dedicated table first if applied
    const { data: dedicatedData, error: dedicatedErr } = await supabase
      .from("landing_video_settings" as any)
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (!dedicatedErr && dedicatedData) {
      return {
        is_enabled: dedicatedData.is_enabled ?? true,
        video_url: dedicatedData.video_url || DEFAULT_LANDING_VIDEO_SETTINGS.video_url,
        badge_text: dedicatedData.badge_text || DEFAULT_LANDING_VIDEO_SETTINGS.badge_text,
        title: dedicatedData.title || DEFAULT_LANDING_VIDEO_SETTINGS.title,
        description: dedicatedData.description || DEFAULT_LANDING_VIDEO_SETTINGS.description,
        button_label: dedicatedData.button_label || DEFAULT_LANDING_VIDEO_SETTINGS.button_label,
        updated_at: dedicatedData.updated_at,
      };
    }

    // 2. Fallback to site_page_content store
    const { data: contentData } = await supabase
      .from("site_page_content")
      .select("document, updated_at")
      .eq("path", "/settings/landing-video")
      .maybeSingle();

    const doc = contentData?.document as Partial<LandingVideoSettings> | undefined;
    if (doc && typeof doc === "object") {
      return {
        is_enabled: doc.is_enabled ?? true,
        video_url: doc.video_url || DEFAULT_LANDING_VIDEO_SETTINGS.video_url,
        badge_text: doc.badge_text || DEFAULT_LANDING_VIDEO_SETTINGS.badge_text,
        title: doc.title || DEFAULT_LANDING_VIDEO_SETTINGS.title,
        description: doc.description || DEFAULT_LANDING_VIDEO_SETTINGS.description,
        button_label: doc.button_label || DEFAULT_LANDING_VIDEO_SETTINGS.button_label,
        updated_at: contentData?.updated_at,
      };
    }
  } catch (err) {
    console.warn("Could not fetch landing video settings, using default:", err);
  }

  return DEFAULT_LANDING_VIDEO_SETTINGS;
}
