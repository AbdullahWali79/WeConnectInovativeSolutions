/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Shared read helpers for the Social Media Campaigns workspace.
 *
 * These live outside the "use server" module on purpose: the page can call them
 * directly after it has already authenticated the request, so a first paint does
 * not pay for a second auth round trip + a client-side fetch waterfall.
 * They are only ever imported from server components / server actions.
 */

export type CampaignSummary = {
  id: string;
  client_name: string;
  campaign_name: string | null;
  period_start: string | null;
  period_end: string | null;
  goal: string | null;
  status: string;
  teacher_id: string | null;
  teacher_drive_url: string | null;
  drive_folder_url: string | null;
  created_at: string;
  teacher?: { full_name: string | null; email: string | null } | null;
  day_count: number;
  done_count: number;
  member_count: number;
};

export type CampaignTeacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

const CAMPAIGN_SELECT = `
  id, client_name, campaign_name, period_start, period_end, goal, status,
  teacher_id, teacher_drive_url, drive_folder_url, created_at,
  teacher:profiles!teacher_id ( full_name, email ),
  sm_campaign_days ( id, teacher_status, admin_status, post_date ),
  sm_campaign_members ( id, status )
`;

/** Shape the raw join rows into the flat summaries the UI renders. */
function toSummary(row: any): CampaignSummary {
  const days: any[] = row.sm_campaign_days ?? [];
  const members: any[] = row.sm_campaign_members ?? [];
  const done = days.filter(
    (day) => day.teacher_status === "done" || day.admin_status === "done",
  ).length;
  const { sm_campaign_days, sm_campaign_members, ...rest } = row;
  void sm_campaign_days;
  void sm_campaign_members;
  return {
    ...rest,
    day_count: days.length,
    done_count: done,
    member_count: members.filter((member) => member.status === "active").length,
  };
}

/**
 * Loads the campaign list and the teacher picker together.
 * One round trip for the caller instead of two authenticated server actions.
 */
export async function loadCampaignWorkspace(options: { teacherId?: string | null } = {}) {
  const supabase = createSupabaseServiceClient();

  let campaignQuery = supabase
    .from("sm_campaigns" as any)
    .select(CAMPAIGN_SELECT)
    .order("created_at", { ascending: false });

  if (options.teacherId) campaignQuery = campaignQuery.eq("teacher_id", options.teacherId);

  const [campaignResult, teacherResult] = await Promise.all([
    campaignQuery,
    supabase
      .from("profiles" as any)
      .select("id, full_name, email, phone, status")
      .eq("role", "teacher")
      .order("full_name"),
  ]);

  if (campaignResult.error) {
    return { success: false as const, error: campaignResult.error.message };
  }

  return {
    success: true as const,
    campaigns: ((campaignResult.data ?? []) as any[]).map(toSummary),
    teachers: ((teacherResult.data ?? []) as unknown) as CampaignTeacher[],
  };
}
