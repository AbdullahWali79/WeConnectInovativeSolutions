"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { PromoPopup } from "@/components/public/promo-popup";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Announcement, ClientHuntLead, Course, Enrollment, Profile, ProgressReport, Submission, Task, TaskResource } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";
import { getMissingProfileLinks, isStudentProfileComplete } from "@/lib/profile-links";
import { getProofLinkError } from "@/lib/proof-links";

export function StudentDashboard() {
  const supabase = createSupabaseBrowserClient();
  const pathname = usePathname();
  const isOverview = pathname === "/student";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [clientHuntLeads, setClientHuntLeads] = useState<ClientHuntLead[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [assignedTasksOpen, setAssignedTasksOpen] = useState(false);
  const [acceptedTasksOpen, setAcceptedTasksOpen] = useState(false);
  const [dailyTasksOpen, setDailyTasksOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    course_id: "",
    title: "",
    description: "",
    proof_url: "",
    extra_proof_links: [] as string[],
  });
  const clearToast = useCallback(() => setToast(null), []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [taskResult, resourceResult, submissionResult, clientHuntResult, enrollmentResult, courseResult, reportResult, announcementResult, userResult] = await Promise.all([
      supabase.from("tasks").select("*").order("deadline", { ascending: true, nullsFirst: false }),
      supabase.from("task_resources").select("*").order("created_at", { ascending: true }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("client_hunt_leads").select("*").order("submitted_at", { ascending: false }),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
      supabase.from("progress_reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.auth.getUser(),
    ]);
      const error =
        taskResult.error ??
        resourceResult.error ??
        submissionResult.error ??
        clientHuntResult.error ??
        enrollmentResult.error ??
        courseResult.error ??
        reportResult.error ??
        announcementResult.error ??
        userResult.error;
    if (error) setToast({ type: "error", message: error.message });
    setTasks(taskResult.data ?? []);
    setResources(resourceResult.data ?? []);
    setSubmissions(submissionResult.data ?? []);
    setClientHuntLeads(clientHuntResult.data ?? []);
    setEnrollments(enrollmentResult.data ?? []);
    setCourses(courseResult.data ?? []);
    setReports(reportResult.data ?? []);
    setAnnouncements(announcementResult.data ?? []);
    const userId = userResult.data.user?.id;
    if (userId) {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(profileData as Profile | null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("addTask") === "1") {
      setAddTaskOpen(true);
    }
    const openAddTask = () => setAddTaskOpen(true);
    window.addEventListener("open-add-task", openAddTask);
    return () => window.removeEventListener("open-add-task", openAddTask);
  }, []);

  useEffect(() => {
    if (!addTaskOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) setAddTaskOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [addTaskOpen, creating]);

  useEffect(() => {
    if (editingTask) {
      setEditTitle(editingTask.title);
      setEditDescription(editingTask.description ?? "");
    }
  }, [editingTask]);

  async function saveTaskEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      setToast({ type: "error", message: "Task name is required." });
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase.rpc("edit_student_task", {
      target_task_id: editingTask.id,
      new_title: editTitle.trim(),
      new_description: editDescription.trim(),
    });
    setSavingEdit(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Task updated successfully." });
    setEditingTask(null);
    await loadData();
  }

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const submissionByTaskId = useMemo(() => new Map(submissions.map((submission) => [submission.task_id, submission])), [submissions]);
  const myClientHuntLeads = useMemo(() => {
    if (!profile) return [];
    return clientHuntLeads.filter((lead) => lead.student_id === profile.id);
  }, [clientHuntLeads, profile]);
  const activeEnrollments = useMemo(() => enrollments.filter((enrollment) => enrollment.status === "active"), [enrollments]);
  const myTasks = useMemo(() => {
    if (!profile) return [];
    return tasks.filter((task) => task.student_id === profile.id);
  }, [tasks, profile]);
  const sortTasks = useCallback((items: Task[]) => {
    const statusRank: Record<string, number> = {
      pending: 0,
      in_progress: 1,
      revision_required: 2,
      submitted: 3,
      reviewed: 4,
      rejected: 5,
    };

    return [...items].sort((a, b) => {
      const aRank = statusRank[a.status] ?? 9;
      const bRank = statusRank[b.status] ?? 9;
      if (aRank !== bRank) return aRank - bRank;

      const aHasSubmission = submissionByTaskId.has(a.id) ? 1 : 0;
      const bHasSubmission = submissionByTaskId.has(b.id) ? 1 : 0;
      if (aHasSubmission !== bHasSubmission) return aHasSubmission - bHasSubmission;

      return new Date(a.deadline ?? a.created_at).getTime() - new Date(b.deadline ?? b.created_at).getTime();
    });
  }, [submissionByTaskId]);
  const assignedTasks = useMemo(() => sortTasks(myTasks.filter((task) => task.workflow_type !== "daily")), [myTasks, sortTasks]);
  const pendingAssignedTasks = useMemo(
    () => assignedTasks.filter((task) => {
      const status = submissionByTaskId.get(task.id)?.status ?? task.status;
      return status !== "reviewed";
    }),
    [assignedTasks, submissionByTaskId],
  );
  const acceptedAssignedTasks = useMemo(
    () => assignedTasks.filter((task) => (submissionByTaskId.get(task.id)?.status ?? task.status) === "reviewed"),
    [assignedTasks, submissionByTaskId],
  );
  const dailyTasks = useMemo(() => sortTasks(myTasks.filter((task) => task.workflow_type === "daily")), [myTasks, sortTasks]);
  const topTask = useMemo(() => pendingAssignedTasks[0] ?? dailyTasks[0] ?? null, [pendingAssignedTasks, dailyTasks]);
  const totalTasks = myTasks.length;
  const tasksLeft = reports.length > 0
    ? reports.reduce((sum, report) => sum + (report.pending_tasks ?? 0), 0)
    : 100;
  const submittedTasks = myTasks.filter((task) => task.status === "submitted" || task.status === "reviewed" || task.status === "revision_required" || task.status === "rejected").length;
  const approvedClientHuntCount = myClientHuntLeads.filter((lead) => lead.status === "approved").length;
  const pendingClientHuntCount = myClientHuntLeads.filter((lead) => lead.status === "pending").length;
  const progress = reports.length > 0 ? Math.round(reports.reduce((sum, report) => sum + report.progress_percentage, 0) / reports.length) : 0;
  const profileComplete = profile ? isStudentProfileComplete(profile) : false;
  const missingLinks = profile ? getMissingProfileLinks(profile) : [];

  function getTaskActionLabel(status: string) {
    if (status === "revision_required") return "Resubmit Task";
    if (status === "submitted") return "Submitted";
    if (status === "reviewed") return "Accepted";
    if (status === "rejected") return "Rejected";
    return "Submit Task";
  }

  function isTaskActionEnabled(status: string) {
    return status === "pending" || status === "in_progress" || status === "revision_required";
  }

  function renderTaskCard(task: Task) {
    const taskResources = resources.filter((resource) => resource.task_id === task.id);
    const submission = submissionByTaskId.get(task.id);
    const actionStatus = submission?.status ?? task.status;
    const actionLabel = getTaskActionLabel(actionStatus);
    const actionEnabled = isTaskActionEnabled(actionStatus);

    return (
      <article key={task.id} className="wc-card p-6 transition hover:-translate-y-0.5 hover:shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-title-lg text-on-surface">{task.title}</h2>
              <StatusPill value={task.status} />
              {task.workflow_type !== "daily" ? (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  Assigned by admin
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  Daily task
                </span>
              )}
            </div>
            <p className="text-body-md text-on-surface-variant">{task.description ?? "No description"}</p>
            <div className="mt-4 grid gap-2 text-body-sm text-on-surface-variant md:grid-cols-3">
              <span>Course: {courseById.get(task.course_id)?.title ?? "Unknown"}</span>
              <span>Deadline: {formatDateTime(task.deadline)}</span>
              <span>Max score: {task.max_score}</span>
            </div>
            {submission ? (
              <div className="mt-3 text-body-sm text-on-surface-variant space-y-1.5">
                <p className="font-semibold">
                  Latest submission: {actionLabel} Â· Score: {submission.score ?? 0} / {task.max_score}
                </p>
                {submission.feedback && (
                  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 text-xs italic text-on-surface-variant max-w-xl">
                    <span className="font-bold not-italic text-[10px] text-primary uppercase block mb-1">Feedback:</span>
                    {submission.feedback}
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {actionStatus !== "reviewed" ? (
                <button
                  onClick={() => setEditingTask(task)}
                  className="inline-flex items-center gap-2 rounded-full border border-outline px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition"
                >
                  <Icon name="edit" className="text-sm" /> Edit Task Info
                </button>
              ) : (
                <span
                  title="Accepted tasks cannot be edited."
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface-variant/50 cursor-not-allowed"
                >
                  <Icon name="lock" className="text-sm" /> Accepted tasks cannot be edited.
                </span>
              )}
            </div>
          </div>
          {actionEnabled ? (
            <Link href={`/student/tasks/${task.id}/submit`} className="wc-primary-btn">
              <Icon name="upload_file" /> {actionLabel}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-2xl bg-surface-container px-4 py-3 text-sm font-bold text-on-surface-variant">
              <Icon name="check_circle" className="text-lg" />
              {actionLabel}
            </span>
          )}
        </div>
        {taskResources.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {taskResources.map((resource) => (
              <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-primary">
                {resource.title ?? resource.resource_type.replaceAll("_", " ")}
              </a>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  useEffect(() => {
    if (!taskForm.course_id && activeEnrollments.length > 0) {
      setTaskForm((current) => ({ ...current, course_id: activeEnrollments[0].course_id }));
    }
  }, [activeEnrollments, taskForm.course_id]);

  function updateTaskForm(name: keyof typeof taskForm, value: string) {
    setTaskForm((current) => ({ ...current, [name]: value }));
  }

  function updateExtraProofLink(index: number, value: string) {
    setTaskForm((current) => ({
      ...current,
      extra_proof_links: current.extra_proof_links.map((link, itemIndex) => (itemIndex === index ? value : link)),
    }));
  }

  function addExtraProofLink() {
    setTaskForm((current) => ({ ...current, extra_proof_links: [...current.extra_proof_links, ""] }));
  }

  function removeExtraProofLink(index: number) {
    setTaskForm((current) => ({
      ...current,
      extra_proof_links: current.extra_proof_links.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.course_id) {
      setToast({ type: "error", message: "Choose an active course first." });
      return;
    }

    if (!taskForm.title.trim()) {
      setToast({ type: "error", message: "Task title is required." });
      return;
    }

    const proofLinkError = getProofLinkError(taskForm.proof_url);
    if (proofLinkError) {
      setToast({ type: "error", message: proofLinkError });
      return;
    }

    for (const extraLink of taskForm.extra_proof_links) {
      if (!extraLink.trim()) continue;
      const extraLinkError = getProofLinkError(extraLink);
      if (extraLinkError) {
        setToast({ type: "error", message: `Additional proof link: ${extraLinkError}` });
        return;
      }
    }

    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ type: "error", message: "User session not found." });
      setCreating(false);
      return;
    }

    try {
      const { error: submitError } = await supabase.rpc("submit_student_task", {
        target_course_id: taskForm.course_id,
        task_title: taskForm.title.trim(),
        task_description: taskForm.description.trim() || null,
        submission_explanation: taskForm.description.trim() || null,
        // Pass the complete current signature so PostgREST does not confuse it
        // with older overloaded versions of submit_student_task.
        submission_github_url: null,
        submission_google_doc_url: null,
        submission_google_sheet_url: null,
        submission_image_url: null,
        submission_youtube_url: null,
        submission_proof_url: taskForm.proof_url.trim(),
        submission_proof_links: taskForm.extra_proof_links.map((link) => link.trim()).filter(Boolean),
      });

      if (submitError) {
        throw submitError;
      }

      setToast({ type: "success", message: "Daily task submitted for review." });
      setTaskForm({
        course_id: activeEnrollments[0]?.course_id ?? "",
        title: "",
        description: "",
        proof_url: "",
        extra_proof_links: [],
      });
      setAddTaskOpen(false);
      await loadData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to submit task.";
      setToast({ type: "error", message: errMsg });
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading student dashboard..." />;

  if (isOverview) {
    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Student";
    const latestAnnouncements = announcements.slice(0, 5);
    const overviewStats = [
      {
        label: "Pending Tasks",
        value: pendingAssignedTasks.length,
        href: "/student/tasks",
        icon: "pending_actions",
        color: "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-400 hover:bg-blue-100/50",
      },
      {
        label: "Completed",
        value: acceptedAssignedTasks.length,
        href: "/student/tasks",
        icon: "task_alt",
        color: "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-100/50",
      },
      {
        label: "Progress",
        value: `${progress}%`,
        href: "/student/progress",
        icon: "monitoring",
        color: "border-indigo-200 bg-indigo-50 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-100/50",
      },
      {
        label: "Approved Leads",
        value: approvedClientHuntCount,
        href: "/student/client-hunting",
        icon: "person_search",
        color: "border-purple-200 bg-purple-50 text-purple-600 hover:border-purple-400 hover:bg-purple-100/50",
      },
    ];

    const quickLinks = [
      { label: "My tasks", href: "/student/tasks", icon: "assignment" },
      { label: "Syllabus", href: "/student/syllabus", icon: "menu_book" },
      { label: "Projects", href: "/student/projects", icon: "folder_special" },
      { label: "Social media", href: "/student/social-media", icon: "share" },
    ];

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Toast toast={toast} onClear={() => setToast(null)} />
        <PromoPopup context="student" />

        {/* Header */}
        <header className="flex flex-col justify-between gap-4 border-b border-outline-variant/50 pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-label-sm font-bold uppercase tracking-widest text-primary">Student Hub</p>
            <h1 className="mt-1 text-3xl font-black text-on-surface">Welcome, {firstName}</h1>
          </div>
          <Link href="/student/tasks" className="wc-primary-btn shrink-0">
             <Icon name="assignment" /> View Tasks
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Stats and Quick Links */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Compact Stats */}
            <section aria-label="Key metrics">
               <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {overviewStats.map(stat => (
                     <Link key={stat.label} href={stat.href} className={`flex flex-col rounded-2xl border p-4 transition-all hover:scale-[1.02] hover:shadow-md ${stat.color}`}>
                        <Icon name={stat.icon} className="mb-2 text-2xl opacity-80" />
                        <span className="mb-1 text-3xl font-black">{stat.value}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
                     </Link>
                  ))}
               </div>
            </section>

            {/* Next Task Highlight */}
            <section aria-label="Next task">
              <div className="mb-3 flex items-center justify-between">
                 <h2 className="text-lg font-bold text-on-surface">Next Task</h2>
              </div>
              {topTask ? (
                 <Link href="/student/tasks" className="group block wc-card p-5 transition-all hover:border-primary/50 hover:shadow-lg">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                       <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                             <StatusPill value={submissionByTaskId.get(topTask.id)?.status ?? topTask.status} />
                             {topTask.workflow_type === "daily" ? (
                               <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">Daily Task</span>
                             ) : (
                               <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-800">Admin Assigned</span>
                             )}
                          </div>
                          <h3 className="text-xl font-bold text-on-surface transition-colors group-hover:text-primary">{topTask.title}</h3>
                          <p className="mt-1.5 text-sm font-medium text-on-surface-variant">
                            {courseById.get(topTask.course_id)?.title ?? "Course"} · Due: {topTask.deadline ? formatDateTime(topTask.deadline) : "No deadline"}
                          </p>
                       </div>
                       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white sm:self-center">
                          <Icon name="arrow_forward" />
                       </div>
                    </div>
                 </Link>
              ) : (
                 <div className="wc-card border-dashed p-6 text-center">
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                       <Icon name="done_all" className="text-2xl" />
                    </div>
                    <p className="font-bold text-on-surface">All caught up!</p>
                    <p className="mt-1 text-sm text-on-surface-variant">You have no pending assigned tasks.</p>
                 </div>
              )}
            </section>

            {/* Quick Links */}
            <section aria-label="Quick links" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
               {quickLinks.map(link => (
                  <Link key={link.label} href={link.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                     <Icon name={link.icon} className="text-[28px] text-primary transition-transform group-hover:scale-110" />
                     <span className="text-xs font-bold text-on-surface">{link.label}</span>
                  </Link>
               ))}
            </section>

          </div>

          {/* Right Column: Announcements */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-amber-600">
                <Icon name="campaign" className="text-2xl" />
                <h2 className="text-lg font-bold">Announcements</h2>
             </div>
             
             {latestAnnouncements.length > 0 ? (
                <div className="space-y-3">
                   {latestAnnouncements.map(announcement => (
                      <details key={announcement.id} className="group overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/50 shadow-sm transition-all hover:shadow-md [&_summary::-webkit-details-marker]:hidden">
                         <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-amber-100/50">
                            <div className="min-w-0">
                               <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600/80">{new Date(announcement.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                               <h3 className="truncate text-sm font-bold text-slate-900">{announcement.title}</h3>
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200/50 text-amber-700 transition-transform group-open:rotate-180">
                               <Icon name="expand_more" />
                            </div>
                         </summary>
                         <div className="border-t border-amber-200/50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {announcement.message}
                         </div>
                      </details>
                   ))}
                </div>
             ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                   <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-200/50 text-slate-400">
                      <Icon name="notifications_off" className="text-3xl" />
                   </div>
                   <p className="font-bold text-slate-500">No Announcements</p>
                   <p className="mt-1 text-xs text-slate-400">You&apos;re all caught up!</p>
                </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PromoPopup context="student" />
      <PageHeader
        eyebrow="Student Hub"
        title="My assigned tasks"
        description="Create new tasks for review, open resources, and submit proof. RLS limits this page to your own rows."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAddTaskOpen(true)} className="wc-primary-btn">
              <Icon name="add_task" /> Daily Task
            </button>
            <Link href="/student/client-hunting" className="wc-primary-btn">Client Hunting</Link>
            <Link href="/student/progress" className="wc-secondary-btn">View Progress</Link>
          </div>
        }
      />

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div className="mb-6 space-y-3">
          {announcements.map((announcement) => (
            <AnnouncementBanner key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}

      {topTask ? (
        (() => {
          const topTaskActionStatus = submissionByTaskId.get(topTask.id)?.status ?? topTask.status;
          return (
            <div className="mb-6 overflow-hidden rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.92))] p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase tracking-widest text-primary">Top Task</p>
                  <h2 className="mt-1 text-title-lg text-on-surface">{topTask.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill value={topTaskActionStatus} />
                    <span className={topTask.workflow_type === "daily" ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700" : "rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"}>
                      {topTask.workflow_type === "daily" ? "Daily task" : "Assigned by admin"}
                    </span>
                  </div>
                  <p className="mt-4 text-body-sm text-on-surface-variant">
                    {courseById.get(topTask.course_id)?.title ?? "Unknown course"} - Deadline {formatDateTime(topTask.deadline)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {topTaskActionStatus !== "reviewed" ? (
                      <button
                        onClick={() => setEditingTask(topTask)}
                        className="inline-flex items-center gap-2 rounded-full border border-outline px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition"
                      >
                        <Icon name="edit" className="text-sm" /> Edit Task Info
                      </button>
                    ) : (
                      <span
                        title="Accepted tasks cannot be edited."
                        className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface-variant/50 cursor-not-allowed"
                      >
                        <Icon name="lock" className="text-sm" /> Accepted tasks cannot be edited.
                      </span>
                    )}
                  </div>
                </div>
                {isTaskActionEnabled(topTaskActionStatus) ? (
                  <Link href={`/student/tasks/${topTask.id}/submit`} className="wc-primary-btn shrink-0">
                    <Icon name="upload_file" /> {getTaskActionLabel(topTaskActionStatus)}
                  </Link>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-surface-container px-4 py-3 text-sm font-bold text-on-surface-variant">
                    <Icon name="check_circle" className="text-lg" />
                    {getTaskActionLabel(topTaskActionStatus)}
                  </span>
                )}
              </div>
            </div>
          );
        })()
      ) : null}

      <div id="assigned-tasks" className="mb-6 space-y-6">
        <div className="wc-card p-6">
          <button
            type="button"
            onClick={() => setAssignedTasksOpen((current) => !current)}
            className="flex w-full flex-col gap-2 text-left md:flex-row md:items-end md:justify-between"
            aria-expanded={assignedTasksOpen}
          >
            <div>
              <p className="text-label-sm uppercase tracking-widest text-primary">Assigned Tasks</p>
              <h2 className="mt-1 text-title-lg text-on-surface">Tasks assigned by admin</h2>
              <p className="mt-2 max-w-3xl text-body-md text-on-surface-variant">
                These are the tasks you received from admin. Open one to submit proof.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              Total assigned: <span className="font-black text-primary">{assignedTasks.length}</span>
              <Icon name={assignedTasksOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"} className="text-xl" />
            </div>
          </button>
          {assignedTasksOpen ? (
            pendingAssignedTasks.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No assigned tasks yet" description="Your admin-assigned tasks will appear here." icon="assignment" />
              </div>
            ) : (
              <div className="mt-6 grid gap-6">
                {pendingAssignedTasks.map((task) => renderTaskCard(task))}
              </div>
            )
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              Click to expand assigned tasks.
            </div>
          )}
        </div>

        <div className="wc-card p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-label-sm uppercase tracking-widest text-primary">Accepted Tasks</p>
              <h2 className="mt-1 text-title-lg text-on-surface">Tasks reviewed by admin</h2>
              <p className="mt-2 max-w-3xl text-body-md text-on-surface-variant">
                These are the tasks already accepted. They stay organized separately from pending work.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              Total accepted: <span className="font-black text-primary">{acceptedAssignedTasks.length}</span>
              <button
                type="button"
                onClick={() => setAcceptedTasksOpen((current) => !current)}
                className="inline-flex items-center justify-center text-primary"
                aria-expanded={acceptedTasksOpen}
              >
                <Icon name={acceptedTasksOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"} className="text-xl" />
              </button>
            </div>
          </div>
          {acceptedTasksOpen ? (
            acceptedAssignedTasks.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No accepted tasks yet" description="Accepted tasks will move here after admin review." icon="check_circle" />
              </div>
            ) : (
              <div className="mt-6 grid gap-6">
                {acceptedAssignedTasks.map((task) => renderTaskCard(task))}
              </div>
            )
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              Click to expand accepted tasks.
            </div>
          )}
        </div>

        <div className="wc-card p-6">
          <button
            type="button"
            onClick={() => setDailyTasksOpen((current) => !current)}
            className="flex w-full flex-col gap-2 text-left md:flex-row md:items-end md:justify-between"
            aria-expanded={dailyTasksOpen}
          >
            <div>
              <p className="text-label-sm uppercase tracking-widest text-primary">Daily Tasks</p>
              <h2 className="mt-1 text-title-lg text-on-surface">Tasks submitted by you</h2>
              <p className="mt-2 max-w-3xl text-body-md text-on-surface-variant">
                These are the daily task submissions you created from the add-task form. Accepted items count toward your target too.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              Total daily: <span className="font-black text-primary">{dailyTasks.length}</span>
              <Icon name={dailyTasksOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"} className="text-xl" />
            </div>
          </button>
          {dailyTasksOpen ? (
            dailyTasks.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No daily tasks yet" description="Use the form below to submit a daily task for review." icon="add_task" />
              </div>
            ) : (
              <div className="mt-6 grid gap-6">
                {dailyTasks.map((task) => renderTaskCard(task))}
              </div>
            )
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              Click to expand daily tasks.
            </div>
          )}
        </div>
      </div>

      {addTaskOpen ? (
      <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-task-title" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) setAddTaskOpen(false);
      }}>
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-primary">Daily Task</p>
            <h2 id="add-task-title" className="mt-1 text-title-lg text-on-surface">Add task</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Add the task details and a compulsory proof link.
            </p>
          </div>
          <button type="button" onClick={() => setAddTaskOpen(false)} disabled={creating} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container disabled:opacity-50" aria-label="Close add task form">
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={createTask}>
        <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
          <label className="block">
            <span className="wc-label">Course</span>
            <select className="wc-input mt-2" value={taskForm.course_id} onChange={(event) => updateTaskForm("course_id", event.target.value)} required>
              <option value="">Choose an active course</option>
              {activeEnrollments.map((enrollment) => (
                <option key={`${enrollment.course_id}-${enrollment.id}`} value={enrollment.course_id}>
                  {courseById.get(enrollment.course_id)?.title ?? "Unknown course"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="wc-label">Task Title</span>
            <input className="wc-input mt-2" value={taskForm.title} onChange={(event) => updateTaskForm("title", event.target.value)} placeholder="Enter your task title" required />
          </label>
          <label className="block sm:col-span-2">
            <span className="wc-label">Description</span>
            <textarea className="wc-input mt-2 min-h-20" value={taskForm.description} onChange={(event) => updateTaskForm("description", event.target.value)} placeholder="Briefly explain what you made and how to verify it." />
          </label>
          <div className="sm:col-span-2 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
            <UrlInput label="Proof Link" value={taskForm.proof_url} onChange={(value) => updateTaskForm("proof_url", value)} placeholder="https://..." required />

            <div className="mt-5 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="wc-label">Image Google Drive URLs</p>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-on-surface-variant">Upload each image to Google Drive, set access to &quot;Anyone with the link&quot;, then add one public URL per image. Use Add Image URL for multiple images.</p>
                </div>
                <button type="button" onClick={addExtraProofLink} className="wc-secondary-btn px-3 py-2 text-xs">
                  <Icon name="add" /> Add Image URL
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {taskForm.extra_proof_links.map((link, index) => (
                  <div key={`extra-proof-${index}`} className="flex gap-3">
                    <input
                      className="wc-input flex-1"
                      type="url"
                      value={link}
                      onChange={(event) => updateExtraProofLink(index, event.target.value)}
                      placeholder={`Public Google Drive image URL ${index + 1}`}
                    />
                    <button type="button" onClick={() => removeExtraProofLink(index)} className="wc-secondary-btn px-3 py-2 text-xs">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-outline-variant/60 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() => setTaskForm({
                course_id: activeEnrollments[0]?.course_id ?? "",
                title: "",
                description: "",
                proof_url: "",
                extra_proof_links: [],
              })}
              className="wc-secondary-btn"
              disabled={creating}
            >
              Reset
            </button>
            <button type="submit" disabled={creating || activeEnrollments.length === 0} className="wc-primary-btn">
              {creating ? "Submitting..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>
      </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <Stat label="Overall Progress" value={`${progress}%`} icon="donut_large" dark />
        <Stat label="Tasks Left" value={tasksLeft} icon="assignment_turned_in" />
        <Stat label="Assigned Tasks" value={totalTasks} icon="assignment" />
        <Stat label="Client Hunts Done" value={approvedClientHuntCount} icon="manage_search" />
        <Stat label="Submitted" value={submittedTasks} icon="upload_file" />
      </div>

      <div className="mb-6 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        Client hunting summary for {profile?.full_name ?? "this student"}: <span className="font-black text-primary">{approvedClientHuntCount}</span> approved, <span className="font-black text-primary">{pendingClientHuntCount}</span> pending.
      </div>

      {!profileComplete ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="mt-0.5 text-xl text-amber-600" />
            <div>
              <p className="font-bold">Complete your profile links</p>
              <p className="mt-1 text-sm">
                Add your GitHub, LinkedIn, Facebook, and Indeed links so your internship score can be counted.
              </p>
              {missingLinks.length > 0 ? (
                <p className="mt-2 text-xs font-semibold">
                  Missing: {missingLinks.map((item) => item.label).join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="wc-card w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setEditingTask(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" className="text-xl" />
            </button>
            <h3 className="text-title-lg font-bold text-on-surface">Edit Task Info</h3>
            <form onSubmit={saveTaskEdit} className="space-y-4">
              <label className="block">
                <span className="wc-label">Task Name</span>
                <input
                  type="text"
                  className="wc-input mt-2"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="wc-label">Task Description</span>
                <textarea
                  className="wc-input mt-2 min-h-32"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </label>
              <div className="flex gap-4 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="wc-secondary-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="wc-primary-btn"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}

const priorityStyles: Record<string, string> = {
  low: "border-l-4 border-slate-300 bg-slate-50",
  normal: "border-l-4 border-blue-400 bg-blue-50",
  high: "border-l-4 border-orange-400 bg-orange-50",
  urgent: "border-l-4 border-red-500 bg-red-50",
};

const priorityIcons: Record<string, string> = {
  low: "info",
  normal: "notifications",
  high: "warning",
  urgent: "notification_important",
};

function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  return (
    <div className={`rounded-lg p-3 ${priorityStyles[announcement.priority]}`}>
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-lg text-primary shrink-0">{priorityIcons[announcement.priority]}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">{announcement.title}</p>
          <p className="text-xs text-on-surface-variant">{announcement.message}</p>
        </div>
      </div>
    </div>
  );
}

function UrlInput({
  label,
  value,
  onChange,
  required = false,
  placeholder = "https://...",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="wc-label">{label}{required ? " *" : ""}</span>
      <input className="wc-input mt-2" type="text" value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} />
    </label>
  );
}

function Stat({ label, value, icon, dark }: { label: string; value: string | number; icon: string; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-xl bg-primary p-4 text-white shadow-card" : "wc-card p-4"}>
      <div className={dark ? "mb-3 inline-flex rounded-xl bg-white/15 p-2" : "mb-3 inline-flex rounded-xl bg-surface-container p-2 text-primary"}><Icon name={icon} className="text-lg" /></div>
      <p className={dark ? "text-xs font-bold text-blue-100" : "text-xs font-bold text-on-surface-variant"}>{label}</p>
      <p className={dark ? "text-2xl font-black text-white" : "text-2xl font-black text-primary"}>{value}</p>
    </div>
  );
}
