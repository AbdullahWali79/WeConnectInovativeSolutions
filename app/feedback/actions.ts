"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { FeedbackAudienceType, FeedbackEntry } from "@/lib/supabase/types";
import { requireAdminOnly } from "@/lib/admin-access";
import { feedbackCategoriesByAudience, normalizeFeedbackText } from "@/lib/feedback";

type ActionResult<T = null> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export type FeedbackInput = {
  audienceType: FeedbackAudienceType;
  category: string;
  name: string;
  email?: string;
  phone?: string;
  rating: number;
  title?: string;
  message: string;
};

function actionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function validateFeedbackInput(input: FeedbackInput): {
  audience_type: FeedbackAudienceType;
  category: string;
  name: string;
  email: string | null;
  phone: string | null;
  rating: number;
  title: string | null;
  message: string;
} {
  const audienceType = input.audienceType === "client" ? "client" : "student";
  const categories = feedbackCategoriesByAudience[audienceType].map((item) => item.value);
  const category = categories.includes(input.category) ? input.category : categories[0] || "other";
  const name = normalizeFeedbackText(input.name);
  const message = normalizeFeedbackText(input.message);
  const email = normalizeFeedbackText(input.email);
  const phone = normalizeFeedbackText(input.phone);
  const title = normalizeFeedbackText(input.title);
  const rating = Number.isFinite(input.rating) ? Math.max(1, Math.min(5, Math.floor(input.rating))) : 5;

  if (!name) throw new Error("Name is required.");
  if (!message) throw new Error("Feedback message is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");

  return { audience_type: audienceType, category, name, email: email || null, phone: phone || null, rating, title: title || null, message };
}

export async function submitFeedback(input: FeedbackInput): Promise<ActionResult<FeedbackEntry>> {
  try {
    const supabase = createSupabaseServiceClient();
    const payload = validateFeedbackInput(input);

    const { data, error } = await supabase
      .from("feedback_entries")
      .insert({
        ...payload,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Feedback could not be submitted.");
    }

    revalidatePath("/admin/feedback");

    return { success: true, data: data as FeedbackEntry, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to submit feedback.") };
  }
}

export async function moderateFeedback(
  feedbackId: string,
  action: "approve" | "reject",
  reviewerNotes?: string,
): Promise<ActionResult<FeedbackEntry>> {
  try {
    const admin = await requireAdminOnly();
    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const notes = normalizeFeedbackText(reviewerNotes) || null;

    const updatePayload =
      action === "approve"
        ? {
            status: "approved" as const,
            reviewer_notes: notes,
            reviewed_by: admin.id,
            reviewed_at: now,
            published_at: now,
            updated_at: now,
          }
        : {
            status: "rejected" as const,
            reviewer_notes: notes,
            reviewed_by: admin.id,
            reviewed_at: now,
            updated_at: now,
          };

    const { data, error } = await supabase
      .from("feedback_entries")
      .update(updatePayload)
      .eq("id", feedbackId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Feedback could not be updated.");
    }

    revalidatePath("/admin/feedback");
    revalidatePath("/testimonials");

    return { success: true, data: data as FeedbackEntry, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update feedback.") };
  }
}

export async function deleteFeedback(feedbackId: string): Promise<ActionResult<null>> {
  try {
    await requireAdminOnly();
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from("feedback_entries").delete().eq("id", feedbackId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/feedback");
    revalidatePath("/testimonials");

    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to delete feedback.") };
  }
}
