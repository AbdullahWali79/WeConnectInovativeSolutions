import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { StatusPill } from "@/components/status-pill";
import { ReviewForm } from "./review-form";

export default async function AdminVideoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: video } = await supabase
    .from("student_videos")
    .select(`
      *,
      student:profiles!student_id(full_name, email)
    `)
    .eq("id", id)
    .single();

  if (!video) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/videos" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary">
          <Icon name="arrow_back" className="text-[18px]" />
          Back to Videos
        </Link>
      </div>

      <PageHeader
        title="Review Video Submission"
        description={`Submitted by ${((video.student as unknown) as { full_name: string | null })?.full_name || "Unknown"} on ${new Date(video.created_at).toLocaleDateString()}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-outline/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{video.title}</h2>
              <StatusPill value={video.status} />
            </div>
            
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-on-surface-variant">Video Link</h3>
              <a
                href={video.video_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20"
              >
                <Icon name="open_in_new" className="text-[18px]" />
                Open Video
              </a>
            </div>

            {video.description && (
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-on-surface-variant">Description</h3>
                <p className="whitespace-pre-wrap text-sm text-on-surface">{video.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <ReviewForm video={video} />
          </div>
        </div>
      </div>
    </div>
  );
}
