import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Course, CourseTopic, Enrollment, Task } from "@/lib/supabase/types";

function normalizeTitle(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function taskStatusLabel(status: Task["status"]) {
  return {
    pending: "Not started",
    in_progress: "In progress",
    submitted: "Submitted",
    reviewed: "Reviewed",
    revision_required: "Needs improvement",
    rejected: "Rejected",
  }[status];
}

function taskStatusClass(status: Task["status"]) {
  if (status === "reviewed") return "bg-emerald-100 text-emerald-800";
  if (status === "submitted") return "bg-blue-100 text-blue-800";
  if (status === "revision_required") return "bg-amber-100 text-amber-900";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-surface-container-high text-on-surface-variant";
}

function formatDeadline(value: string | null) {
  if (!value) return "No deadline";

  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(value));
}

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

  const [enrollmentsResult, tasksResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("student_id", user.id)
      .eq("workflow_type", "assigned")
      .order("created_at", { ascending: false }),
  ]);

  const enrollments = (enrollmentsResult.data ?? []) as Enrollment[];
  const assignedTasks = (tasksResult.data ?? []) as Task[];
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
            const courseTasks = assignedTasks.filter((task) => task.course_id === course.id);
            const syllabusTopicTitles = new Set(courseTopics.map((topic) => normalizeTitle(topic.title)));

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

                  <section className="mb-6 rounded-lg border border-outline-variant bg-surface-container-low p-4 md:p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold">Assigned work</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          Tasks assigned by your admin and tasks shared from this syllabus.
                        </p>
                      </div>
                      <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
                        {courseTasks.length} tasks
                      </span>
                    </div>

                    {courseTasks.length === 0 ? (
                      <p className="rounded-lg bg-surface p-4 text-sm text-on-surface-variant">
                        No task has been assigned for this course yet.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {courseTasks.map((task) => {
                          const isSyllabusTask = syllabusTopicTitles.has(normalizeTitle(task.title));

                          return (
                            <details
                              key={task.id}
                              className="group/task rounded-lg border border-outline-variant bg-surface"
                            >
                              <summary className="grid cursor-pointer list-none gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-bold text-on-primary-container">
                                      {isSyllabusTask ? "Syllabus task" : "Admin task"}
                                    </span>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${taskStatusClass(task.status)}`}
                                    >
                                      {taskStatusLabel(task.status)}
                                    </span>
                                  </div>
                                  <h4 className="mt-3 font-extrabold">{task.title}</h4>
                                  {task.description ? (
                                    <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{task.description}</p>
                                  ) : null}
                                  <p className="mt-2 text-xs font-bold uppercase text-on-surface-variant">
                                    Deadline: {formatDeadline(task.deadline)}
                                  </p>
                                </div>
                                <span
                                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90"
                                >
                                  <Icon name="visibility" />
                                  <span className="group-open/task:hidden">View details</span>
                                  <span className="hidden group-open/task:inline">Hide details</span>
                                  <Icon name="expand_more" className="transition-transform group-open/task:rotate-180" />
                                </span>
                              </summary>
                              <div className="border-t border-outline-variant px-4 py-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary">Task details</p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-on-surface-variant">
                                  {task.description ?? "No additional task details were provided."}
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
                                  <p className="text-sm text-on-surface-variant">
                                    Complete this work, then submit it from <span className="font-bold text-on-surface">Daily Task</span>.
                                  </p>
                                  <Link
                                    href="/student?addTask=1"
                                    className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container"
                                  >
                                    <Icon name="add_task" /> Go to Daily Task
                                  </Link>
                                </div>
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <h3 className="mb-4 text-lg font-extrabold">Course roadmap</h3>

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
