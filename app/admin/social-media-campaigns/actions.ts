/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requirePermission } from "@/lib/admin-access";
import { loadCampaignWorkspace } from "@/lib/social-campaigns-data";

/**
 * Every action here runs with the service-role client, which bypasses RLS, so
 * the teacher/student scoping that the policies describe is enforced in code.
 */
async function requireCampaignAccess(permission: "social_campaigns.view" | "social_campaigns.create" | "social_campaigns.edit" | "social_campaigns.delete" | "social_campaigns.approve") {
  return requirePermission(permission);
}

function isTeacher(profile: any) {
  return profile?.role === "teacher";
}

/** Teachers may only ever touch campaigns assigned to them. */
async function assertCampaignAccess(campaignId: string, profile: any) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("sm_campaigns" as any)
    .select("id, teacher_id, period_start")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This campaign no longer exists.");
  if (isTeacher(profile) && (data as any).teacher_id !== profile.id) {
    throw new Error("This campaign is not assigned to you.");
  }
  return data as any;
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function cleanDate(value: any) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

/**
 * Only the two list routes actually exist — the board is client state on
 * `/admin/social-media-campaigns`, so revalidating a per-campaign URL used to be
 * dead work on every single save.
 */
function revalidateCampaign(_campaignId?: string) {
  revalidatePath("/admin/social-media-campaigns");
  revalidatePath("/student/campaigns");
}

const CAMPAIGN_MENU_KEYS = ["plan", "submit", "history"] as const;

/** Keeps the jsonb payload to known keys so a bad client cannot inject junk. */
function normalizeMenus(raw: any) {
  const source = raw && typeof raw === "object" ? raw : {};
  return CAMPAIGN_MENU_KEYS.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = Boolean(source[key]);
    return acc;
  }, {});
}

const DAY_CONTENT_FIELDS = [
  "theme",
  "goal",
  "research_note",
  "platform_plan",
  "caption",
  "image_headline",
  "x_draft",
  "source_link",
  "reel_script",
  "hashtags",
  "engagement_action",
  "cta",
  "metrics_to_record",
] as const;

function normalizeDay(raw: any, index: number, periodStart: string | null) {
  const dayNumber = Number(raw?.day_number);
  const payload: any = {
    day_number: Number.isFinite(dayNumber) && dayNumber > 0 ? Math.trunc(dayNumber) : index + 1,
    post_date: cleanDate(raw?.post_date),
  };
  if (!payload.post_date && periodStart) {
    const base = new Date(`${periodStart}T00:00:00Z`);
    if (!Number.isNaN(base.getTime())) {
      base.setUTCDate(base.getUTCDate() + payload.day_number - 1);
      payload.post_date = base.toISOString().slice(0, 10);
    }
  }
  for (const field of DAY_CONTENT_FIELDS) {
    payload[field] = cleanText(raw?.[field]);
  }
  return payload;
}

// ---------------------------------------------------------
// Lookups
// ---------------------------------------------------------

export async function listCampaignTeachers() {
  try {
    await requireCampaignAccess("social_campaigns.view");
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("profiles" as any)
      .select("id, full_name, email, phone, status")
      .eq("role", "teacher")
      .order("full_name");
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, teachers: data ?? [] };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load teachers." };
  }
}

export async function searchCampaignStudents(term: string, limit = 25) {
  try {
    await requireCampaignAccess("social_campaigns.view");
    const supabase = createSupabaseServiceClient();
    const safe = String(term || "").replace(/[%,()*]/g, " ").trim();
    let query = supabase
      .from("profiles" as any)
      .select("id, full_name, email, phone, status")
      .eq("role", "student");
    if (safe) {
      const pattern = `*${safe}*`;
      query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
    }
    const { data, error } = await query.order("full_name").limit(Math.min(Math.max(limit, 1), 50));
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, students: data ?? [] };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not search students." };
  }
}

// ---------------------------------------------------------
// Campaigns
// ---------------------------------------------------------

export async function fetchCampaigns() {
  try {
    const profile = await requireCampaignAccess("social_campaigns.view");
    const result = await loadCampaignWorkspace({
      teacherId: isTeacher(profile) ? profile.id : null,
    });
    if (!result.success) return { success: false as const, error: result.error };
    return { success: true as const, campaigns: result.campaigns };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load campaigns." };
  }
}

