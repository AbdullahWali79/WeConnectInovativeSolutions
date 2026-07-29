import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { Icon } from "@/components/icon";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Course, CourseTopic } from "@/lib/supabase/types";

export default async function AdminSyllabusPage() {
  const access = await requirePermissionPage("/admin/syllabus", "courses.view");

  if (!access.granted) {
    return <AccessDenied description="Syllabus access has not been enabled for this teacher account." />;
  }

  const supabase = await createSupabaseServerClient();
  const [coursesResult, topicsResult] = await Promise.all([
    supabase.from("courses").select("*").order("title"),
    supabase.from("course_topics").select("*").order("day_number"),
  ]);

  const courses = (coursesResult.data ?? []) as Course[];
  const topics = (topicsResult.data ?? []) as CourseTopic[];

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Academic roadmap</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Syllabus</h1>
        <p className="mt-3 max-w-3xl text-base text-on-surface-variant md:text-lg">
          Review the topic-by-topic roadmap and learning resources for every course.
        </p>
      </header>

      {courses.length === 0 ? (
        <section className="rounded-lg border border-outline-variant bg-surface p-8 text-center">
          <Icon name="menu_book" className="text-5xl text-primary" />
          <h2 className="mt-4 text-xl font-bold">No syllabus available</h2>
          <p className="mt-2 text-on-surface-variant">Create a course first, then add its syllabus topics.</p>
        </section>
      ) : (
        <div className="space-y-5">
          {courses.map((course) => {
            const courseTopics = topics.filter((topic) => topic.course_id === course.id);

            return (
              <details key={course.id} className="group overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                  <div>
                    <h2 className="text-xl font-extrabold">{course.title}</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">{courseTopics.length} syllabus topics</p>
                  </div>
                  <Icon name="expand_more" className="text-2xl transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-outline-variant p-5">
                  {courseTopics.length === 0 ? (
                    <p className="rounded-lg bg-surface-container-low p-4 text-on-surface-variant">
                      No syllabus topics have been added for this course.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {courseTopics.map((topic) => (
                        <article key={topic.id} className="grid gap-4 rounded-lg border border-outline-variant p-4 md:grid-cols-[4rem_minmax(0,1fr)_auto] md:items-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary font-extrabold text-on-primary">
                            {String(topic.day_number).padStart(2, "0")}
                          </div>
                          <div>
                            <h3 className="font-bold">{topic.title}</h3>
                            {topic.practice_project ? (
                              <p className="mt-1 text-sm text-on-surface-variant">
                                <span className="font-bold text-on-surface">Practice:</span> {topic.practice_project}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {topic.english_video ? <ResourceLink href={topic.english_video} label="English" /> : null}
                            {topic.urdu_video ? <ResourceLink href={topic.urdu_video} label="Urdu/Hindi" /> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container"
    >
      <Icon name="play_circle" />
      {label}
    </Link>
  );
}
