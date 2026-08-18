import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";

export default async function StudentVideosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: videos } = await supabase
    .from("student_videos")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My Videos"
        description="Upload and manage your video submissions."
        action={
          <Link
            href="/student/videos/new"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary transition hover:brightness-110 md:w-auto md:px-6"
          >
            <Icon name="add" className="text-xl" />
            Submit New Video
          </Link>
        }
      />

      {!videos || videos.length === 0 ? (
        <EmptyState
          icon="videocam"
          title="No videos yet"
          description="You haven't submitted any videos yet. Click the button above to get started."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-outline/10">
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-bold text-on-surface line-clamp-2">{video.title}</h3>
                  <StatusPill value={video.status} />
                </div>
                {video.description && (
                  <p className="mb-4 text-sm text-on-surface-variant line-clamp-3">{video.description}</p>
                )}
                
                <div className="mt-auto pt-4 border-t border-outline/10">
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                  >
                    <Icon name="open_in_new" className="text-lg" />
                    Watch Video
                  </a>
                </div>
              </div>
              
              {video.admin_feedback && (
                <div className="bg-surface-variant p-4">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Feedback</p>
                  <p className="text-sm text-on-surface">{video.admin_feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