/**
 * Campaigns + the teacher picker in a single authenticated call.
 * The list page used to fire two server actions in parallel, which doubled the
 * auth round trips before anything could paint.
 */
export async function fetchCampaignWorkspace() {
  try {
    const profile = await requireCampaignAccess("social_campaigns.view");
    const result = await loadCampaignWorkspace({
      teacherId: isTeacher(profile) ? profile.id : null,
    });
    if (!result.success) return { success: false as const, error: result.error };
    return {
      success: true as const,
      campaigns: result.campaigns,
      teachers: result.teachers,
    };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load campaigns." };
  }
}

export async function fetchCampaignDetail(campaignId: string) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.view");
    await assertCampaignAccess(campaignId, profile);
    const supabase = createSupabaseServiceClient();

    const [
      { data: campaign, error: campaignError },
      { data: days, error: dayError },
      { data: members, error: memberError },
      { data: submissions, error: submissionError },
    ] = await Promise.all([
      supabase
        .from("sm_campaigns" as any)
        .select("*, teacher:profiles!teacher_id ( id, full_name, email, phone )")
        .eq("id", campaignId)
        .maybeSingle(),
      supabase
        .from("sm_campaign_days" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .order("day_number"),
      supabase
        .from("sm_campaign_members" as any)
        .select("*, student:profiles!student_id ( id, full_name, email, phone )")
        .eq("campaign_id", campaignId)
        .order("created_at"),
      supabase
        .from("sm_day_submissions" as any)
        .select("*, student:profiles!student_id ( id, full_name )")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false }),
    ]);

    const error = campaignError || dayError || memberError;
    if (error) return { success: false as const, error: error.message };
    if (!campaign) return { success: false as const, error: "This campaign no longer exists." };

    // The student-portal migration adds the submissions table and the
    // registration columns. Until it is applied the board must still open, just
    // without the student half — so flag it instead of failing the whole page.
    const setupMissing = Boolean(
      submissionError &&
        (submissionError.code === "PGRST205" ||
          submissionError.code === "42P01" ||
          submissionError.message?.includes("sm_day_submissions")),
    );

    return {
      success: true as const,
      campaign,
      days: days ?? [],
      members: members ?? [],
      submissions: setupMissing ? [] : submissions ?? [],
      setupMissing,
      role: profile.role as string,
      canEdit: true,
    };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load this campaign." };
  }
}

export async function createCampaign(input: any) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.create");
    const supabase = createSupabaseServiceClient();

    const clientName = cleanText(input?.client_name);
    if (!clientName) return { success: false as const, error: "Client name is required." };

    const periodStart = cleanDate(input?.period_start);
    const periodEnd = cleanDate(input?.period_end);
    if (periodStart && periodEnd && periodEnd < periodStart) {
      return { success: false as const, error: "The end date cannot be before the start date." };
    }

    const teacherId = cleanText(input?.teacher_id);
    if (teacherId) {
      const { data: teacher } = await supabase
        .from("profiles" as any)
        .select("id, role")
        .eq("id", teacherId)
        .maybeSingle();
      if (!teacher || (teacher as any).role !== "teacher") {
        return { success: false as const, error: "Pick a valid teacher for this campaign." };
      }
    }

    const { data: created, error: createError } = await supabase
      .from("sm_campaigns" as any)
      .insert({
        client_name: clientName,
        campaign_name: cleanText(input?.campaign_name),
        period_start: periodStart,
        period_end: periodEnd,
        goal: cleanText(input?.goal),
        teacher_id: teacherId,
        teacher_drive_url: cleanText(input?.teacher_drive_url),
        drive_folder_url: cleanText(input?.drive_folder_url),
        status: input?.status === "active" ? "active" : "draft",
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { success: false as const, error: createError?.message ?? "Could not create the campaign." };
    }

    const campaignId = (created as any).id as string;

    const rawDays: any[] = Array.isArray(input?.days) ? input.days : [];
    if (rawDays.length > 0) {
      const rows = rawDays
        .slice(0, 366)
        .map((raw, index) => ({ ...normalizeDay(raw, index, periodStart), campaign_id: campaignId }));
      const { error: dayError } = await supabase.from("sm_campaign_days" as any).insert(rows);
      if (dayError) {
        // Do not leave a half-imported campaign behind.
        await supabase.from("sm_campaigns" as any).delete().eq("id", campaignId);
        return { success: false as const, error: `Plan import failed: ${dayError.message}` };
      }
    }

    revalidateCampaign(campaignId);
    return { success: true as const, campaignId, dayCount: rawDays.length };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not create the campaign." };
  }
}

