"use client";
import { CmsElement } from "@/components/cms/cms-element";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import {
  feedbackAudienceOptions,
  feedbackCategoriesByAudience,
  getDefaultFeedbackCategory,
  type FeedbackFormAudience,
} from "@/lib/feedback";
import { submitFeedback } from "@/app/feedback/actions";

const ratingOptions = [1, 2, 3, 4, 5];

type FeedbackFormState = {
  audienceType: FeedbackFormAudience;
  category: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  message: string;
  rating: number;
};

function createInitialState(): FeedbackFormState {
  return {
    audienceType: "student",
    category: getDefaultFeedbackCategory("student"),
    name: "",
    email: "",
    phone: "",
    title: "",
    message: "",
    rating: 5,
  };
}

export function FeedbackForm() {
  const [form, setForm] = useState<FeedbackFormState>(() => createInitialState());
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const categories = useMemo(() => feedbackCategoriesByAudience[form.audienceType], [form.audienceType]);

  function updateField<K extends keyof FeedbackFormState>(key: K, value: FeedbackFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleAudienceChange(value: FeedbackFormAudience) {
    setForm((current) => ({
      ...current,
      audienceType: value,
      category: getDefaultFeedbackCategory(value),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    startTransition(async () => {
      const result = await submitFeedback({
        audienceType: form.audienceType,
        category: form.category,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        title: form.title || undefined,
        rating: form.rating,
        message: form.message,
      });

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setToast({ type: "success", message: "Feedback submitted. It will appear after admin approval." });
      setForm(createInitialState());
    });
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <CmsElement cmsId="7de6de05-0" as="div" className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="wc-card space-y-5 p-5 md:p-6">
          <CmsElement cmsId="7de6de05-1" as="div">
            <CmsElement cmsId="7de6de05-2" as="div" className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Icon name="chat" className="text-sm" /> Share Your Story
            </CmsElement>
            <CmsElement cmsId="7de6de05-3" as="h2" className="text-2xl font-black text-on-surface">Send feedback as student or client</CmsElement>
            <CmsElement cmsId="7de6de05-4" as="p" className="mt-2 text-sm leading-6 text-on-surface-variant">
              Pick your role, choose a category, and submit a review. Admin approval is required before it appears publicly.
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="7de6de05-5" as="div" className="grid gap-4 md:grid-cols-2">
            <CmsElement cmsId="7de6de05-6" as="label" className="block">
              <CmsElement cmsId="7de6de05-7" as="span" className="wc-label">Your role</CmsElement>
              <select
                className="wc-input mt-2"
                value={form.audienceType}
                onChange={(event) => handleAudienceChange(event.target.value as FeedbackFormAudience)}
              >
                {feedbackAudienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </CmsElement>

            <CmsElement cmsId="7de6de05-8" as="label" className="block">
              <CmsElement cmsId="7de6de05-9" as="span" className="wc-label">Category</CmsElement>
              <select
                className="wc-input mt-2"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              >
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="7de6de05-10" as="div" className="grid gap-4 md:grid-cols-2">
            <CmsElement cmsId="7de6de05-11" as="label" className="block">
              <CmsElement cmsId="7de6de05-12" as="span" className="wc-label">Your name</CmsElement>
              <input className="wc-input mt-2" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Enter your name" required />
            </CmsElement>

            <CmsElement cmsId="7de6de05-13" as="label" className="block">
              <CmsElement cmsId="7de6de05-14" as="span" className="wc-label">Email</CmsElement>
              <input className="wc-input mt-2" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" />
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="7de6de05-15" as="div" className="grid gap-4 md:grid-cols-2">
            <CmsElement cmsId="7de6de05-16" as="label" className="block">
              <CmsElement cmsId="7de6de05-17" as="span" className="wc-label">Phone</CmsElement>
              <input className="wc-input mt-2" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="03xx-xxxxxxx" />
            </CmsElement>

            <CmsElement cmsId="7de6de05-18" as="label" className="block">
              <CmsElement cmsId="7de6de05-19" as="span" className="wc-label">Title</CmsElement>
              <input className="wc-input mt-2" value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Short headline" />
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="7de6de05-20" as="label" className="block">
            <CmsElement cmsId="7de6de05-21" as="span" className="wc-label">Your feedback</CmsElement>
            <textarea
              className="wc-input mt-2 min-h-40"
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder="Tell us about your experience..."
              required
            />
          </CmsElement>

          <CmsElement cmsId="7de6de05-22" as="div">
            <CmsElement cmsId="7de6de05-23" as="span" className="wc-label">Your rating</CmsElement>
            <CmsElement cmsId="7de6de05-24" as="div" className="mt-3 flex items-center gap-2">
              {ratingOptions.map((rating) => (
                <CmsElement cmsId="7de6de05-25" as="button" instance={String(rating)}
                  key={rating}
                  type="button"
                  onClick={() => updateField("rating", rating)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
                    form.rating >= rating ? "border-[var(--wc-secondary)] bg-[var(--wc-secondary)]/10 text-[#D98700]" : "border-outline-variant bg-white text-on-surface-variant"
                  }`}
                  aria-label={`${rating} stars`}
                >
                  <Icon name="star" className="text-lg" />
                </CmsElement>
              ))}
              <CmsElement cmsId="7de6de05-26" as="span" className="ml-2 text-sm font-bold text-on-surface-variant">{form.rating}/5</CmsElement>
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="7de6de05-27" as="div" className="flex flex-col gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:items-center sm:justify-between">
            <CmsElement cmsId="7de6de05-28" as="p" className="text-sm text-on-surface-variant">
              Your feedback will appear on the public page after admin approval.
            </CmsElement>
            <CmsElement cmsId="7de6de05-29" as="button" disabled={isPending} className="wc-primary-btn">
              <Icon name="send" className="text-lg" />
              {isPending ? "Submitting..." : "Submit Feedback"}
            </CmsElement>
          </CmsElement>
        </form>

        <CmsElement cmsId="7de6de05-30" as="aside" className="wc-card p-5 md:p-6">
          <CmsElement cmsId="7de6de05-31" as="div" className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon name="favorite" className="text-3xl" />
          </CmsElement>
          <CmsElement cmsId="7de6de05-32" as="h3" className="text-xl font-black text-on-surface">Why your feedback matters</CmsElement>
          <CmsElement cmsId="7de6de05-33" as="p" className="mt-3 text-sm leading-6 text-on-surface-variant">
            Approved feedback helps students trust the platform and helps our team improve training, delivery, and support.
          </CmsElement>
          <CmsElement cmsId="7de6de05-34" as="div" className="mt-6 space-y-3">
            {[
              "Student and client categories",
              "Admin approval before publishing",
              "Category-wise public display",
              "Useful for testimonials and trust building",
            ].map((item) => (
              <CmsElement cmsId="7de6de05-35" as="div" instance={String(item)} key={item} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface">
                <CmsElement cmsId="7de6de05-36" as="span" className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="check" className="text-base" />
                </CmsElement>
                <CmsElement cmsId="7de6de05-37" as="span">{item}</CmsElement>
              </CmsElement>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </>
  );
}
