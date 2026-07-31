"use client";

import { PageHeader } from "@/components/page-header";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitStudentVideo } from "../actions";
import { Icon } from "@/components/icon";

export default function NewStudentVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await submitStudentVideo(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/student/videos");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Submit New Video"
        description="Share your video by providing a YouTube or Google Drive link."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-outline/10 md:p-8">
        {error && (
          <div className="rounded-xl bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-bold text-on-surface">
            Video Title <span className="text-error">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g., Final Project Demo"
            className="rounded-xl border-outline/20 bg-surface-lowest px-4 py-3 text-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="video_url" className="text-sm font-bold text-on-surface">
            Video URL <span className="text-error">*</span>
          </label>
          <input
            id="video_url"
            name="video_url"
            type="url"
            required
            placeholder="https://youtube.com/... or https://drive.google.com/..."
            className="rounded-xl border-outline/20 bg-surface-lowest px-4 py-3 text-sm focus:border-primary focus:ring-primary"
          />
          <p className="text-xs text-on-surface-variant">Please make sure the link is publicly accessible.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-bold text-on-surface">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Tell us a bit about this video..."
            className="resize-y rounded-xl border-outline/20 bg-surface-lowest px-4 py-3 text-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline/10 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? (
              <Icon name="progress_activity" className="animate-spin text-lg" />
            ) : (
              <Icon name="send" className="text-lg" />
            )}
            Submit Video
          </button>
        </div>
      </form>
    </div>
  );
}