export async function updateCampaign(campaignId: string, input: any) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    await assertCampaignAccess(campaignId, profile);
    const supabase = createSupabaseServiceClient();

    const patch: any = {};
    if ("client_name" in input) {
      const clientName = cleanText(input.client_name);
      if (!clientName) return { success: false as const, error: "Client name is required." };
      patch.client_name = clientName;
    }
    if ("campaign_name" in input) patch.campaign_name = cleanText(input.campaign_name);
    if ("goal" in input) patch.goal = cleanText(input.goal);
    if ("period_start" in input) patch.period_start = cleanDate(input.period_start);
    if ("period_end" in input) patch.period_end = cleanDate(input.period_end);
    if ("teacher_id" in input) patch.teacher_id = cleanText(input.teacher_id);
    if ("teacher_drive_url" in input) patch.teacher_drive_url = cleanText(input.teacher_drive_url);
    if ("drive_folder_url" in input) patch.drive_folder_url = cleanText(input.drive_folder_url);
    if ("status" in input && ["draft", "active", "paused", "completed"].includes(input.status)) {
      patch.status = input.status;
    }

    if (Object.keys(patch).length === 0) return { success: true as const };
    if (patch.period_start && patch.period_end && patch.period_end < patch.period_start) {
      return { success: false as const, error: "The end date cannot be before the start date." };
    }

    const { error } = await supabase.from("sm_campaigns" as any).update(patch).eq("id", campaignId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign(campaignId);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not update the campaign." };
  }
}

export async function deleteCampaign(campaignId: string) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.delete");
    await assertCampaignAccess(campaignId, profile);
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("sm_campaigns" as any).delete().eq("id", campaignId);
    if (error) return { success: false as const, error: error.message };
    revalidateCampaign();
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not delete the campaign." };
  }
}

// ---------------------------------------------------------
// Days
// ---------------------------------------------------------

/** Replaces the whole day plan — used when the admin re-uploads a corrected sheet. */
export async function replaceCampaignDays(campaignId: string, days: any[]) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    const campaign = await assertCampaignAccess(campaignId, profile);
    const supabase = createSupabaseServiceClient();

    const rows = (Array.isArray(days) ? days : [])
      .slice(0, 366)
      .map((raw, index) => ({ ...normalizeDay(raw, index, campaign?.period_start ?? null), campaign_id: campaignId }));
    if (rows.length === 0) {
      return { success: false as const, error: "The uploaded plan has no day rows." };
    }

    const { error: deleteError } = await supabase.from("sm_campaign_days" as any).delete().eq("campaign_id", campaignId);
    if (deleteError) return { success: false as const, error: deleteError.message };

    const { error: insertError } = await supabase.from("sm_campaign_days" as any).insert(rows);
    if (insertError) return { success: false as const, error: insertError.message };

    revalidateCampaign(campaignId);
    return { success: true as const, dayCount: rows.length };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not import the plan." };
  }
}

export async function updateCampaignDay(dayId: string, input: any) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    const supabase = createSupabaseServiceClient();

    const { data: day, error: readError } = await supabase
      .from("sm_campaign_days" as any)
      .select("id, campaign_id")
      .eq("id", dayId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!day) return { success: false as const, error: "This day no longer exists." };
    await assertCampaignAccess((day as any).campaign_id, profile);

    const patch: any = {};
    if ("post_date" in input) patch.post_date = cleanDate(input.post_date);
    if ("published_url" in input) patch.published_url = cleanText(input.published_url);
    if ("notes" in input) patch.notes = cleanText(input.notes);
    for (const field of DAY_CONTENT_FIELDS) {
      if (field in input) patch[field] = cleanText(input[field]);
    }
    if (Object.keys(patch).length === 0) return { success: true as const };

    const { error } = await supabase.from("sm_campaign_days" as any).update(patch).eq("id", dayId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((day as any).campaign_id);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not update this day." };
  }
}

/**
 * The dual approval. `teacher` and `admin` are independent flags — either one
 * marks the day Done, and whoever acted is recorded on the row.
 */
