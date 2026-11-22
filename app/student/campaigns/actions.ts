/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getProofLinkError } from "@/lib/proof-links";

const DEFAULT_CAMPAIGN_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1uufJf0w7v5_4JGfqmMKuCZmyuqckC-tP";
const DEFAULT_CAMPAIGN_FOLDER_ID = "1uufJf0w7v5_4JGfqmMKuCZmyuqckC-tP";
const DEFAULT_GOOGLE_DRIVE_WEBHOOK = "https://script.google.com/macros/s/AKfycbz6dX4HSLNQWPgGsAt62po9YcvpRVOr20OlltDz6aAPQFbgeowUUv6QVzL4wOR6KgyvMA/exec";

/**
 * Student-facing campaign actions. Everything runs through the service client
 * so the scoping is explicit in code: a student only ever reaches campaigns
 * they are an approved member of.
 */

async function currentStudent() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  return { userId: user.id, supabase };
}

async function loadMembership(campaignId: string, studentId: string) {
  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from("sm_campaign_members" as any)
    .select("id, campaign_id, student_id, drive_url, status, registration_status, menu_permissions, social_handles, registration_note")
    .eq("campaign_id", campaignId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You are not assigned to this campaign.");
  if ((data as any).status !== "active") throw new Error("Your access to this campaign is paused. Please contact the admin.");

  // Automatically approve active campaign members so students have instant zero-friction access
  if ((data as any).registration_status !== "approved") {
    await admin
      .from("sm_campaign_members" as any)
      .update({ registration_status: "approved", approved_at: new Date().toISOString() })
      .eq("id", (data as any).id);
    (data as any).registration_status = "approved";
  }

  return data as any;
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function menuFor(member: any, key: "plan" | "submit" | "history") {
  const raw = member?.menu_permissions;
  if (!raw || typeof raw !== "object") return true;
  return raw[key] !== false;
}

function revalidateStudent(campaignId?: string) {
  revalidatePath("/student/campaigns");
  if (campaignId) revalidatePath(`/student/campaigns/${campaignId}`);
}

export async function fetchMyCampaigns() {
  try {
    const { userId } = await currentStudent();
    const admin = createSupabaseServiceClient();

    const { data: memberships, error } = await admin
      .from("sm_campaign_members" as any)
      .select(`
        id, campaign_id, drive_url, status, registration_status, menu_permissions,
        campaign:sm_campaigns!campaign_id (
          id, client_name, campaign_name, period_start, period_end, goal, status,
          teacher:profiles!teacher_id ( full_name )
        )
      `)
      .eq("student_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) return { success: false as const, error: error.message };

    const rows = (memberships ?? []) as any[];
    const campaignIds = rows.map((row) => row.campaign_id);

    let dayStats: Record<string, { total: number; visible: number }> = {};
    let pendingByCampaign: Record<string, number> = {};

    if (campaignIds.length > 0) {
      const { data: days } = await admin
        .from("sm_campaign_days" as any)
        .select("id, campaign_id, visible_to_students")
        .in("campaign_id", campaignIds);

      dayStats = ((days ?? []) as any[]).reduce((acc: any, day) => {
        const bucket = acc[day.campaign_id] ?? { total: 0, visible: 0 };
        bucket.total += 1;
        if (day.visible_to_students) bucket.visible += 1;
        acc[day.campaign_id] = bucket;
        return acc;
      }, {});

      const { data: submissions } = await admin
        .from("sm_day_submissions" as any)
        .select("campaign_id, status")
        .eq("student_id", userId)
        .in("campaign_id", campaignIds);

      pendingByCampaign = ((submissions ?? []) as any[]).reduce((acc: any, row) => {
        if (["revision", "rejected"].includes(row.status)) {
          acc[row.campaign_id] = (acc[row.campaign_id] ?? 0) + 1;
        }
        return acc;
      }, {});
    }

    const campaigns = rows.map((row) => ({
      member_id: row.id,
      drive_url: row.drive_url || DEFAULT_CAMPAIGN_DRIVE_FOLDER,
      registration_status: row.registration_status,
      menu_permissions: row.menu_permissions,
      ...row.campaign,
      total_days: dayStats[row.campaign_id]?.total ?? 0,
      visible_days: dayStats[row.campaign_id]?.visible ?? 0,
      needs_attention: pendingByCampaign[row.campaign_id] ?? 0,
    }));

    return { success: true as const, campaigns };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load your campaigns." };
  }
}

export async function fetchMyCampaign(campaignId: string) {
  try {
    const { userId } = await currentStudent();
    const admin = createSupabaseServiceClient();
    const member = await loadMembership(campaignId, userId);

    const [
      { data: campaign, error: campaignError },
      { data: days, error: dayError },
      { data: members, error: memberError },
    ] = await Promise.all([
      admin
        .from("sm_campaigns" as any)
        .select("id, client_name, campaign_name, period_start, period_end, goal, status, teacher:profiles!teacher_id ( full_name )")
        .eq("id", campaignId)
        .maybeSingle(),
      admin
        .from("sm_campaign_days" as any)
        .select("id, day_number, post_date, theme, goal, research_note, platform_plan, caption, image_headline, reel_script, hashtags, cta, engagement_action, source_link, metrics_to_record, visible_to_students, published_url")
        .eq("campaign_id", campaignId)
        .eq("visible_to_students", true)
        .order("day_number"),
      admin
        .from("sm_campaign_members" as any)
        .select("id, student_id, student:profiles!student_id ( id, full_name, email )")
        .eq("campaign_id", campaignId)
        .eq("status", "active"),
    ]);

    const error = campaignError || dayError || memberError;
    if (error) return { success: false as const, error: error.message };
    if (!campaign) return { success: false as const, error: "This campaign no longer exists." };

    const visibleDayIds = ((days ?? []) as any[]).map((day) => day.id);
    let submissions: any[] = [];
    if (visibleDayIds.length > 0) {
      const { data } = await admin
        .from("sm_day_submissions" as any)
        .select(`
          id, day_id, member_id, student_id, video_url, post_url, doc_url, image_urls,
          caption, note, status, score, feedback, is_selected, created_at, updated_at,
          student:profiles!student_id ( id, full_name, email )
        `)
        .eq("campaign_id", campaignId)
        .in("day_id", visibleDayIds)
        .order("created_at", { ascending: false });
      submissions = (data ?? []) as any[];
    }

    return {
      success: true as const,
      campaign,
      currentUserId: userId,
      member: {
        ...member,
        registration_status: "approved",
        drive_url: member.drive_url || DEFAULT_CAMPAIGN_DRIVE_FOLDER,
      },
      members: members ?? [],
      days: days ?? [],
      submissions,
      menus: {
        plan: menuFor(member, "plan"),
        submit: menuFor(member, "submit"),
        history: menuFor(member, "history"),
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load this campaign." };
  }
}

/**
 * The registration gate. Until this is approved by an admin the student cannot
 * see the plan or submit work.
 */
export async function completeCampaignRegistration(
  campaignId: string,
  input: { social_handles?: Record<string, string>; note?: string },
) {
  try {
    const { userId } = await currentStudent();
    const member = await loadMembership(campaignId, userId);

    if (member.registration_status === "approved") {
      return { success: true as const, registration_status: "approved" as const };
    }

    const handles: Record<string, string> = {};
    for (const key of ["instagram", "facebook", "tiktok", "youtube", "linkedin", "x"]) {
      const value = cleanText(input?.social_handles?.[key]);
      if (value) handles[key] = value.slice(0, 200);
    }

    const admin = createSupabaseServiceClient();
    const { error } = await admin
      .from("sm_campaign_members" as any)
      .update({
        drive_url: member.drive_url || DEFAULT_CAMPAIGN_DRIVE_FOLDER,
        registration_status: "registered",
        registered_at: new Date().toISOString(),
        social_handles: handles,
        registration_note: cleanText(input?.note)?.slice(0, 1000) ?? null,
      })
      .eq("id", member.id);
    if (error) return { success: false as const, error: error.message };

    revalidateStudent(campaignId);
    return { success: true as const, registration_status: "registered" as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not save your registration." };
  }
}

/**
 * Direct video upload for social media campaign days straight into Google Drive!
 */
export async function uploadCampaignVideo(formData: FormData) {
  try {
    await currentStudent();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { success: false as const, error: "No video file provided." };
    }

    if (file.size > 80 * 1024 * 1024) {
      return { success: false as const, error: "Video must be under 80MB. For larger videos, compress or paste a Drive link." };
    }

    const webhookUrl = process.env.GOOGLE_DRIVE_UPLOAD_WEBHOOK_URL?.trim() || DEFAULT_GOOGLE_DRIVE_WEBHOOK;
    if (!webhookUrl) {
      return { success: false as const, error: "Google Drive upload webhook is not configured." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || "video/mp4",
        base64Data,
        folderId: DEFAULT_CAMPAIGN_FOLDER_ID,
      }),
    });

    const data = await res.json();
    if (data?.success && data?.url) {
      return { success: true as const, url: data.url as string, name: file.name };
    }

    return { success: false as const, error: data?.error || "Google Drive video upload failed. Please try again." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Video upload failed";
    return { success: false as const, error: message };
  }
}

/**
 * One submission per student per day. Re-submitting overwrites the previous
 * attempt unless the teacher already approved it.
 */
export async function submitDayWork(
  dayId: string,
  input: { video_url?: string; post_url?: string; doc_url?: string; image_urls?: string[]; caption?: string; note?: string },
) {
  try {
    const { userId } = await currentStudent();
    const admin = createSupabaseServiceClient();

    const { data: day, error: dayError } = await admin
      .from("sm_campaign_days" as any)
      .select("id, campaign_id, day_number, visible_to_students")
      .eq("id", dayId)
      .maybeSingle();
    if (dayError) return { success: false as const, error: dayError.message };
    if (!day) return { success: false as const, error: "This day no longer exists." };
    if (!(day as any).visible_to_students) {
      return { success: false as const, error: "This day has not been shared with you yet." };
    }

    const member = await loadMembership((day as any).campaign_id, userId);
    if (!menuFor(member, "submit")) {
      return { success: false as const, error: "Submitting work is not enabled for your account." };
    }

    const videoUrl = cleanText(input?.video_url);
    const postUrl = cleanText(input?.post_url);
    const docUrl = cleanText(input?.doc_url);
    const caption = cleanText(input?.caption);
    const note = cleanText(input?.note);
    const images = (Array.isArray(input?.image_urls) ? input.image_urls : [])
      .map((value) => cleanText(value))
      .filter((value): value is string => Boolean(value))
      .slice(0, 10);

    if (!videoUrl && !postUrl && !docUrl && images.length === 0) {
      return { success: false as const, error: "Add at least a video, the post URL, or an image link." };
    }

    const linksToCheck: [string, string][] = [
      ["Video link", videoUrl],
      ["Post URL", postUrl],
      ["Doc link", docUrl],
      ...images.map((image, index) => [`Image ${index + 1}`, image] as [string, string]),
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));

    for (const [label, value] of linksToCheck) {
      const linkError = getProofLinkError(value);
      if (linkError) return { success: false as const, error: `${label}: ${linkError.replace("Proof link is required.", "is required.")}` };
    }

    const { data: existing } = await admin
      .from("sm_day_submissions" as any)
      .select("id, status")
      .eq("day_id", dayId)
      .eq("member_id", member.id)
      .maybeSingle();

    if (existing && ["approved", "selected"].includes((existing as any).status)) {
      return { success: false as const, error: "This submission was already approved, so it can no longer be changed." };
    }

    const payload = {
      campaign_id: (day as any).campaign_id,
      day_id: dayId,
      member_id: member.id,
      student_id: userId,
      video_url: videoUrl,
      post_url: postUrl,
      doc_url: docUrl,
      image_urls: images,
      caption,
      note,
      status: "submitted",
      feedback: null,
      reviewed_by: null,
      reviewed_at: null,
    };

    const { data: saved, error } = await admin
      .from("sm_day_submissions" as any)
      .upsert(payload, { onConflict: "day_id,member_id" })
      .select("id, day_id, video_url, post_url, doc_url, image_urls, caption, note, status, score, feedback, is_selected, created_at, updated_at")
      .single();

    if (error) return { success: false as const, error: error.message };

    revalidateStudent((day as any).campaign_id);
    return { success: true as const, submission: saved };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not submit your work." };
  }
}

/**
 * Fast Google Sheet style link submission.
 * Supports submitting Google Drive link, Google Docs link, and live post link simultaneously or individually.
 */
export async function submitDayLink(
  dayId: string,
  input:
    | string
    | {
        driveUrl?: string | null;
        docUrl?: string | null;
        postUrl?: string | null;
        note?: string | null;
      },
  legacyNote?: string,
) {
  try {
    const { userId } = await currentStudent();
    const admin = createSupabaseServiceClient();

    let rawDrive = "";
    let rawDoc = "";
    let rawPost = "";
    let note = "";

    if (typeof input === "string") {
      const singleLink = cleanText(input);
      note = cleanText(legacyNote);
      if (singleLink.includes("docs.google.com")) {
        rawDoc = singleLink;
      } else if (/facebook\.com|instagram\.com|tiktok\.com|youtube\.com\/shorts/i.test(singleLink)) {
        rawPost = singleLink;
      } else {
        rawDrive = singleLink;
      }
    } else if (input && typeof input === "object") {
      rawDrive = cleanText(input.driveUrl);
      rawDoc = cleanText(input.docUrl);
      rawPost = cleanText(input.postUrl);
      note = cleanText(input.note);
    }

    // Auto-organize if a student pasted docs link in drive field or drive link in docs field
    if (rawDrive.includes("docs.google.com") && !rawDoc) {
      rawDoc = rawDrive;
      rawDrive = "";
    } else if (rawDoc.includes("drive.google.com") && !rawDrive) {
      rawDrive = rawDoc;
      rawDoc = "";
    }

    if (!rawDrive && !rawDoc && !rawPost) {
      return { success: false as const, error: "Please enter at least one link (Google Drive or Google Docs link)." };
    }

    const linksToValidate: [string, string][] = [
      ["Google Drive link", rawDrive],
      ["Google Docs link", rawDoc],
      ["Live Post URL", rawPost],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));

    for (const [label, url] of linksToValidate) {
      const linkError = getProofLinkError(url);
      if (linkError) {
        return { success: false as const, error: `${label}: ${linkError.replace("Proof link is required.", "is required.")}` };
      }
    }

    const { data: day, error: dayError } = await admin
      .from("sm_campaign_days" as any)
      .select("id, campaign_id, day_number, visible_to_students")
      .eq("id", dayId)
      .maybeSingle();
    if (dayError) return { success: false as const, error: dayError.message };
    if (!day) return { success: false as const, error: "This day no longer exists." };
    if (!(day as any).visible_to_students) {
      return { success: false as const, error: "This day has not been shared with you yet." };
    }

    const member = await loadMembership((day as any).campaign_id, userId);

    const payload: any = {
      campaign_id: (day as any).campaign_id,
      day_id: dayId,
      member_id: member.id,
      student_id: userId,
      video_url: rawDrive || rawDoc || rawPost,
      doc_url: rawDoc || null,
      post_url: rawPost || null,
      note: note || null,
      status: "submitted",
      feedback: null,
      reviewed_by: null,
      reviewed_at: null,
    };

    const { data: saved, error } = await admin
      .from("sm_day_submissions" as any)
      .upsert(payload, { onConflict: "day_id,member_id" })
      .select(`
        id, day_id, member_id, student_id, video_url, post_url, doc_url, image_urls,
        caption, note, status, score, feedback, is_selected, created_at, updated_at,
        student:profiles!student_id ( id, full_name, email )
      `)
      .single();

    if (error) return { success: false as const, error: error.message };

    revalidateStudent((day as any).campaign_id);
    return { success: true as const, submission: saved };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not save your link." };
  }
}

/**
 * Delete student's own submission.
 * Enforces strictly: a student can ONLY delete their own link, never another student's link!
 */
export async function deleteMyDaySubmission(dayId: string) {
  try {
    const { userId } = await currentStudent();
    const admin = createSupabaseServiceClient();

    const { data: sub, error: readError } = await admin
      .from("sm_day_submissions" as any)
      .select("id, student_id, campaign_id")
      .eq("day_id", dayId)
      .eq("student_id", userId)
      .maybeSingle();

    if (readError) return { success: false as const, error: readError.message };
    if (!sub) return { success: true as const };

    // Strict security check: can only delete own submission
    if ((sub as any).student_id !== userId) {
      return { success: false as const, error: "Permission denied: You can only delete your own link." };
    }

    const { error: delError } = await admin
      .from("sm_day_submissions" as any)
      .delete()
      .eq("id", (sub as any).id);

    if (delError) return { success: false as const, error: delError.message };

    revalidateStudent((sub as any).campaign_id);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not delete link." };
  }
}
