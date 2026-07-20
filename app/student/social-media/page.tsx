import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { SocialFeed } from "@/components/social-media/social-feed";
import { SocialSubmitForm } from "@/components/social-media/social-submit-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getPakistanWeekRange, type SocialMediaPost, type SocialMediaReaction } from "@/lib/social-media";
import type { Profile } from "@/lib/supabase/types";

export default async function StudentSocialMediaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const supabaseAdmin = createSupabaseServiceClient();
  const { start, end } = getPakistanWeekRange();
  const [{ data: settings }, { data: posts }, { data: reactions }, { data: profiles }] = await Promise.all([
    supabase.from("social_media_settings").select("weekly_target").eq("id", true).maybeSingle(),
    supabase.from("social_media_posts").select("*").order("submitted_at", { ascending: false }).limit(100),
    supabase.from("social_media_reactions").select("*"),
    supabaseAdmin.from("profiles").select("id,full_name").eq("role", "student").eq("status", "approved"),
  ]);
  const weeklyTarget = settings?.weekly_target ?? 3;
  const allPosts = (posts ?? []) as SocialMediaPost[];
  const weeklyCount = allPosts.filter((post) => post.student_id === user.id && new Date(post.submitted_at) >= start && new Date(post.submitted_at) <= end).length;
  const remaining = Math.max(weeklyTarget - weeklyCount, 0);
  const percent = Math.min(Math.round((weeklyCount / weeklyTarget) * 100), 100);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, (profile as Pick<Profile, "id" | "full_name">).full_name ?? "Student"]));
  const feedPosts = allPosts.map((post) => ({ ...post, authorName: profileMap.get(post.student_id) ?? "Student" }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Weekly visibility" title="Social Media" description="Share your published work, complete the weekly target, and support posts from other students." />
      <section className={`rounded-lg border p-5 shadow-card ${remaining ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${remaining ? "bg-amber-500" : "bg-emerald-600"}`}><Icon name={remaining ? "campaign" : "verified"} /></div>
            <div><p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">This week</p><h2 className="mt-1 text-xl font-black text-on-surface">{remaining ? `${remaining} post${remaining === 1 ? "" : "s"} remaining` : "Weekly target achieved"}</h2><p className="mt-1 text-sm text-on-surface-variant">Monday to Sunday, Pakistan time</p></div>
          </div>
          <div className="min-w-64"><div className="flex justify-between text-sm font-black text-on-surface"><span>{weeklyCount}/{weeklyTarget} posts</span><span>{percent}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${remaining ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${percent}%` }} /></div></div>
        </div>
      </section>
      <SocialSubmitForm />
      <section><div className="mb-4"><h2 className="text-2xl font-black text-on-surface">Student community feed</h2><p className="mt-1 text-sm text-on-surface-variant">Open, support, and learn from posts shared by your peers.</p></div><SocialFeed posts={feedPosts} reactions={(reactions ?? []) as SocialMediaReaction[]} currentUserId={user.id} /></section>
    </div>
  );
}
