import { redirect } from "next/navigation";
import { FeedbackManager } from "@/components/admin/feedback-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FeedbackEntry, Profile } from "@/lib/supabase/types";

export default async function AdminFeedbackPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/feedback");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/admin");
  }

  let setupError: string | null = null;
  const { data: feedbackData, error } = await supabase
    .from("feedback_entries")
    .select("id,audience_type,category,name,email,phone,rating,title,message,status,reviewer_notes,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    setupError = error.message;
  }

  const entries = (feedbackData ?? []) as Pick<
    FeedbackEntry,
    "id" | "audience_type" | "category" | "name" | "email" | "phone" | "rating" | "title" | "message" | "status" | "reviewer_notes" | "created_at"
  >[];

  return <FeedbackManager initialEntries={entries} setupError={setupError} />;
}