export async function setDayApproval(dayId: string, actor: "teacher" | "admin", done: boolean) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.approve");
    const supabase = createSupabaseServiceClient();

    const { data: day, error: readError } = await supabase
      .from("sm_campaign_days" as any)
      .select("id, campaign_id, status, teacher_status, admin_status")
      .eq("id", dayId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!day) return { success: false as const, error: "This day no longer exists." };

    const campaign = await assertCampaignAccess((day as any).campaign_id, profile);
    if (isTeacher(profile) && actor !== "teacher") {
      return { success: false as const, error: "Only an admin can give the admin approval." };
    }

    const nextTeacher = actor === "teacher" ? (done ? "done" : "pending") : (day as any).teacher_status;
    const nextAdmin = actor === "admin" ? (done ? "done" : "pending") : (day as any).admin_status;
    const approved = nextTeacher === "done" || nextAdmin === "done";
    const wasPublished = (day as any).status === "published";

    const patch: any = {
      teacher_status: nextTeacher,
      admin_status: nextAdmin,
      status: wasPublished ? "published" : approved ? "approved" : "in_progress",
    };
    if (actor === "teacher") {
      patch.teacher_action_by = done ? profile.id : null;
      patch.teacher_action_at = done ? new Date().toISOString() : null;
    } else {
      patch.admin_action_by = done ? profile.id : null;
      patch.admin_action_at = done ? new Date().toISOString() : null;
    }

    const { error } = await supabase.from("sm_campaign_days" as any).update(patch).eq("id", dayId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign(campaign?.id);
    return {
      success: true as const,
      day: {
        id: dayId,
        teacher_status: nextTeacher,
        admin_status: nextAdmin,
        status: patch.status,
        teacher_action_at: patch.teacher_action_at ?? null,
        admin_action_at: patch.admin_action_at ?? null,
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not update the approval." };
  }
}

export async function setDayPublished(dayId: string, publishedUrl: string) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.approve");
    const supabase = createSupabaseServiceClient();

    const { data: day, error: readError } = await supabase
      .from("sm_campaign_days" as any)
      .select("id, campaign_id, teacher_status, admin_status")
      .eq("id", dayId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!day) return { success: false as const, error: "This day no longer exists." };
    await assertCampaignAccess((day as any).campaign_id, profile);

    const url = cleanText(publishedUrl);
    const approved = (day as any).teacher_status === "done" || (day as any).admin_status === "done";
    const { error } = await supabase
      .from("sm_campaign_days" as any)
      .update({ published_url: url, status: url ? "published" : approved ? "approved" : "in_progress" })
      .eq("id", dayId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((day as any).campaign_id);
    return { success: true as const, published_url: url, status: url ? "published" : approved ? "approved" : "in_progress" };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not save the published link." };
  }
}

// ---------------------------------------------------------
// Members
// ---------------------------------------------------------

export async function addCampaignMember(campaignId: string, studentId: string, driveUrl: string) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    await assertCampaignAccess(campaignId, profile);
    if (!studentId) return { success: false as const, error: "Pick a student first." };

    const supabase = createSupabaseServiceClient();
    const { data: student } = await supabase
      .from("profiles" as any)
      .select("id, role")
      .eq("id", studentId)
      .maybeSingle();
    if (!student || (student as any).role !== "student") {
      return { success: false as const, error: "Only students can be assigned to a campaign." };
    }

    const { data, error } = await supabase
      .from("sm_campaign_members" as any)
      .upsert(
        {
          campaign_id: campaignId,
          student_id: studentId,
          drive_url: cleanText(driveUrl),
          status: "active",
          assigned_by: profile.id,
        },
        { onConflict: "campaign_id,student_id" },
      )
      .select("*, student:profiles!student_id ( id, full_name, email, phone )")
      .single();

    if (error) return { success: false as const, error: error.message };
    revalidateCampaign(campaignId);
    return { success: true as const, member: data };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not assign this student." };
  }
}

