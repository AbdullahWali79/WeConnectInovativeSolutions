import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StudentPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: enrollment } = user ? await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null };
  const { data: controls, error } = enrollment ? await supabase.from("course_student_menu_controls").select("*").eq("course_id", enrollment.course_id).eq("is_visible", true).order("sort_order") : { data: [], error: null };
  if (error) throw new Error("Unable to load assigned course features.");
  if (!controls?.some(row => row.menu_key === "dashboard")) {
    const first = controls?.find(row => row.menu_key !== "dashboard");
    if (first) redirect("/student/" + first.menu_key);
    // Campaign-only students have no course enrollment, so there are no menu
    // controls at all. Their hub is the campaign portal, not an error screen.
    const { data: memberships } = user
      ? await supabase.from("sm_campaign_members").select("id").eq("student_id", user.id).eq("status", "active").limit(1)
      : { data: [] };
    if ((memberships ?? []).length > 0) redirect("/student/campaigns");
    return <p className="wc-card p-5">No features are assigned to your course. Please contact your administrator.</p>;
  }
  const labels: Record<string, string> = { "ai-tools": "AI Tools", "seat-reservation": "Reserve a Seat", syllabus: "Syllabus", "talent-portfolio": "Talent Portfolio", "client-hunting": "Client Hunting", "social-media": "Social Media", "assigned-projects": "Assigned Projects", projects: "Projects", progress: "My Progress", profile: "My Profile", videos: "My Videos", "helping-videos": "Helping Videos", tasks: "Tasks / Add Task" };
  return <div className="space-y-6"><h1 className="text-3xl font-black">My Dashboard</h1><p className="text-on-surface-variant">Your assigned course features</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{controls?.filter(row => labels[row.menu_key]).map(row => <Link key={row.menu_key} href={"/student/" + row.menu_key} className="wc-card p-5 font-bold text-primary hover:shadow-lg">{labels[row.menu_key]}</Link>)}</div></div>;
}
