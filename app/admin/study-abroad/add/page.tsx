"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Icon } from "@/components/icon";

export default function AddOpportunityPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchLink = async () => {
    if (!link) {
      setError("Please enter a link first.");
      return;
    }
    
    setIsFetching(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/fetch-link-preview?url=${encodeURIComponent(link)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch link details");
      }
      
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.image) setImageUrl(data.image);
      
      if (!data.title && !data.description && !data.image) {
        setError("Could not extract data from this link. You may need to fill it manually.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching the link.");
    } finally {
      setIsFetching(false);
    }
  };

  const handlePublish = async () => {
    if (!title || !description) {
      setError("Title and Description are required.");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from("study_abroad_opportunities")
        .insert([
          {
            title,
            description,
            image_url: imageUrl,
            original_link: link,
            is_published: true,
          }
        ]);

      if (dbError) throw dbError;

      router.push("/admin/study-abroad/opportunities");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish opportunity.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Study Abroad Opportunity</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Paste a LinkedIn post link or manually enter the details of the opportunity.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-6">
          {/* Link Fetcher */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Post Link (LinkedIn etc.)</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className="w-full rounded-lg border p-2.5 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <button
              onClick={handleFetchLink}
              disabled={isFetching || !link}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isFetching ? (
                <Icon name="sync" className="animate-spin" />
              ) : (
                <Icon name="search" />
              )}
              Fetch
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <hr className="dark:border-gray-800" />

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Opportunity Title"
                className="w-full rounded-lg border p-2.5 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Featured Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border p-2.5 dark:border-gray-700 dark:bg-gray-800"
              />
              {imageUrl && (
                <div className="mt-2 h-40 w-full overflow-hidden rounded-lg border bg-gray-50 dark:border-gray-700 dark:bg-gray-800 sm:w-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description / Text <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full details of the opportunity..."
                rows={8}
                className="w-full rounded-lg border p-2.5 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {isPublishing ? (
                <Icon name="sync" className="animate-spin" />
              ) : (
                <Icon name="publish" />
              )}
              Publish Opportunity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