export async function updateCampaignMember(memberId: string, input: any) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    const supabase = createSupabaseServiceClient();

    const { data: member, error: readError } = await supabase
      .from("sm_campaign_members" as any)
      .select("id, campaign_id")
      .eq("id", memberId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!member) return { success: false as const, error: "This assignment no longer exists." };
    await assertCampaignAccess((member as any).campaign_id, profile);

    const patch: any = {};
    if ("drive_url" in input) patch.drive_url = cleanText(input.drive_url);
    if ("status" in input && ["active", "paused", "removed"].includes(input.status)) patch.status = input.status;
    if ("registration_status" in input && ["pending", "registered", "approved", "rejected"].includes(input.registration_status)) {
      patch.registration_status = input.registration_status;
      if (input.registration_status === "approved") {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = profile.id;
      }
    }
    if ("menu_permissions" in input && input.menu_permissions && typeof input.menu_permissions === "object") {
      patch.menu_permissions = normalizeMenus(input.menu_permissions);
    }
    if ("social_handles" in input && input.social_handles && typeof input.social_handles === "object") {
      patch.social_handles = input.social_handles;
    }
    if (Object.keys(patch).length === 0) return { success: true as const };

    const { error } = await supabase.from("sm_campaign_members" as any).update(patch).eq("id", memberId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((member as any).campaign_id);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not update this assignment." };
  }
}

export async function removeCampaignMember(memberId: string) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    const supabase = createSupabaseServiceClient();

    const { data: member, error: readError } = await supabase
      .from("sm_campaign_members" as any)
      .select("id, campaign_id")
      .eq("id", memberId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!member) return { success: true as const };
    await assertCampaignAccess((member as any).campaign_id, profile);

    const { error } = await supabase.from("sm_campaign_members" as any).delete().eq("id", memberId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((member as any).campaign_id);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not remove this student." };
  }
}

// ---------------------------------------------------------
// Student registration & per-student menus
// ---------------------------------------------------------

/**
 * Students must clear this gate before the plan or the submit form opens for
 * them. `registered` means they filled in their details; only `approved` opens
 * access.
 */
export async function setMemberRegistration(memberId: string, status: "pending" | "registered" | "approved" | "rejected") {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    if (!["pending", "registered", "approved", "rejected"].includes(status)) {
      return { success: false as const, error: "Unknown registration state." };
    }
    const supabase = createSupabaseServiceClient();

    const { data: member, error: readError } = await supabase
      .from("sm_campaign_members" as any)
      .select("id, campaign_id")
      .eq("id", memberId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!member) return { success: false as const, error: "This assignment no longer exists." };
    await assertCampaignAccess((member as any).campaign_id, profile);

    const patch: any = { registration_status: status };
    if (status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = profile.id;
    } else {
      patch.approved_at = null;
      patch.approved_by = null;
    }

    const { error } = await supabase.from("sm_campaign_members" as any).update(patch).eq("id", memberId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((member as any).campaign_id);
    return { success: true as const, registration_status: status };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not update the registration." };
  }
}

/** Which campaign sections this individual student is allowed to open. */
export async function setMemberMenus(memberId: string, menus: Record<string, boolean>) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    const supabase = createSupabaseServiceClient();

    const { data: member, error: readError } = await supabase
      .from("sm_campaign_members" as any)
      .select("id, campaign_id")
      .eq("id", memberId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!member) return { success: false as const, error: "This assignment no longer exists." };
    await assertCampaignAccess((member as any).campaign_id, profile);

    const normalized = normalizeMenus(menus);
    const { error } = await supabase
      .from("sm_campaign_members" as any)
      .update({ menu_permissions: normalized })
      .eq("id", memberId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((member as any).campaign_id);
    return { success: true as const, menu_permissions: normalized };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not update this student's menus." };
  }
}

// ---------------------------------------------------------
// Day visibility — the teacher writes first, publishes after
// ---------------------------------------------------------

export async function setDayVisibility(dayId: string, visible: boolean) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    const supabase = createSupabaseServiceClient();

    const { data: day, error: readError } = await supabase
      .from("sm_campaign_days" as any)
      .select("id, campaign_id")
      .eq("id", dayId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!day) return { success: false as const, error: "This day no longer exists." };
    await assertCampaignAccess((day as any).campaign_id, profile);

    const { error } = await supabase
      .from("sm_campaign_days" as any)
      .update({
        visible_to_students: visible,
        published_to_students_at: visible ? new Date().toISOString() : null,
        published_to_students_by: visible ? profile.id : null,
      })
      .eq("id", dayId);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign((day as any).campaign_id);
    return { success: true as const, visible_to_students: visible };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not change who can see this day." };
  }
}

/**
 * Publishes the next `count` unpublished days (by day number). This is the
 * "show the student the next N days" control — the plan stays private until the
 * teacher is happy with it.
 */
