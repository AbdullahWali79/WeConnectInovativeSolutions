import type { FeedbackAudienceType } from "@/lib/supabase/types";

export type FeedbackCategoryOption = {
  value: string;
  label: string;
};

export type FeedbackFormAudience = FeedbackAudienceType;

export const feedbackAudienceOptions: Array<{ value: FeedbackAudienceType; label: string; description: string }> = [
  { value: "student", label: "Student", description: "For enrolled learners, trainees, and applicants." },
  { value: "client", label: "Client", description: "For customers, partners, and project clients." },
];

export const feedbackCategoriesByAudience: Record<FeedbackAudienceType, FeedbackCategoryOption[]> = {
  student: [
    { value: "course", label: "Course experience" },
    { value: "mentor", label: "Mentor support" },
    { value: "task_review", label: "Task review" },
    { value: "internship", label: "Internship experience" },
    { value: "support", label: "Support" },
    { value: "other", label: "Other" },
  ],
  client: [
    { value: "project_delivery", label: "Project delivery" },
    { value: "communication", label: "Communication" },
    { value: "design", label: "Design quality" },
    { value: "support", label: "Support" },
    { value: "partnership", label: "Partnership" },
    { value: "other", label: "Other" },
  ],
};

export function getFeedbackCategoryLabel(audienceType: FeedbackAudienceType, category: string) {
  return feedbackCategoriesByAudience[audienceType].find((item) => item.value === category)?.label ?? category;
}

export function normalizeFeedbackText(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function getDefaultFeedbackCategory(audienceType: FeedbackAudienceType) {
  return feedbackCategoriesByAudience[audienceType][0]?.value ?? "other";
}

