import { CmsElement } from "@/components/cms/cms-element";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";
import { VideoGallery } from "./video-gallery";

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
    <CmsElement cmsId="fc68264a-0" as="div" className="min-h-screen bg-background text-on-background">
      <PublicHeader />
      
      <CmsElement cmsId="fc68264a-1" as="main" className="pt-24 pb-20 lg:pt-32">
        <CmsElement cmsId="fc68264a-2" as="div" className="mx-auto max-w-7xl px-4 md:px-6">
          <CmsElement cmsId="fc68264a-3" as="div" className="mb-12 text-center md:mb-16">
            <CmsElement cmsId="fc68264a-4" as="h1" className="mb-4 text-4xl font-bold tracking-tight text-on-background md:text-5xl lg:text-6xl">
              Student <CmsElement cmsId="fc68264a-5" as="span" className="text-primary">Videos</CmsElement>
            </CmsElement>
            <CmsElement cmsId="fc68264a-6" as="p" className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              Explore amazing video presentations and projects submitted by our talented students.
            </CmsElement>
          </CmsElement>

          {!videos || videos.length === 0 ? (
            <CmsElement cmsId="fc68264a-7" as="div" className="flex flex-col items-center justify-center rounded-3xl bg-surface p-12 text-center shadow-sm ring-1 ring-outline/10">
              <CmsElement cmsId="fc68264a-8" as="div" className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="videocam" className="text-3xl" />
              </CmsElement>
              <CmsElement cmsId="fc68264a-9" as="h2" className="mb-2 text-xl font-bold text-on-surface">No videos available</CmsElement>
              <CmsElement cmsId="fc68264a-10" as="p" className="max-w-md text-on-surface-variant">
                Check back later for new video submissions from our students.
              </CmsElement>
            </CmsElement>
          ) : (
            <VideoGallery videos={videos.map((video) => ({ id: video.id, title: video.title, video_url: video.video_url }))} />
          )}
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
