import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Course, CourseTopic, Enrollment } from "@/lib/supabase/types";

export default async function StudentCoursesPage() {
  return <StudentCourseRoadmap heading="My Courses" nextPath="/student/courses" />;
}

export async function StudentCourseRoadmap({
  heading,
  nextPath,
}: {
  heading: string;
  nextPath: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${nextPath}`);
  }

  const { data: enrollmentData } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const courseIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.course_id)));

  let courses: Course[] = [];
  let topics: CourseTopic[] = [];

  if (courseIds.length > 0) {
    const [coursesResult, topicsResult] = await Promise.all([
      supabase.from("courses").select("*").in("id", courseIds).order("title"),
      supabase.from("course_topics").select("*").in("course_id", courseIds).order("day_number"),
    ]);
    courses = (coursesResult.data ?? []) as Course[];
    topics = (topicsResult.data ?? []) as CourseTopic[];
  }

  const enrollmentByCourse = new Map(enrollments.map((enrollment) => [enrollment.course_id, enrollment]));

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Learning roadmap</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{heading}</h1>
        <p className="mt-3 max-w-3xl text-base text-on-surface-variant md:text-lg">
          View your enrolled courses, daily topics, practice projects, and learning resources.
        </p>
      </header>

      {courses.length === 0 ? (
        <section className="rounded-lg border border-outline-variant bg-surface p-8 text-center shadow-sm">
          <Icon name="school" className="text-5xl text-primary" />
          <h2 className="mt-4 text-xl font-bold">No course assigned yet</h2>
          <p className="mt-2 text-on-surface-variant">
            Your course will appear here after the admin activates your enrollment.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => {
            const enrollment = enrollmentByCourse.get(course.id);
            const courseTopics = topics.filter((topic) => topic.course_id === course.id);

            return (
              <details key={course.id} className="group overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 md:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold md:text-2xl">{course.title}</h2>
                      <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold uppercase text-on-primary-container">
                        {enrollment?.status ?? "enrolled"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {courseTopics.length} topics
                      {course.duration ? ` · ${course.duration}` : ""}
                      {course.level ? ` · ${course.level}` : ""}
                    </p>
                  </div>
                  <Icon name="expand_more" className="shrink-0 text-2xl transition-transform group-open:rotate-180" />
                </summary>

                <div className="border-t border-outline-variant px-5 py-5 md:px-6">
                  {course.description ? <p className="mb-5 text-on-surface-variant">{course.description}</p> : null}

                  {courseTopics.length === 0 ? (
                    <p className="rounded-lg bg-surface-container-low p-5 text-on-surface-variant">
                      The course roadmap has not been added yet.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {courseTopics.map((topic) => (
                        <article
                          key={topic.id}
                          className="grid gap-4 rounded-lg border border-outline-variant p-4 md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-on-primary">
                            {String(topic.day_number).padStart(2, "0")}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold">{topic.title}</h3>
                            {topic.practice_project ? (
                              <p className="mt-1 text-sm text-on-surface-variant">
                                <span className="font-bold text-on-surface">Practice:</span> {topic.practice_project}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {topic.english_video ? (
                              <Link
                                href={topic.english_video}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container"
                              >
                                <Icon name="play_circle" /> English
                              </Link>
                            ) : null}
                            {topic.urdu_video ? (
                              <Link
                                href={topic.urdu_video}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container"
                              >
                                <Icon name="play_circle" /> Urdu/Hindi
                              </Link>
                            ) : null}
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
