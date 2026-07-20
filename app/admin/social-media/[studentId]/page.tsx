import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { SocialFeed } from "@/components/social-media/social-feed";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPakistanWeekRange, type SocialMediaPost, type SocialMediaReaction } from "@/lib/social-media";
import type { Profile } from "@/lib/supabase/types";

export default async function StudentSocialPostHistoryPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: student }, { data: posts }, { data: reactions }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,client_hunting_specialization").eq("id", studentId).eq("role", "student").maybeSingle(),
    supabase.from("social_media_posts").select("*").eq("student_id", studentId).order("submitted_at", { ascending: false }),
    supabase.from("social_media_reactions").select("*"),
    supabase.from("social_media_settings").select("weekly_target").eq("id", true).maybeSingle(),
  ]);
  if (!student) notFound();

  const profile = student as Pick<Profile, "id" | "full_name" | "email" | "client_hunting_specialization">;
  const allPosts = (posts ?? []) as SocialMediaPost[];
  const { start, end } = getPakistanWeekRange();
  const weeklyCount = allPosts.filter((post) => new Date(post.submitted_at) >= start && new Date(post.submitted_at) <= end).length;
  const target = settings?.weekly_target ?? 3;
  const feedPosts = allPosts.map((post) => ({ ...post, authorName: profile.full_name ?? profile.email ?? "Student" }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student post history"
        title={profile.full_name ?? "Student"}
        description={`${profile.email ?? "No email"} · ${profile.client_hunting_specialization?.replaceAll("_", " ") ?? "Specialization not set"}`}
        action={<Link href="/admin/social-media" className="wc-secondary-btn"><Icon name="arrow_back" />Back to overview</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="All posts" value={allPosts.length} icon="dynamic_feed" />
        <Stat label="This week" value={`${weeklyCount}/${target}`} icon="calendar_today" />
        <Stat label="Remaining" value={Math.max(target - weeklyCount, 0)} icon="flag" />
      </div>
      <section>
        <div className="mb-4"><h2 className="text-2xl font-black text-on-surface">Submitted posts</h2><p className="mt-1 text-sm text-on-surface-variant">Click any featured image or Open post to view it on the original social platform.</p></div>
        <SocialFeed posts={feedPosts} reactions={(reactions ?? []) as SocialMediaReaction[]} currentUserId={user.id} canDelete />
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-card"><Icon name={icon} className="text-2xl text-primary" /><p className="mt-3 text-sm font-bold text-on-surface-variant">{label}</p><p className="mt-1 text-3xl font-black text-on-surface">{value}</p></div>;
}
