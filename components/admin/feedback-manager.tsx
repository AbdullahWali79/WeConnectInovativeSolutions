"use client";

import { useMemo, useState, useTransition } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { feedbackAudienceOptions, feedbackCategoriesByAudience, getFeedbackCategoryLabel } from "@/lib/feedback";
import type { FeedbackAudienceType, FeedbackEntry } from "@/lib/supabase/types";
import { deleteFeedback, moderateFeedback } from "@/app/feedback/actions";

type FeedbackRow = Pick<
  FeedbackEntry,
  "id" | "audience_type" | "category" | "name" | "email" | "phone" | "rating" | "title" | "message" | "status" | "reviewer_notes" | "created_at"
>;

type ReviewerForm = {
  notes: string;
};

export function FeedbackManager({ initialEntries, setupError }: { initialEntries: FeedbackRow[]; setupError?: string | null }) {
  const [entries, setEntries] = useState(initialEntries);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [forms, setForms] = useState<Record<string, ReviewerForm>>({});
  const [isPending, startTransition] = useTransition();
  const statusOptions = ["all", "pending", "approved", "rejected"];

  const categories = useMemo(() => {
    if (audienceFilter === "all") {
      return Array.from(new Set(feedbackAudienceOptions.flatMap((option) => feedbackCategoriesByAudience[option.value].map((item) => item.value))));
    }

    return feedbackCategoriesByAudience[audienceFilter as keyof typeof feedbackCategoriesByAudience].map((item) => item.value);
  }, [audienceFilter]);

  function resolveCategoryLabel(value: string) {
    if (audienceFilter === "all") {
      return feedbackAudienceOptions
        .flatMap((option) => feedbackCategoriesByAudience[option.value])
        .find((item) => item.value === value)?.label ?? value;
    }

    return getFeedbackCategoryLabel(audienceFilter as FeedbackAudienceType, value);
  }

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const statusMatch = statusFilter === "all" || entry.status === statusFilter;
        const audienceMatch = audienceFilter === "all" || entry.audience_type === audienceFilter;
        const categoryMatch = categoryFilter === "all" || entry.category === categoryFilter;
        return statusMatch && audienceMatch && categoryMatch;
      }),
    [audienceFilter, categoryFilter, entries, statusFilter],
  );

  function updateNotes(id: string, notes: string) {
    setForms((current) => ({ ...current, [id]: { notes } }));
  }

  function patchEntry(updated: FeedbackEntry) {
    setEntries((current) => current.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
  }

  function moderate(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setToast(null);

    startTransition(async () => {
      const result = await moderateFeedback(id, action, forms[id]?.notes ?? "");
      setBusyId(null);

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      patchEntry(result.data);
      setToast({
        type: "success",
        message: action === "approve" ? "Feedback approved and published." : "Feedback rejected.",
      });
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this feedback record?")) return;

    setBusyId(id);
    setToast(null);

    startTransition(async () => {
      const result = await deleteFeedback(id);
      setBusyId(null);

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setEntries((current) => current.filter((entry) => entry.id !== id));
      setToast({ type: "success", message: "Feedback deleted." });
    });
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="Moderation"
        title="Feedback review"
        description="Approve feedback from students and clients before it becomes public."
      />

      {setupError ? (
        <div className="mb-5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
          Feedback table is not ready yet. Database response: {setupError}
        </div>
      ) : null}

      <div className="mb-5 overflow-hidden rounded-3xl border border-primary/10 bg-[linear-gradient(135deg,rgba(238,244,255,0.92),rgba(255,255,255,0.96))] p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-primary">Filter bar</p>
            <p className="mt-1 text-sm font-semibold text-on-surface-variant">Slice feedback by status, audience, and category.</p>
          </div>
          <div className="rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-semibold text-on-surface-variant shadow-sm">
            Showing <span className="text-primary">{filteredEntries.length}</span> of <span className="text-primary">{entries.length}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[auto,auto,1fr]">
          <div className="space-y-2">
            <span className="wc-label">Status</span>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              {statusOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatusFilter(item)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    statusFilter === item
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant bg-white text-on-surface-variant hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="wc-label">Audience</span>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setAudienceFilter("all")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  audienceFilter === "all"
                    ? "bg-secondary-container text-on-secondary-fixed shadow-sm"
                    : "border border-outline-variant bg-white text-on-surface-variant hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                All Audiences
              </button>
              {feedbackAudienceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAudienceFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    audienceFilter === option.value
                      ? "bg-secondary-container text-on-secondary-fixed shadow-sm"
                      : "border border-outline-variant bg-white text-on-surface-variant hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="wc-label">Category</span>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  categoryFilter === "all"
                    ? "bg-surface-container-high text-on-surface shadow-sm"
                    : "border border-outline-variant bg-white text-on-surface-variant hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                All Categories
              </button>
              {categories.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategoryFilter(value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    categoryFilter === value
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant bg-white text-on-surface-variant hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {resolveCategoryLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState title="No feedback found" description="Try a different status, audience, or category filter." icon="reviews" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredEntries.map((entry) => {
            const form = forms[entry.id] ?? { notes: entry.reviewer_notes ?? "" };

            return (
              <article key={entry.id} className="wc-card overflow-hidden">
                <div className="border-b border-outline-variant/50 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">{entry.audience_type}</p>
                      <h3 className="mt-1 text-lg font-black text-on-surface">{entry.name}</h3>
                      <p className="text-xs text-on-surface-variant">{entry.email || entry.phone || "No contact provided"}</p>
                    </div>
                    <div className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-primary">
                      {entry.rating}/5
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-bold text-on-surface-variant">
                      {entry.status}
                    </span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                      {getFeedbackCategoryLabel(entry.audience_type, entry.category)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {entry.title ? <h4 className="text-base font-bold text-on-surface">{entry.title}</h4> : null}
                  <p className="text-sm leading-7 text-on-surface-variant">{entry.message}</p>

                  <label className="block">
                    <span className="wc-label">Reviewer notes</span>
                    <textarea
                      className="wc-input mt-2 min-h-24"
                      value={form.notes}
                      onChange={(event) => updateNotes(entry.id, event.target.value)}
                      placeholder="Optional internal note for approval or rejection"
                    />
                  </label>

                  <div className="flex flex-col gap-3 border-t border-outline-variant/50 pt-4 sm:flex-row">
                    <button
                      type="button"
                      disabled={busyId === entry.id || isPending}
                      onClick={() => moderate(entry.id, "approve")}
                      className="wc-primary-btn justify-center"
                    >
                      <Icon name="check" className="text-lg" />
                      {busyId === entry.id ? "Saving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === entry.id || isPending}
                      onClick={() => moderate(entry.id, "reject")}
                      className="wc-secondary-btn justify-center"
                      >
                      <Icon name="close" className="text-lg" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busyId === entry.id || isPending}
                      onClick={() => remove(entry.id)}
                      className="wc-secondary-btn justify-center"
                    >
                      <Icon name="delete" className="text-lg" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
