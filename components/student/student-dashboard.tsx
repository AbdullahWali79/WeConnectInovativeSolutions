"use client";

import Link from "next/link";
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

export function StudentDashboard() {
  const supabase = createSupabaseBrowserClient();
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
  const [taskForm, setTaskForm] = useState({
    course_id: "",
    title: "",
    description: "",
    github_url: "",
    google_doc_url: "",
    google_sheet_url: "",
    image_url: "",
    youtube_url: "",
    proof_url: "",
    extra_proof_links: [""],
  });
  const clearToast = useCallback(() => setToast(null), []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [dailyFiles, setDailyFiles] = useState<File[]>([]);
  const [dailyPreviews, setDailyPreviews] = useState<string[]>([]);

  const handleDailyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (dailyFiles.length + files.length > 5) {
      setToast({ type: "error", message: "You can upload up to 5 screenshots maximum." });
      return;
    }
    
    const validExtensions = ["jpg", "jpeg", "png", "webp"];
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!validExtensions.includes(ext)) {
        setToast({ type: "error", message: `Invalid file type: ${file.name}. Only jpg, jpeg, png, webp are allowed.` });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setToast({ type: "error", message: `File size too large: ${file.name}. Maximum size is 5MB.` });
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }
    
    setDailyFiles(prev => [...prev, ...newFiles]);
    setDailyPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeDailyFile = (index: number) => {
    URL.revokeObjectURL(dailyPreviews[index]);
    setDailyFiles(prev => prev.filter((_, i) => i !== index));
    setDailyPreviews(prev => prev.filter((_, i) => i !== index));
  };

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
    const error = taskResult.error ?? resourceResult.error ?? submissionResult.error ?? clientHuntResult.error ?? enrollmentResult.error ?? courseResult.error ?? reportResult.error;
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
                  Latest submission: {actionLabel} · Score: {submission.score ?? 0} / {task.max_score}
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
    setTaskForm((current) => {
      const nextLinks = current.extra_proof_links.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        extra_proof_links: nextLinks.length > 0 ? nextLinks : [""],
      };
    });
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

    const proofLinks = [
      taskForm.proof_url,
      ...taskForm.extra_proof_links,
    ]
      .map((link) => link.trim())
      .filter(Boolean);

    if (proofLinks.length === 0) {
      setToast({ type: "error", message: "Add at least one proof link." });
      return;
    }

    if (dailyFiles.length === 0) {
      setToast({ type: "error", message: "Please upload at least 1 screenshot from your device." });
      return;
    }
    if (dailyFiles.length > 5) {
      setToast({ type: "error", message: "You can upload up to 5 screenshots." });
      return;
    }

    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ type: "error", message: "User session not found." });
      setCreating(false);
      return;
    }

    try {
      const uploadedScreenshots: { githubUrl: string; cdnUrl: string; originalFilename: string; fileSize: number; mimeType: string }[] = [];
      
      for (const file of dailyFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "task-screenshot");
        formData.append("entityId", user.id);
        
        const res = await fetch("/api/uploads/github", {
          method: "POST",
          body: formData,
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Upload to GitHub failed.");
        }
        
        uploadedScreenshots.push({
          githubUrl: data.githubUrl,
          cdnUrl: data.githubCdnUrl,
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type || "image/octet-stream",
        });
      }

      const { data: newTaskId, error: submitError } = await supabase.rpc("submit_student_task", {
        target_course_id: taskForm.course_id,
        task_title: taskForm.title.trim(),
        task_description: taskForm.description.trim() || null,
        submission_explanation: taskForm.description.trim() || null,
        submission_github_url: taskForm.github_url.trim() || null,
        submission_google_doc_url: taskForm.google_doc_url.trim() || null,
        submission_google_sheet_url: taskForm.google_sheet_url.trim() || null,
        submission_image_url: taskForm.image_url.trim() || null,
        submission_youtube_url: taskForm.youtube_url.trim() || null,
        submission_proof_url: proofLinks[0] ?? null,
        submission_proof_links: proofLinks.slice(1),
      });

      if (submitError) {
        throw submitError;
      }

      if (!newTaskId) {
        throw new Error("Failed to retrieve the new task ID.");
      }

      const { data: subData, error: fetchSubError } = await supabase
        .from("submissions")
        .select("id")
        .eq("task_id", newTaskId)
        .maybeSingle();

      if (fetchSubError) throw fetchSubError;
      if (!subData?.id) throw new Error("Could not find the created task submission record.");

      const screenshotRows = uploadedScreenshots.map(item => ({
        task_submission_id: subData.id,
        student_id: user.id,
        task_id: newTaskId,
        github_url: item.githubUrl,
        cdn_url: item.cdnUrl,
        original_filename: item.originalFilename,
        file_size: item.fileSize,
        mime_type: item.mimeType,
      }));

      const { error: insertError } = await supabase
        .from("submission_screenshots")
        .insert(screenshotRows);

      if (insertError) throw insertError;

      setToast({ type: "success", message: "Daily task submitted for review with screenshots." });
      setTaskForm({
        course_id: activeEnrollments[0]?.course_id ?? "",
        title: "",
        description: "",
        github_url: "",
        google_doc_url: "",
        google_sheet_url: "",
        image_url: "",
        youtube_url: "",
        proof_url: "",
        extra_proof_links: [""],
      });
      
      dailyPreviews.forEach(url => URL.revokeObjectURL(url));
      setDailyFiles([]);
      setDailyPreviews([]);
      
      await loadData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit task.";
      setToast({ type: "error", message: errMsg });
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading student dashboard..." />;

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
            <Link href="/student/tasks#add-task-form" className="wc-primary-btn">
              <Icon name="add_task" /> Daily Task
            </Link>
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

      <div id="add-task-form" className="mb-6 wc-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-primary">Daily Task</p>
            <h2 className="mt-1 text-title-lg text-on-surface">Submit a daily task for admin review</h2>
            <p className="mt-2 max-w-3xl text-body-md text-on-surface-variant">
              Add a title, description, and proof links. Admin will review the submission and either accept it or request revision.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
            Default target: <span className="font-black text-primary">100</span> tasks
          </div>
        </div>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={createTask}>
          <label className="block md:col-span-2">
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
          <label className="block md:col-span-2">
            <span className="wc-label">Task Title</span>
            <input className="wc-input mt-2" value={taskForm.title} onChange={(event) => updateTaskForm("title", event.target.value)} placeholder="Enter your task title" required />
          </label>
          <label className="block md:col-span-2">
            <span className="wc-label">Description</span>
            <textarea className="wc-input mt-2 min-h-28" value={taskForm.description} onChange={(event) => updateTaskForm("description", event.target.value)} placeholder="Explain what you made, how to verify it, and any notes for admin." />
          </label>
          <div className="md:col-span-2 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
            <div className="mb-4">
              <p className="wc-label">Verification Links</p>
              <p className="mt-1 text-xs text-on-surface-variant">Fill only the links you have. At least one proof link is required.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <UrlInput label="GitHub Link" value={taskForm.github_url} onChange={(value) => updateTaskForm("github_url", value)} placeholder="https://github.com/..." />
              <UrlInput label="Google Docs Link" value={taskForm.google_doc_url} onChange={(value) => updateTaskForm("google_doc_url", value)} placeholder="https://docs.google.com/..." />
              <UrlInput label="Google Sheet Link" value={taskForm.google_sheet_url} onChange={(value) => updateTaskForm("google_sheet_url", value)} placeholder="https://docs.google.com/spreadsheets/..." />
              <UrlInput label="Image / Screenshot Link" value={taskForm.image_url} onChange={(value) => updateTaskForm("image_url", value)} placeholder="https://..." />
              <UrlInput label="YouTube Link" value={taskForm.youtube_url} onChange={(value) => updateTaskForm("youtube_url", value)} placeholder="https://www.youtube.com/watch?v=..." />
              <div className="md:col-span-2">
                <UrlInput label="Primary Proof Link" value={taskForm.proof_url} required onChange={(value) => updateTaskForm("proof_url", value)} placeholder="https://..." />
              </div>
            </div>

            {/* Compulsory Screenshot Section */}
            <div className="md:col-span-2 rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-4">
              <div>
                <span className="wc-label block">Compulsory Screenshots *</span>
                <span className="text-xs text-on-surface-variant block mt-1">
                  Please upload between 1 to 5 screenshots of your work from your device. Supported formats: JPG, JPEG, PNG, WEBP (Max 5MB per image).
                </span>
              </div>

              <div className="relative border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-6 transition flex flex-col items-center justify-center bg-white/50 cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleDailyFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Icon name="cloud_upload" className="text-3xl text-primary mb-2" />
                <span className="text-sm font-bold text-on-surface">Select screenshots from device</span>
                <span className="text-xs text-on-surface-variant mt-1">Drag and drop or click to choose files</span>
              </div>

              {dailyPreviews.length > 0 && (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                  {dailyPreviews.map((preview, index) => (
                    <div key={`preview-${index}`} className="relative group rounded-xl border border-outline-variant overflow-hidden aspect-video bg-surface-container-lowest">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeDailyFile(index)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-red-600 text-white p-1 transition"
                      >
                        <Icon name="close" className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="wc-label">Additional Proof Links</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Add any extra URLs you want admin to open.</p>
                </div>
                <button type="button" onClick={addExtraProofLink} className="wc-secondary-btn px-3 py-2 text-xs">
                  <Icon name="add" /> Add Link
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {taskForm.extra_proof_links.map((link, index) => (
                  <div key={`extra-proof-${index}`} className="flex gap-3">
                    <div className="flex-1">
                      <input
                        className="wc-input"
                        type="text"
                        value={link}
                        onChange={(event) => updateExtraProofLink(index, event.target.value)}
                        placeholder={`Extra proof link ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExtraProofLink(index)}
                      className="wc-secondary-btn px-3 py-2 text-xs"
                      disabled={taskForm.extra_proof_links.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setTaskForm({
                course_id: activeEnrollments[0]?.course_id ?? "",
                title: "",
                description: "",
                github_url: "",
                google_doc_url: "",
                google_sheet_url: "",
                image_url: "",
                youtube_url: "",
                proof_url: "",
                extra_proof_links: [""],
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
