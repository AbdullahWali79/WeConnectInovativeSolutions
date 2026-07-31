import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Icon } from "@/components/icon";

export default async function AdminVideosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: videos } = await supabase
    .from("student_videos")
    .select(`
      *,
      student:profiles!student_id(full_name, email)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Student Videos"
        description="Review and manage video submissions from students."
      />

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-outline/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-variant text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 font-bold">Student</th>
                <th className="px-6 py-4 font-bold">Title</th>
                <th className="px-6 py-4 font-bold">Submitted Date</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10 bg-surface">
              {!videos || videos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                    No videos found.
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id} className="transition hover:bg-surface-variant/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{((video.student as unknown) as { full_name: string | null })?.full_name || "Unknown"}</p>
                      <p className="text-xs text-on-surface-variant">{((video.student as unknown) as { email: string | null })?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-on-surface max-w-[200px] truncate">{video.title}</p>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(video.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={video.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/videos/${video.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-3 py-1.5 text-xs font-bold text-on-primary-container transition hover:brightness-105"
                      >
                        <Icon name="visibility" className="text-sm" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
