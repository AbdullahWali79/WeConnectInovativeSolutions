"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { extractGoogleMapsHint, isGoogleMapsUrl, normalizeGoogleMapsUrl } from "@/lib/google-maps";
import type { Profile } from "@/lib/supabase/types";
import { validateProfileLink } from "@/lib/profile-links";
import { CLIENT_HUNTING_SPECIALIZATIONS, type ClientHuntSpecialization } from "@/lib/client-hunting";

type ActionResult<T = null> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

async function requireStudentProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = data as Profile | null;

  if (error || !profile || profile.role !== "student") {
    throw new Error("Student profile could not be verified.");
  }

  return { supabase, profile };
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getGoogleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

async function resolveGoogleMapsUrl(input: string) {
  const response = await fetch(input, { redirect: "follow" });
  return response.url || input;
}

export async function updateStudentProfileLinks(input: {
  githubUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  indeedUrl: string;
  clientHuntingSpecialization: ClientHuntSpecialization;
}): Promise<ActionResult<Profile>> {
  try {
    const { profile } = await requireStudentProfile();
    const supabase = createSupabaseServiceClient();

    const specialization = CLIENT_HUNTING_SPECIALIZATIONS.some((item) => item.value === input.clientHuntingSpecialization)
      ? input.clientHuntingSpecialization
      : "web_development";

    const payload = {
      github_url: validateProfileLink(input.githubUrl, "GitHub profile", []),
      linkedin_url: validateProfileLink(input.linkedinUrl, "LinkedIn page", []),
      facebook_url: validateProfileLink(input.facebookUrl, "Facebook account", []),
      indeed_url: validateProfileLink(input.indeedUrl, "Indeed account", []),
      client_hunting_specialization: specialization,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message || "Profile links could not be saved.");
    }

    revalidatePath("/student");
    revalidatePath("/student/profile");
    revalidatePath("/student/progress");
    revalidatePath("/student/client-hunting");
    return { success: true, data: data as Profile, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save profile links.") };
  }
}

export async function fetchGoogleMapsBusinessDetails(input: {
  gmbUrl: string;
}): Promise<ActionResult<{
  businessName: string;
  websiteUrl: string;
  address: string;
  phoneNumber: string;
  resolvedUrl: string;
}>> {
  try {
    const rawUrl = normalizeGoogleMapsUrl(input.gmbUrl);
    if (!rawUrl) {
      throw new Error("Paste a Google Maps link first.");
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new Error("Enter a valid Google Maps URL.");
    }

    if (!isGoogleMapsUrl(parsedUrl.toString())) {
      throw new Error("Please paste a Google Maps link.");
    }

    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      throw new Error("Google Maps API key is not configured.");
    }

    const resolvedUrl = await resolveGoogleMapsUrl(rawUrl);
    const searchHint = extractGoogleMapsHint(resolvedUrl);

    if (!searchHint) {
      throw new Error("Could not read the place name from the Google Maps link.");
    }

    const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: searchHint,
        languageCode: "en",
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Google Places lookup failed: ${errorText || searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json() as {
      places?: Array<{
        displayName?: { text?: string | null } | null;
        formattedAddress?: string | null;
        nationalPhoneNumber?: string | null;
        websiteUri?: string | null;
      }>;
    };

    const place = searchData.places?.[0];
    if (!place) {
      throw new Error("No business details were found for that link.");
    }

    return {
      success: true,
      data: {
        businessName: place.displayName?.text?.trim() || searchHint,
        websiteUrl: place.websiteUri?.trim() || "",
        address: place.formattedAddress?.trim() || "",
        phoneNumber: place.nationalPhoneNumber?.trim() || "",
        resolvedUrl,
      },
      error: null,
    };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to fetch business details.") };
  }
}
