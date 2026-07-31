"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStudentVideoStatus } from "../actions";
import { Icon } from "@/components/icon";

import type { StudentVideo } from "@/lib/supabase/types";

export function ReviewForm({ video }: { video: StudentVideo }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(status: "approved" | "rejected" | "revision_required", formData: FormData) {
    setLoading(true);
    setError(null);

    const feedback = formData.get("feedback") as string;
    const result = await updateStudentVideoStatus(video.id, status, feedback);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-outline/10">
      <h3 className="mb-4 text-lg font-bold text-on-surface">Admin Review</h3>
      
      {error && (
        <div className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      <form action={(data) => handleReview(video.status === "submitted" ? "approved" : video.status, data)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="feedback" className="text-sm font-bold text-on-surface">
            Feedback (Optional)
          </label>
          <textarea
            id="feedback"
            name="feedback"
            rows={4}
            defaultValue={video.admin_feedback || ""}
            placeholder="Provide feedback to the student..."
            className="resize-y rounded-xl border-outline/20 bg-surface-lowest px-4 py-3 text-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              const form = e.currentTarget.closest('form');
              if (form) handleReview("approved", new FormData(form));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10b981] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Icon name="check_circle" className="text-lg" />
            Approve & Publish
          </button>
          
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              const form = e.currentTarget.closest('form');
              if (form) handleReview("revision_required", new FormData(form));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Icon name="rate_review" className="text-lg" />
            Request Revision
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              const form = e.currentTarget.closest('form');
              if (form) handleReview("rejected", new FormData(form));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Icon name="cancel" className="text-lg" />
            Reject
          </button>
        </div>
      </form>
    </div>
  );
}