export async function publishUpcomingDays(campaignId: string, count: number) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    await assertCampaignAccess(campaignId, profile);
    const supabase = createSupabaseServiceClient();

    const limit = Math.min(Math.max(Math.trunc(Number(count) || 0), 1), 60);
    const { data: hidden, error: readError } = await supabase
      .from("sm_campaign_days" as any)
      .select("id, day_number")
      .eq("campaign_id", campaignId)
      .eq("visible_to_students", false)
      .order("day_number")
      .limit(limit);
    if (readError) return { success: false as const, error: readError.message };

    const ids = ((hidden ?? []) as any[]).map((row) => row.id);
    if (ids.length === 0) {
      return { success: true as const, published: 0, message: "Every planned day is already visible to students." };
    }

    const { error } = await supabase
      .from("sm_campaign_days" as any)
      .update({
        visible_to_students: true,
        published_to_students_at: new Date().toISOString(),
        published_to_students_by: profile.id,
      })
      .in("id", ids);
    if (error) return { success: false as const, error: error.message };

    revalidateCampaign(campaignId);
    return { success: true as const, published: ids.length, dayIds: ids };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not publish these days." };
  }
}

// ---------------------------------------------------------
// Submission review — the teacher's pick
// ---------------------------------------------------------

export async function reviewSubmission(
  submissionId: string,
  input: { status: "approved" | "rejected" | "revision" | "selected"; feedback?: string; score?: number | null },
) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.approve");
    const supabase = createSupabaseServiceClient();

    const { data: submission, error: readError } = await supabase
      .from("sm_day_submissions" as any)
      .select("id, campaign_id, day_id, member_id, post_url, video_url")
      .eq("id", submissionId)
      .maybeSingle();
    if (readError) return { success: false as const, error: readError.message };
    if (!submission) return { success: false as const, error: "This submission no longer exists." };
    await assertCampaignAccess((submission as any).campaign_id, profile);

    const status = ["approved", "rejected", "revision", "selected"].includes(input?.status) ? input.status : "approved";
    const selected = status === "selected";

    if (selected) {
      // Only one winner per day.
      const { error: clearError } = await supabase
        .from("sm_day_submissions" as any)
        .update({ is_selected: false })
        .eq("day_id", (submission as any).day_id)
        .eq("is_selected", true);
      if (clearError) return { success: false as const, error: clearError.message };
    }

    const patch: any = {
      status,
      is_selected: selected,
      feedback: cleanText(input?.feedback),
      score: Number.isFinite(Number(input?.score)) && input?.score !== null ? Math.trunc(Number(input.score)) : null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("sm_day_submissions" as any).update(patch).eq("id", submissionId);
    if (error) return { success: false as const, error: error.message };

    // Picking the winner promotes their post link onto the day itself, so the
    // admin dashboard's "published" state and the plan stay in sync.
    if (selected) {
      const url = cleanText((submission as any).post_url) || cleanText((submission as any).video_url);
      const { error: dayError } = await supabase
        .from("sm_campaign_days" as any)
        .update({
          published_url: url,
          status: url ? "published" : "approved",
          teacher_status: "done",
          teacher_action_by: profile.id,
          teacher_action_at: new Date().toISOString(),
        })
        .eq("id", (submission as any).day_id);
      if (dayError) return { success: false as const, error: dayError.message };
    }

    revalidateCampaign((submission as any).campaign_id);
    return { success: true as const, status, is_selected: selected };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not review this submission." };
  }
}

// ---------------------------------------------------------
// Creating students directly from a campaign
// ---------------------------------------------------------

function normalizeEmail(value: any) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizePhone(value: any) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits.length >= 7 ? digits : null;
}

/**
 * Looks for an existing account before we create a new one. A match here means
 * "assign the account they already have" — never silently create a second
 * profile for the same person.
 */
export async function findStudentDuplicates(input: { email?: string; phone?: string }) {
  try {
    await requireCampaignAccess("social_campaigns.view");
    const supabase = createSupabaseServiceClient();
    const email = normalizeEmail(input?.email);
    const phone = normalizePhone(input?.phone);
    if (!email && !phone) return { success: true as const, matches: [] };

    const filters: string[] = [];
    if (email) filters.push(`email.ilike.${email}`);
    if (phone) filters.push(`phone.ilike.*${phone}*`);

    const { data, error } = await supabase
      .from("profiles" as any)
      .select("id, full_name, email, phone, role, status")
      .or(filters.join(","))
      .limit(10);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, matches: data ?? [] };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not check for duplicates." };
  }
}

