"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { extractGoogleMapsHint, isGoogleMapsUrl, normalizeGoogleMapsUrl } from "@/lib/google-maps";
import type { Enrollment, Profile } from "@/lib/supabase/types";
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

export async function ensureStudentActiveEnrollment(): Promise<ActionResult<Enrollment | null>> {
  try {
    const { profile } = await requireStudentProfile();
    if (profile.status !== "approved") throw new Error("Student account is not approved.");

    const supabase = createSupabaseServiceClient();
    const { data: existing, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false });
    if (enrollmentError) throw new Error(enrollmentError.message);

    const active = (existing ?? []).find((enrollment) => enrollment.status === "active");
    if (active) return { success: true, data: active as Enrollment, error: null };

    // Recover a stale automatic completion when the real reviewed-work target
    // is not met. Progress reports can be stale, so never use their cached
    // completed_tasks value as the source of truth here.
    for (const enrollment of existing ?? []) {
      if (enrollment.status !== "completed") continue;
      const [{ data: completion }, { data: progress }, reviewedTasksResult, approvedProjectsResult] = await Promise.all([
        supabase.from("completed_students").select("completion_type").eq("student_id", profile.id).eq("course_id", enrollment.course_id).maybeSingle(),
        supabase.from("progress_reports").select("completed_tasks,target_tasks,progress_percentage").eq("student_id", profile.id).eq("course_id", enrollment.course_id).maybeSingle(),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("student_id", profile.id).eq("course_id", enrollment.course_id).eq("status", "reviewed"),
        supabase.from("student_projects").select("id", { count: "exact", head: true }).eq("student_id", profile.id).eq("course_id", enrollment.course_id).eq("status", "approved"),
      ]);
      if (reviewedTasksResult.error) throw new Error(reviewedTasksResult.error.message);
      if (approvedProjectsResult.error) throw new Error(approvedProjectsResult.error.message);

      const completedTasks = Number(reviewedTasksResult.count ?? 0) + Number(approvedProjectsResult.count ?? 0);
      const targetTasks = Number(progress?.target_tasks ?? enrollment.target_tasks ?? 100);
      if (completion?.completion_type !== "forced" && completedTasks < targetTasks) {
        const progressPercentage = Math.min(100, Math.floor((completedTasks / Math.max(targetTasks, 1)) * 100));
        const { data: recovered, error } = await supabase
          .from("enrollments")
          .update({ status: "active", progress_percentage: progressPercentage, completed_at: null })
          .eq("id", enrollment.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        const [progressUpdate, completionDelete] = await Promise.all([
          supabase.from("progress_reports").update({
            completed_tasks: Number(reviewedTasksResult.count ?? 0),
            pending_tasks: Math.max(targetTasks - completedTasks, 0),
            progress_percentage: progressPercentage,
            updated_at: new Date().toISOString(),
          }).eq("student_id", profile.id).eq("course_id", enrollment.course_id),
          supabase.from("completed_students").delete().eq("student_id", profile.id).eq("course_id", enrollment.course_id),
        ]);
        if (progressUpdate.error) throw new Error(progressUpdate.error.message);
        if (completionDelete.error) throw new Error(completionDelete.error.message);
        return { success: true, data: recovered as Enrollment, error: null };
      }
    }

    // Older approvals can have a selected course but no enrollment row.
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("course_id")
      .eq("status", "approved")
      .ilike("email", profile.email ?? "")
      .not("course_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (applicationError) throw new Error(applicationError.message);
    if (!application?.course_id) return { success: true, data: null, error: null };

    const { data: course } = await supabase.from("courses").select("id,status").eq("id", application.course_id).maybeSingle();
    if (!course || course.status !== "active") return { success: true, data: null, error: null };

    const { data: enrollment, error: createError } = await supabase
      .from("enrollments")
      .upsert({ student_id: profile.id, course_id: application.course_id, status: "active", completed_at: null }, { onConflict: "student_id,course_id" })
      .select("*")
      .single();
    if (createError) throw new Error(createError.message);
    return { success: true, data: enrollment as Enrollment, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Could not restore the selected course enrollment.") };
  }
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
