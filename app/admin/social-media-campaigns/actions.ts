/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requirePermission } from "@/lib/admin-access";

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

function revalidateCampaign(campaignId?: string) {
  revalidatePath("/admin/social-media-campaigns");
  if (campaignId) revalidatePath(`/admin/social-media-campaigns/${campaignId}`);
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
    const supabase = createSupabaseServiceClient();

    let query = supabase
      .from("sm_campaigns" as any)
      .select(`
        id, client_name, campaign_name, period_start, period_end, goal, status,
        teacher_id, teacher_drive_url, drive_folder_url, created_at,
        teacher:profiles!teacher_id ( full_name, email ),
        sm_campaign_days ( id, teacher_status, admin_status, post_date ),
        sm_campaign_members ( id, status )
      `)
      .order("created_at", { ascending: false });

    if (isTeacher(profile)) query = query.eq("teacher_id", profile.id);

    const { data, error } = await query;
    if (error) return { success: false as const, error: error.message };

    const campaigns = ((data ?? []) as any[]).map((row) => {
      const days: any[] = row.sm_campaign_days ?? [];
      const members: any[] = row.sm_campaign_members ?? [];
      const done = days.filter((day) => day.teacher_status === "done" || day.admin_status === "done").length;
      return {
        ...row,
        day_count: days.length,
        done_count: done,
        member_count: members.filter((member) => member.status === "active").length,
        sm_campaign_days: undefined,
        sm_campaign_members: undefined,
      };
    });

    return { success: true as const, campaigns };
  } catch (error: any) {
    return { success: false as const, error: error?.message ?? "Could not load campaigns." };
  }
}

export async function fetchCampaignDetail(campaignId: string) {
  try {
    const profile = await requireCampaignAccess("social_campaigns.view");
    await assertCampaignAccess(campaignId, profile);
    const supabase = createSupabaseServiceClient();

    const [{ data: campaign, error: campaignError }, { data: days, error: dayError }, { data: members, error: memberError }] =
      await Promise.all([
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
      ]);

    const error = campaignError || dayError || memberError;
    if (error) return { success: false as const, error: error.message };
    if (!campaign) return { success: false as const, error: "This campaign no longer exists." };

    return {
      success: true as const,
      campaign,
      days: days ?? [],
      members: members ?? [],
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
