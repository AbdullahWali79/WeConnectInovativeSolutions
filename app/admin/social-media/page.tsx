import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import Link from "next/link";
import { AdminSocialTarget } from "@/components/social-media/admin-social-target";
import { SocialTodayReportButton } from "@/components/social-media/social-today-report";
import { SocialFeed } from "@/components/social-media/social-feed";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPakistanWeekRange, type SocialMediaPost, type SocialMediaReaction } from "@/lib/social-media";
import type { Profile, StudentFeeRecord } from "@/lib/supabase/types";

export default async function AdminSocialMediaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { start, end } = getPakistanWeekRange();
  const [{ data: settings }, { data: posts }, { data: reactions }, { data: students }, { data: activeEnrollments }] = await Promise.all([
    supabase.from("social_media_settings").select("weekly_target").eq("id", true).maybeSingle(),
    supabase.from("social_media_posts").select("*").order("submitted_at", { ascending: false }).limit(200),
    supabase.from("social_media_reactions").select("*"),
    supabase.from("profiles").select("id,full_name,email,client_hunting_specialization").eq("role", "student").eq("status", "approved"),
    supabase.from("enrollments").select("student_id,course_id").eq("status", "active"),
  ]);
  const target = settings?.weekly_target ?? 3;
  const allPosts = (posts ?? []) as SocialMediaPost[];
  const activeStudentIdsForFees = Array.from(new Set((activeEnrollments ?? []).map((enrollment) => enrollment.student_id)));
  const activeCourseIds = Array.from(new Set((activeEnrollments ?? []).map((enrollment) => enrollment.course_id)));
  const feeResult = activeStudentIdsForFees.length && activeCourseIds.length
    ? await supabase
        .from("student_fee_records")
        .select("student_id,course_id,status,updated_at")
        .in("student_id", activeStudentIdsForFees)
        .in("course_id", activeCourseIds)
        .order("updated_at", { ascending: false })
    : { data: [], error: null };
  if (feeResult.error) throw new Error(feeResult.error.message);
  const latestFeeByEnrollment = new Map<string, Pick<StudentFeeRecord, "student_id" | "course_id" | "status" | "updated_at">>();
  for (const fee of (feeResult.data ?? []) as Pick<StudentFeeRecord, "student_id" | "course_id" | "status" | "updated_at">[]) {
    const key = `${fee.student_id}:${fee.course_id}`;
    if (!latestFeeByEnrollment.has(key)) latestFeeByEnrollment.set(key, fee);
  }
  const paidActiveStudentIds = new Set(
    (activeEnrollments ?? [])
      .filter((enrollment) => {
        const fee = latestFeeByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`);
        return fee?.status === "paid" || fee?.status === "waived";
      })
      .map((enrollment) => enrollment.student_id),
  );
  const activeStudents = ((students ?? []) as Pick<Profile, "id" | "full_name" | "email" | "client_hunting_specialization">[]).filter((student) => paidActiveStudentIds.has(student.id));
  const counts = new Map<string, number>();
  for (const post of allPosts) if (new Date(post.submitted_at) >= start && new Date(post.submitted_at) <= end) counts.set(post.student_id, (counts.get(post.student_id) ?? 0) + 1);
  const statusRows = activeStudents.map((student) => ({ ...student, submitted: counts.get(student.id) ?? 0 })).sort((a, b) => a.submitted - b.submitted);
  const achieved = statusRows.filter((row) => row.submitted >= target).length;
  const incomplete = statusRows.length - achieved;
  const notStarted = statusRows.filter((row) => row.submitted === 0).length;
  const profileMap = new Map(activeStudents.map((profile) => [profile.id, profile.full_name ?? profile.email ?? "Student"]));
  const feedPosts = allPosts.map((post) => ({ ...post, authorName: profileMap.get(post.student_id) ?? "Student" }));
  const reportRows = statusRows.map((row) => ({ name: row.full_name ?? row.email ?? "Student", submitted: row.submitted }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Accountability" title="Social Media" description="Set the weekly posting target, identify students who are behind, and review the shared community feed." />
      <details open className="group overflow-hidden rounded-lg border border-outline-variant bg-white shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-container-low [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-xl font-black text-on-surface">Community feed</h2>
            <p className="text-sm text-on-surface-variant">{feedPosts.length} student submissions · newest posts first</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary"><Icon name="expand_more" className="transition-transform duration-200 group-open:rotate-180" /></span>
        </summary>
        <div className="border-t border-outline-variant bg-background p-4 sm:p-5">
          <SocialFeed posts={feedPosts} reactions={(reactions ?? []) as SocialMediaReaction[]} currentUserId={user.id} canDelete />
        </div>
      </details>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className="min-w-0 flex-1"><AdminSocialTarget initialTarget={target} /></div>
        <SocialTodayReportButton rows={reportRows} target={target} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Paid active students" value={statusRows.length} icon="groups" />
        <Stat label="Target achieved" value={achieved} icon="verified" tone="green" />
        <Stat label="Target incomplete" value={incomplete} icon="warning" tone="amber" />
        <Stat label="No posts" value={notStarted} icon="block" tone="red" />
      </div>
      <details className="group overflow-hidden rounded-lg border border-outline-variant bg-white shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-container-low [&::-webkit-details-marker]:hidden">
          <div><h2 className="text-xl font-black text-on-surface">Current week status</h2><p className="text-sm text-on-surface-variant">{incomplete} incomplete · {achieved} achieved</p></div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary"><Icon name="expand_more" className="transition-transform duration-200 group-open:rotate-180" /></span>
        </summary>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Specialization</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Remaining</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{statusRows.map((row) => { const remaining = Math.max(target - row.submitted, 0); const detailsHref = `/admin/social-media/${row.id}`; return <tr key={row.id} className={`border-t border-outline-variant ${remaining ? "bg-amber-50/70" : ""}`}><td className="px-5 py-4"><Link href={detailsHref} className="font-black text-primary hover:underline">{row.full_name ?? "Student"}</Link><p className="text-xs text-on-surface-variant">{row.email}</p></td><td className="px-5 py-4 text-on-surface-variant">{row.client_hunting_specialization?.replaceAll("_", " ") ?? "Not set"}</td><td className="px-5 py-4"><Link href={detailsHref} className="inline-flex items-center gap-1 font-black text-primary hover:underline">{row.submitted}/{target}<Icon name="arrow_forward" className="text-sm" /></Link></td><td className="px-5 py-4 font-black text-on-surface">{remaining}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${remaining ? row.submitted ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{remaining ? row.submitted ? "In progress" : "Not started" : "Achieved"}</span></td></tr>; })}</tbody></table></div>
      </details>
    </div>
  );
}

function Stat({ label, value, icon, tone = "blue" }: { label: string; value: number; icon: string; tone?: "blue" | "green" | "amber" | "red" }) {
  const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700" };
  return <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-card"><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[tone]}`}><Icon name={icon} /></div><p className="mt-4 text-sm font-bold text-on-surface-variant">{label}</p><p className="mt-1 text-3xl font-black text-on-surface">{value}</p></div>;
}