/**
 * Creates a student account (login + password) and drops them straight into the
 * campaign as an approved member — no separate registration step for them.
 * Pass `use_existing_id` to attach an account that already exists instead.
 */
export async function createCampaignStudent(input: {
  campaign_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  drive_url?: string;
  use_existing_id?: string;
}) {
  let createdAuthUserId: string | null = null;

  try {
    const profile = await requireCampaignAccess("social_campaigns.edit");
    if (profile.role !== "admin") {
      return { success: false as const, error: "Only an admin can create student accounts." };
    }

    const campaignId = cleanText(input?.campaign_id);
    if (!campaignId) return { success: false as const, error: "Pick a campaign first." };
    await assertCampaignAccess(campaignId, profile);

    const supabase = createSupabaseServiceClient();

    // Path 1 — reuse an account that already exists.
    if (input?.use_existing_id) {
      const { data: existing, error: existingError } = await supabase
        .from("profiles" as any)
        .select("id, role, full_name")
        .eq("id", input.use_existing_id)
        .maybeSingle();
      if (existingError) return { success: false as const, error: existingError.message };
      if (!existing) return { success: false as const, error: "That account no longer exists." };
      if ((existing as any).role !== "student") {
        return { success: false as const, error: "That account is not a student account." };
      }

      const { data: member, error: memberError } = await supabase
        .from("sm_campaign_members" as any)
        .upsert(
          {
            campaign_id: campaignId,
            student_id: (existing as any).id,
            drive_url: cleanText(input.drive_url),
            status: "active",
            registration_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: profile.id,
            assigned_by: profile.id,
          },
          { onConflict: "campaign_id,student_id" },
        )
        .select("*, student:profiles!student_id ( id, full_name, email, phone )")
        .single();
      if (memberError) return { success: false as const, error: memberError.message };

      revalidateCampaign(campaignId);
      return { success: true as const, reused: true, member };
    }

    // Path 2 — brand new account.
    const fullName = cleanText(input?.full_name);
    const email = normalizeEmail(input?.email);
    const phone = normalizePhone(input?.phone);
    const password = String(input?.password ?? "");

    if (!fullName) return { success: false as const, error: "Student name is required." };
    if (!email) return { success: false as const, error: "A valid email address is required — the student logs in with it." };
    if (password.length < 8) return { success: false as const, error: "Password must be at least 8 characters." };

    const { data: duplicates, error: duplicateError } = await supabase
      .from("profiles" as any)
      .select("id, full_name, email, phone, role, status")
      .or(`email.ilike.${email}${phone ? `,phone.ilike.*${phone}*` : ""}`)
      .limit(5);
    if (duplicateError) return { success: false as const, error: duplicateError.message };

    if ((duplicates ?? []).length > 0) {
      return {
        success: false as const,
        duplicate: true,
        error: "An account already exists with this email or phone. Assign the existing one instead of creating a duplicate.",
        matches: duplicates,
      };
    }

    const { data: createdAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: "student" },
    });

    const authUser = createdAuthUser?.user;
    if (createAuthError || !authUser) {
      return { success: false as const, error: createAuthError?.message || "Could not create the login for this student." };
    }
    createdAuthUserId = authUser.id;

    const { error: profileError } = await supabase
      .from("profiles" as any)
      .upsert(
        { id: authUser.id, email, full_name: fullName, phone, role: "student", status: "approved" },
        { onConflict: "id" },
      );
    if (profileError) throw new Error(profileError.message);

    const { data: member, error: memberError } = await supabase
      .from("sm_campaign_members" as any)
      .upsert(
        {
          campaign_id: campaignId,
          student_id: authUser.id,
          drive_url: cleanText(input.drive_url),
          status: "active",
          registration_status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: profile.id,
          assigned_by: profile.id,
        },
        { onConflict: "campaign_id,student_id" },
      )
      .select("*, student:profiles!student_id ( id, full_name, email, phone )")
      .single();
    if (memberError) throw new Error(memberError.message);

    revalidateCampaign(campaignId);
    return { success: true as const, reused: false, member, login_email: email };
  } catch (error: any) {
    if (createdAuthUserId) {
      await createSupabaseServiceClient().auth.admin.deleteUser(createdAuthUserId).catch(() => null);
    }
    return { success: false as const, error: error?.message ?? "Could not create this student." };
  }
}
