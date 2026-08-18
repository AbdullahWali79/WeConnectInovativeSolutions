"use server";

import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ActivityReportRow = {
  studentId: string;
  studentName: string;
  email: string;
  date: string;
  firstSeenAt: string;
  lastSeenAt: string;
  activeSeconds: number;
  pageViews: number;
  submitActions: number;
};

export type ActivityEventRow = {
  id: number;
  studentId: string;
  studentName: string;
  eventType: "page_view" | "submit";
  path: string;
  label: string | null;
  occurredAt: string;
};

export async function getStudentActivityReport(input: { from: string; to: string; studentId?: string }) {
  await requireAdminOnly();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to) || input.from > input.to) {
    throw new Error("Select a valid date range.");
  }

  const supabase = createSupabaseServiceClient();
  let dailyQuery = supabase.from("student_activity_daily").select("*")
    .gte("activity_date", input.from).lte("activity_date", input.to)
    .order("activity_date", { ascending: false });
  let eventsQuery = supabase.from("student_activity_events").select("*")
    .gte("occurred_at", `${input.from}T00:00:00+05:00`)
    .lte("occurred_at", `${input.to}T23:59:59.999+05:00`)
    .order("occurred_at", { ascending: false }).limit(5000);
  if (input.studentId) {
    dailyQuery = dailyQuery.eq("student_id", input.studentId);
    eventsQuery = eventsQuery.eq("student_id", input.studentId);
  }

  const [dailyResult, eventsResult, profilesResult] = await Promise.all([
    dailyQuery,
    eventsQuery,
    supabase.from("profiles").select("id,full_name,email").eq("role", "student").order("full_name"),
  ]);
  const error = dailyResult.error || eventsResult.error || profilesResult.error;
  if (error) throw new Error(error.message);

  const profiles = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name?.trim() || "Unnamed student",
    email: profile.email?.trim() || "",
  }));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const rows: ActivityReportRow[] = (dailyResult.data ?? []).map((row) => {
    const profile = profileById.get(row.student_id);
    return {
      studentId: row.student_id,
      studentName: profile?.name || "Unknown student",
      email: profile?.email || "",
      date: row.activity_date,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      activeSeconds: row.active_seconds,
      pageViews: row.page_views,
      submitActions: row.submit_actions,
    };
  });
  const events: ActivityEventRow[] = (eventsResult.data ?? []).map((event) => ({
    id: event.id,
    studentId: event.student_id,
    studentName: profileById.get(event.student_id)?.name || "Unknown student",
    eventType: event.event_type,
    path: event.path,
    label: event.label,
    occurredAt: event.occurred_at,
  }));
  return { rows, events, profiles };
}
