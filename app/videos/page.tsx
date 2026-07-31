import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";

export const metadata = {
  title: "Student Videos - WeConnect",
  description: "Watch amazing video presentations and projects submitted by our talented students.",
};

export default async function PublicVideosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: videos } = await supabase
    .from("student_videos")
    .select(`
      *,
      student:profiles!student_id(full_name)
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background text-on-background">
      <PublicHeader />
      
      <main className="pt-24 pb-20 lg:pt-32">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center md:mb-16">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-on-background md:text-5xl lg:text-6xl">
              Student <span className="text-primary">Videos</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              Explore amazing video presentations and projects submitted by our talented students.
            </p>
          </div>

          {!videos || videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-surface p-12 text-center shadow-sm ring-1 ring-outline/10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="videocam" className="text-3xl" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-on-surface">No videos available</h2>
              <p className="max-w-md text-on-surface-variant">
                Check back later for new video submissions from our students.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <div key={video.id} className="group relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-outline/10 transition-all hover:shadow-md hover:ring-primary/20">
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                    </div>
                    
                    {video.description && (
                      <p className="mb-6 text-sm text-on-surface-variant line-clamp-3">
                        {video.description}
                      </p>
                    )}

                    <div className="mt-auto border-t border-outline/10 pt-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                          {(((video.student as unknown) as { full_name: string | null })?.full_name || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{((video.student as unknown) as { full_name: string | null })?.full_name || "Student"}</p>
                          <p className="text-xs text-on-surface-variant">WeConnect Student</p>
                        </div>
                      </div>

                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-110"
                      >
                        <Icon name="play_arrow" className="text-[20px]" />
                        Watch Video
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
