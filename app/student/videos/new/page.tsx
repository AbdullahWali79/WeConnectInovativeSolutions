"use client";

import { PageHeader } from "@/components/page-header";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitStudentVideo } from "../actions";
import { Icon } from "@/components/icon";
import { ProductVideoPreview } from "@/components/product-video-preview";

export default function NewStudentVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-outline/10 sm:p-6 md:gap-6 md:p-8">
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
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube, Google Drive, GitHub video file, or direct video URL"
            className="rounded-xl border-outline/20 bg-surface-lowest px-4 py-3 text-sm focus:border-primary focus:ring-primary"
          />
          <p className="text-xs text-on-surface-variant">YouTube, public Google Drive, or a public GitHub MP4/WebM file is supported. Make sure the link is publicly accessible.</p>
        </div>

        {videoUrl && (
          <div className="flex flex-col gap-2 rounded-2xl bg-surface-variant/30 p-4">
            <label className="text-sm font-bold text-on-surface">Video Preview</label>
            <div className="overflow-hidden rounded-xl border border-outline/10 shadow-sm">
              <ProductVideoPreview url={videoUrl} title="Video Preview" />
            </div>
          </div>
        )}

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

        <div className="grid grid-cols-2 gap-2 border-t border-outline/10 pt-5 sm:flex sm:items-center sm:justify-end sm:gap-3 sm:pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant disabled:opacity-50 sm:px-6"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-110 disabled:opacity-50 sm:px-6"
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
