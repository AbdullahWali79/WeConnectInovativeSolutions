"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { GoogleDriveImagePreviews } from "@/components/admin/google-drive-image-previews";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { courseInScope, filterCoursesByScope, filterEnrollmentsByScope, loadTeacherCourseScope, type CourseScope } from "@/lib/admin-course-scope";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Course, Enrollment, Profile, ResourceType, Submission, SubmissionStatus, Task, TaskResource } from "@/lib/supabase/types";
import { normalizeAnyUrl } from "@/lib/profile-links";
import { formatDateTime, toNumber } from "@/lib/utils";

type SubmissionScreenshot = {
  id: string;
  task_submission_id: string;
  student_id: string;
  task_id: string;
  github_url: string;
  cdn_url: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

const taskInitial = { student_id: "", course_id: "", title: "", description: "", deadline: "", max_score: "100" };
const bulkTaskInitial = { course_id: "", title: "", description: "", deadline: "", max_score: "100" };
type ResourceForm = { resource_type: ResourceType; title: string; url: string };
const emptyResource: ResourceForm = { resource_type: "custom", title: "", url: "" };

export function TasksManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const canCreate = canUse("tasks.create");
  const canDelete = canUse("tasks.delete");
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courseScope, setCourseScope] = useState<CourseScope>(null);
  const [form, setForm] = useState(taskInitial);
  const [resourceForms, setResourceForms] = useState<ResourceForm[]>([{ ...emptyResource }]);
  const [submissionForms, setSubmissionForms] = useState<Record<string, { status: SubmissionStatus; score: string; feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissionBusyId, setSubmissionBusyId] = useState<string | null>(null);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [bulkReviewSelection, setBulkReviewSelection] = useState<string[]>([]);
  const [bulkReviewScore, setBulkReviewScore] = useState("90");
  const [bulkReviewFeedback, setBulkReviewFeedback] = useState("Very Good Work");
  const [toast, setToast] = useState<ToastState>(null);
  const [screenshots, setScreenshots] = useState<SubmissionScreenshot[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [submittedProjectCount, setSubmittedProjectCount] = useState(0);
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDate, setDueDate] = useState("");
  const [reviewedFilter, setReviewedFilter] = useState("all");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showBulkTaskModal, setShowBulkTaskModal] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"assigned" | "reviews" | "zero-marks">("assigned");
  const [bulkForm, setBulkForm] = useState(bulkTaskInitial);
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState<string[]>([]);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    let scope: CourseScope = null;
    try {
      scope = await loadTeacherCourseScope(supabase as never, currentRole);
      setCourseScope(scope);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to load course scope." });
      scope = [];
    }
    const [studentResult, courseResult, enrollmentResult, taskResult, resourceResult, submissionResult, screenshotResult, projectResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").eq("status", "approved").order("full_name"),
      supabase.from("courses").select("*").order("title"),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_resources").select("*").order("created_at", { ascending: true }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("submission_screenshots").select("*").order("created_at", { ascending: true }),
      supabase.from("student_projects").select("id", { count: "exact", head: true }),
    ]);
    const error = studentResult.error ?? courseResult.error ?? enrollmentResult.error ?? taskResult.error ?? resourceResult.error ?? submissionResult.error ?? screenshotResult.error;
    if (error) setToast({ type: "error", message: error.message });
    const scopedEnrollments = filterEnrollmentsByScope(enrollmentResult.data ?? [], scope);
    const scopedStudentIds = new Set(scopedEnrollments.map((enrollment) => enrollment.student_id));
    setStudents(currentRole === "teacher" ? (studentResult.data ?? []).filter((student) => scopedStudentIds.has(student.id)) : (studentResult.data ?? []));
    setCourses(filterCoursesByScope(courseResult.data ?? [], scope));
    setEnrollments(scopedEnrollments);
    const scopedTasks = (taskResult.data ?? []).filter((task) => courseInScope(task.course_id, scope));
    const scopedTaskIds = new Set(scopedTasks.map((task) => task.id));
    const scopedSubmissions = (submissionResult.data ?? []).filter((submission) => scopedTaskIds.has(submission.task_id));
    setTasks(scopedTasks);
    setResources((resourceResult.data ?? []).filter((resource) => scopedTaskIds.has(resource.task_id)));
    setSubmissions(scopedSubmissions);
    setScreenshots(screenshotResult.data ?? []);
    setSubmittedProjectCount(projectResult.count ?? 0);
    setSubmissionForms(Object.fromEntries(scopedSubmissions.map((submission) => [submission.id, {
      status: submission.status,
      score: String(submission.score ?? 0),
      feedback: submission.feedback ?? "",
    }])));
    setLoading(false);
  }, [currentRole, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const submissionByTaskId = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const submission of submissions) {
      if (!map.has(submission.task_id)) {
        map.set(submission.task_id, submission);
      }
    }
    return map;
  }, [submissions]);
  const enrollmentOptions = enrollments.filter((enrollment) => enrollment.status === "active");
  const singleAssignableEnrollments = useMemo(() => {
    const enrollmentCounts = enrollmentOptions.reduce((map, enrollment) => {
      map.set(enrollment.course_id, (map.get(enrollment.course_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());

    return enrollmentOptions.filter((enrollment) => {
      const matchesStudent = !form.student_id || enrollment.student_id === form.student_id;
      return enrollmentCounts.get(enrollment.course_id) === 1 && matchesStudent;
    });
  }, [enrollmentOptions, form.student_id]);
  const singleAssignableStudents = useMemo(() => {
    if (!form.course_id) return [];

    const courseEnrollments = enrollmentOptions.filter((enrollment) => enrollment.course_id === form.course_id);
    const uniqueStudents = new Map<string, Profile>();

    for (const enrollment of courseEnrollments) {
      const student = studentById.get(enrollment.student_id);
      if (student) uniqueStudents.set(student.id, student);
    }

    return Array.from(uniqueStudents.values()).sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));
  }, [enrollmentOptions, form.course_id, studentById]);
  const bulkAssignableCourses = useMemo(() => {
    const enrollmentCounts = enrollmentOptions.reduce((map, enrollment) => {
      map.set(enrollment.course_id, (map.get(enrollment.course_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());

    return courses.filter((course) => (enrollmentCounts.get(course.id) ?? 0) >= 2).map((course) => ({
      ...course,
      enrolledStudents: enrollmentCounts.get(course.id) ?? 0,
    }));
  }, [courses, enrollmentOptions]);
  const bulkCourseEnrollments = useMemo(
    () => enrollmentOptions.filter((enrollment) => enrollment.course_id === bulkForm.course_id),
    [bulkForm.course_id, enrollmentOptions],
  );
  const bulkCourseStudents = useMemo(
    () => bulkCourseEnrollments
      .map((enrollment) => studentById.get(enrollment.student_id))
      .filter((student): student is Profile => Boolean(student)),
    [bulkCourseEnrollments, studentById],
  );
  const bulkSelectedStudentSet = useMemo(() => new Set(bulkSelectedStudentIds), [bulkSelectedStudentIds]);
  const assignedTaskStudents = useMemo(() => {
    const studentIds = new Set(tasks.map((task) => task.student_id));
    return students
      .filter((student) => studentIds.has(student.id))
      .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));
  }, [students, tasks]);
  const coursesWithEnrollments = useMemo(() => {
    const activeEnrollmentCounts = enrollmentOptions.reduce((map, enrollment) => {
      map.set(enrollment.course_id, (map.get(enrollment.course_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());

    return courses.filter((course) => (activeEnrollmentCounts.get(course.id) ?? 0) > 0);
  }, [courses, enrollmentOptions]);
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const queryMatch = task.title.toLowerCase().includes(query.trim().toLowerCase());
    const studentMatch = studentFilter === "all" || task.student_id === studentFilter;
    const courseMatch = courseFilter === "all" || task.course_id === courseFilter;
    const statusMatch = statusFilter === "all" || task.status === statusFilter;
    const dueMatch = !dueDate || (task.deadline ? task.deadline.slice(0, 10) === dueDate : false);
    const reviewedMatch = reviewedFilter === "all"
      || (reviewedFilter === "reviewed" && task.status === "reviewed")
      || (reviewedFilter === "unreviewed" && task.status !== "reviewed" && task.status !== "rejected");
    return queryMatch && studentMatch && courseMatch && statusMatch && dueMatch && reviewedMatch;
  }), [tasks, query, studentFilter, courseFilter, statusFilter, dueDate, reviewedFilter]);
  const visibleTasks = useMemo(() => {
    const submissionPriority: Record<string, number> = {
      submitted: 0,
      reviewed: 1,
      revision_required: 2,
      rejected: 3,
      pending: 4,
      in_progress: 5,
    };

    return [...filteredTasks].sort((a, b) => {
      const aSubmission = submissionByTaskId.get(a.id);
      const bSubmission = submissionByTaskId.get(b.id);
      const aHasSubmission = aSubmission ? 0 : 1;
      const bHasSubmission = bSubmission ? 0 : 1;
      if (aHasSubmission !== bHasSubmission) return aHasSubmission - bHasSubmission;

      const aPriority = submissionPriority[aSubmission?.status ?? a.status] ?? 5;
      const bPriority = submissionPriority[bSubmission?.status ?? b.status] ?? 5;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredTasks, submissionByTaskId]);
  const allZeroMarksTasks = useMemo(
    () => tasks.filter((task) => {
      const submission = submissionByTaskId.get(task.id);
      return submission?.status === "reviewed" && Number(submission.score ?? 0) === 0;
    }),
    [submissionByTaskId, tasks],
  );
  const zeroMarksTaskIds = useMemo(() => new Set(allZeroMarksTasks.map((task) => task.id)), [allZeroMarksTasks]);
  const zeroMarksTasks = useMemo(() => visibleTasks.filter((task) => zeroMarksTaskIds.has(task.id)), [visibleTasks, zeroMarksTaskIds]);
  const reviewVisibleTasks = activeView === "zero-marks" ? zeroMarksTasks : visibleTasks;
  const bulkReviewableTasks = useMemo(
    () => visibleTasks.filter((task) => submissionByTaskId.get(task.id)?.status === "submitted"),
    [submissionByTaskId, visibleTasks],
  );
  const bulkReviewableTaskIds = useMemo(() => new Set(bulkReviewableTasks.map((task) => task.id)), [bulkReviewableTasks]);
  const selectedBulkReviewTaskIds = useMemo(
    () => bulkReviewSelection.filter((taskId) => bulkReviewableTaskIds.has(taskId)),
    [bulkReviewSelection, bulkReviewableTaskIds],
  );
  const allVisibleSubmittedSelected = bulkReviewableTasks.length > 0 && selectedBulkReviewTaskIds.length === bulkReviewableTasks.length;
  const assignedOnlyTasks = useMemo(() => {
    return tasks
      .filter((task) => task.workflow_type !== "daily")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tasks]);
  const taskStats = useMemo(() => {
    const reviewed = tasks.filter((task) => task.status === "reviewed").length;
    const submitted = tasks.filter((task) => task.status === "submitted").length;
    const pending = tasks.filter((task) => task.status === "pending" || task.status === "in_progress").length;
    const revisions = tasks.filter((task) => task.status === "revision_required").length;
    const rejected = tasks.filter((task) => task.status === "rejected").length;
    return { reviewed, submitted, pending, revisions, rejected, total: tasks.length };
  }, [tasks]);

  function updateResource(index: number, patch: Partial<ResourceForm>) {
    setResourceForms((current) => current.map((resource, itemIndex) => itemIndex === index ? { ...resource, ...patch } : resource));
  }

  function updateSubmissionForm(submissionId: string, patch: Partial<{ status: SubmissionStatus; score: string; feedback: string }>) {
    setSubmissionForms((current) => ({ ...current, [submissionId]: { ...current[submissionId], ...patch } }));
  }

  function toggleBulkStudent(studentId: string) {
    setBulkSelectedStudentIds((current) => (
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    ));
  }

  function toggleBulkReviewTask(taskId: string) {
    setBulkReviewSelection((current) => (
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    ));
  }

  function toggleAllVisibleSubmitted() {
    setBulkReviewSelection((current) => {
      const visibleIds = bulkReviewableTasks.map((task) => task.id);
      if (allVisibleSubmittedSelected) {
        return current.filter((id) => !bulkReviewableTaskIds.has(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function acceptSelectedSubmissions() {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to review submissions." });
      return;
    }

    const selectedTasks = bulkReviewableTasks.filter((task) => selectedBulkReviewTaskIds.includes(task.id));
    if (selectedTasks.length === 0) {
      setToast({ type: "error", message: "Select at least one submitted task." });
      return;
    }

    const score = Number(bulkReviewScore);
    if (!Number.isFinite(score) || score < 0) {
      setToast({ type: "error", message: "Enter valid marks of 0 or higher." });
      return;
    }

    const taskWithLowerMax = selectedTasks.find((task) => score > task.max_score);
    if (taskWithLowerMax) {
      setToast({ type: "error", message: `Marks cannot exceed ${taskWithLowerMax.max_score} for ${taskWithLowerMax.title}.` });
      return;
    }

    const selectedSubmissions = selectedTasks
      .map((task) => submissionByTaskId.get(task.id))
      .filter((submission): submission is Submission => Boolean(submission));
    const reviewedAt = new Date().toISOString();

    setBulkReviewing(true);
    const { error: submissionError } = await supabase
      .from("submissions")
      .update({
        status: "reviewed",
        score,
        feedback: bulkReviewFeedback.trim() || null,
        reviewed_at: reviewedAt,
      })
      .in("id", selectedSubmissions.map((submission) => submission.id));

    if (submissionError) {
      setBulkReviewing(false);
      setToast({ type: "error", message: submissionError.message });
      return;
    }

    const { error: taskError } = await supabase
      .from("tasks")
      .update({ status: "reviewed" })
      .in("id", selectedTasks.map((task) => task.id));

    if (taskError) {
      setBulkReviewing(false);
      setToast({ type: "error", message: taskError.message });
      return;
    }

    const progressTargets = Array.from(new Map(
      selectedTasks.map((task) => [`${task.student_id}:${task.course_id}`, { studentId: task.student_id, courseId: task.course_id }]),
    ).values());
    await Promise.all(progressTargets.map((target) => supabase.rpc("refresh_student_progress", {
      target_student_id: target.studentId,
      target_course_id: target.courseId,
    })));

    setBulkReviewing(false);
    setBulkReviewSelection([]);
    setToast({ type: "success", message: `${selectedSubmissions.length} submissions accepted with ${score} marks.` });
    await loadData();
  }

  async function saveSubmissionReview(submission: Submission, forcedStatus?: SubmissionStatus) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to review submissions." });
      return;
    }

    const form = submissionForms[submission.id];
    if (!form) return;

    const status = forcedStatus ?? form.status;
    if ((status === "revision_required" || status === "rejected") && !form.feedback.trim()) {
      setToast({ type: "error", message: `${status === "rejected" ? "Reject" : "Revision"} feedback is required.` });
      return;
    }
    const score = status === "reviewed" ? toNumber(form.score, 0) : 0;

    setSubmissionBusyId(submission.id);
    const { error } = await supabase
      .from("submissions")
      .update({
        status,
        score,
        feedback: form.feedback.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (!error) {
      const taskStatus = status === "reviewed" ? "reviewed" : status === "rejected" ? "rejected" : "revision_required";
      await supabase.from("tasks").update({ status: taskStatus }).eq("id", submission.task_id);
      const task = tasks.find((item) => item.id === submission.task_id);
      if (task) {
        await supabase.rpc("refresh_student_progress", {
          target_student_id: submission.student_id,
          target_course_id: task.course_id,
        });
      }
    }

    setSubmissionBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({
      type: "success",
      message:
        status === "reviewed"
          ? "Submission accepted."
          : status === "rejected"
            ? "Submission rejected."
            : "Revision requested.",
    });
    setExpandedTaskId((currentTaskId) =>
      currentTaskId === submission.task_id ? null : currentTaskId,
    );
    await loadData();
  }

  async function assignTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to create tasks." });
      return;
    }
    if (!form.student_id || !form.course_id || !form.title.trim()) {
      setToast({ type: "error", message: "Student, course, and task title are required." });
      return;
    }
    if (!courseInScope(form.course_id, courseScope)) {
      setToast({ type: "error", message: "This teacher is not assigned to the selected course." });
      return;
    }

    const isEnrolled = enrollments.some((enrollment) => enrollment.student_id === form.student_id && enrollment.course_id === form.course_id && enrollment.status === "active");
    if (!isEnrolled) {
      setToast({ type: "error", message: "Selected student is not enrolled in an active course. Completed courses are locked." });
      return;
    }

    setSaving(true);
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        student_id: form.student_id,
        course_id: form.course_id,
        workflow_type: "assigned",
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        max_score: toNumber(form.max_score, 100),
      })
      .select("*")
      .single();

    if (error || !task) {
      setSaving(false);
      setToast({ type: "error", message: error?.message ?? "Failed to create task." });
      return;
    }

    const cleanResources = resourceForms.filter((resource) => resource.url.trim());
    if (cleanResources.length > 0) {
      const { error: resourceError } = await supabase.from("task_resources").insert(cleanResources.map((resource) => ({
        task_id: task.id,
        resource_type: resource.resource_type,
        title: resource.title.trim() || resource.resource_type.replaceAll("_", " "),
        url: resource.url.trim(),
      })));
      if (resourceError) {
        setSaving(false);
        setToast({ type: "error", message: resourceError.message });
        return;
      }
    }

    setSaving(false);
    setToast({ type: "success", message: "Task assigned with resources." });
    setForm(taskInitial);
    setResourceForms([{ ...emptyResource }]);
    setShowTaskModal(false);
    await loadData();
  }

  async function assignBulkTasks(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to create tasks." });
      return;
    }
    if (!bulkForm.course_id || !bulkForm.title.trim()) {
      setToast({ type: "error", message: "Course and task title are required." });
      return;
    }
    if (!courseInScope(bulkForm.course_id, courseScope)) {
      setToast({ type: "error", message: "This teacher is not assigned to the selected course." });
      return;
    }
    if (bulkSelectedStudentIds.length === 0) {
      setToast({ type: "error", message: "Select at least one student." });
      return;
    }

    const activeStudentIds = new Set(bulkCourseStudents.map((student) => student.id));
    const selectedIds = bulkSelectedStudentIds.filter((studentId) => activeStudentIds.has(studentId));

    if (selectedIds.length === 0) {
      setToast({ type: "error", message: "No selected students are enrolled in this course." });
      return;
    }

    setSaving(true);
    const taskPayloads = selectedIds.map((studentId) => ({
      student_id: studentId,
      course_id: bulkForm.course_id,
      workflow_type: "assigned",
      title: bulkForm.title.trim(),
      description: bulkForm.description.trim() || null,
      deadline: bulkForm.deadline ? new Date(bulkForm.deadline).toISOString() : null,
      max_score: toNumber(bulkForm.max_score, 100),
    }));

    const { data: createdTasks, error } = await supabase
      .from("tasks")
      .insert(taskPayloads)
      .select("*");

    if (error || !createdTasks || createdTasks.length === 0) {
      setSaving(false);
      setToast({ type: "error", message: error?.message ?? "Failed to create tasks." });
      return;
    }

    const cleanResources = resourceForms.filter((resource) => resource.url.trim());
    if (cleanResources.length > 0) {
      const taskResources = createdTasks.flatMap((task) => cleanResources.map((resource) => ({
        task_id: task.id,
        resource_type: resource.resource_type,
        title: resource.title.trim() || resource.resource_type.replaceAll("_", " "),
        url: resource.url.trim(),
      })));

      const { error: resourceError } = await supabase.from("task_resources").insert(taskResources);
      if (resourceError) {
        setSaving(false);
        setToast({ type: "error", message: resourceError.message });
        return;
      }
    }

    setSaving(false);
    setToast({ type: "success", message: `Task assigned to ${createdTasks.length} students.` });
    setBulkForm(bulkTaskInitial);
    setBulkSelectedStudentIds([]);
    setResourceForms([{ ...emptyResource }]);
    setShowBulkTaskModal(false);
    await loadData();
  }

  async function deleteTask(taskId: string) {
    if (!canDelete) {
      setToast({ type: "error", message: "You do not have permission to delete tasks." });
      return;
    }
    const confirmed = window.confirm("Delete this task and its resources/submission?");
    if (!confirmed) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Task deleted." });
    await loadData();
  }

  async function duplicateTask(task: Task) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to duplicate tasks." });
      return;
    }

    const isActiveEnrollment = enrollments.some((enrollment) => enrollment.student_id === task.student_id && enrollment.course_id === task.course_id && enrollment.status === "active");
    if (!isActiveEnrollment) {
      setToast({ type: "error", message: "This course enrollment is completed and locked. Duplicate the template for an active enrollment instead." });
      return;
    }

    setSaving(true);
    const { data: duplicatedTask, error } = await supabase
      .from("tasks")
      .insert({
        student_id: task.student_id,
        course_id: task.course_id,
        workflow_type: "assigned",
        title: `${task.title} Copy`,
        description: task.description,
        deadline: task.deadline,
        max_score: task.max_score,
      })
      .select("*")
      .single();

    if (error || !duplicatedTask) {
      setSaving(false);
      setToast({ type: "error", message: error?.message ?? "Failed to duplicate task." });
      return;
    }

    const taskResources = resources.filter((resource) => resource.task_id === task.id);
    if (taskResources.length > 0) {
      const { error: resourceError } = await supabase.from("task_resources").insert(taskResources.map((resource) => ({
        task_id: duplicatedTask.id,
        resource_type: resource.resource_type,
        title: resource.title,
        url: resource.url,
      })));
      if (resourceError) {
        setSaving(false);
        setToast({ type: "error", message: resourceError.message });
        return;
      }
    }

    setSaving(false);
    setToast({ type: "success", message: "Task duplicated with resources." });
    await loadData();
  }

  function loadTaskTemplate(task: Task) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to create tasks." });
      return;
    }

    const isActiveEnrollment = enrollments.some((enrollment) => enrollment.student_id === task.student_id && enrollment.course_id === task.course_id && enrollment.status === "active");
    if (!isActiveEnrollment) {
      setToast({ type: "error", message: "This course enrollment is completed and locked. Choose an active enrollment before creating a new task." });
      return;
    }

    const taskResources = resources.filter((resource) => resource.task_id === task.id);
    setForm({
      student_id: task.student_id,
      course_id: task.course_id,
      title: `${task.title} Template`,
      description: task.description ?? "",
      deadline: task.deadline ? task.deadline.slice(0, 16) : "",
      max_score: String(task.max_score),
    });
    setResourceForms(taskResources.length > 0
      ? taskResources.map((resource) => ({
        resource_type: resource.resource_type,
        title: resource.title ?? "",
        url: resource.url,
      }))
      : [{ ...emptyResource }]
    );
    setToast({ type: "success", message: "Task template loaded in the create form." });
  }

  if (loading) return <LoadingState label="Loading task manager..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Task Assignment"
        title="Assign tasks with resources"
        description="Create a task for an enrolled student and attach video, Google Docs, Sheets, images, GitHub, or custom resource links."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBulkTaskModal(true)}
              className="wc-secondary-btn shadow-sm"
            >
              <Icon name="group_add" /> Bulk Assign
            </button>
            <button
              type="button"
              onClick={() => setShowTaskModal(true)}
              className="wc-primary-btn shadow-sm"
            >
              <Icon name="add" /> New Task
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Tasks" value={taskStats.total} icon="assignment" tone="dark" />
        <MetricCard label="Pending / Active" value={taskStats.pending} icon="pending_actions" />
        <MetricCard label="Submitted" value={taskStats.submitted} icon="upload_file" />
        <MetricCard label="Reviewed" value={taskStats.reviewed} icon="rate_review" />
        <MetricCard label="Needs Revision" value={taskStats.revisions} icon="restart_alt" />
        <MetricCard label="Rejected" value={taskStats.rejected} icon="block" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <section className="wc-card overflow-hidden">
            <div className="border-b border-outline-variant/70 bg-surface-container-low px-4 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView("assigned")}
                  className={activeView === "assigned" ? "rounded-t-xl bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm" : "rounded-t-xl px-4 py-2 text-sm font-bold text-on-surface-variant"}
                >
                  Assigned Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("reviews")}
                  className={activeView === "reviews" ? "rounded-t-xl bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm" : "rounded-t-xl px-4 py-2 text-sm font-bold text-on-surface-variant"}
                >
                  Submission Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("zero-marks");
                    setStatusFilter("all");
                    setReviewedFilter("all");
                  }}
                  className={activeView === "zero-marks" ? "rounded-t-xl bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm" : "rounded-t-xl px-4 py-2 text-sm font-bold text-on-surface-variant"}
                >
                  Accepted with 0 Marks
                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">{allZeroMarksTasks.length}</span>
                </button>
                <Link
                  href="/admin/projects"
                  className="rounded-t-xl px-4 py-2 text-sm font-bold text-on-surface-variant transition hover:bg-white hover:text-primary"
                >
                  Projects Submitted
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">{submittedProjectCount}</span>
                </Link>
              </div>
            </div>

          {activeView === "assigned" ? (
            <div className="space-y-4 p-4">
            <div className="flex flex-col gap-4 border-b border-outline-variant/70 p-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-black text-on-surface">Assigned tasks</h2>
                <p className="mt-1 text-sm text-on-surface-variant">View all assigned tasks separately from submission reviews.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Total {taskStats.total}</span>
              </div>
            </div>

            {canCreate ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                  <label className="flex items-center gap-3 text-sm font-bold text-on-surface xl:min-w-48">
                    <input
                      type="checkbox"
                      checked={allVisibleSubmittedSelected}
                      disabled={bulkReviewableTasks.length === 0 || bulkReviewing}
                      onChange={toggleAllVisibleSubmitted}
                      className="h-5 w-5 rounded border-outline-variant text-emerald-600"
                    />
                    Select all submitted ({bulkReviewableTasks.length})
                  </label>
                  <label className="block xl:w-36">
                    <span className="wc-label">Default marks</span>
                    <input
                      className="wc-input mt-2 bg-white"
                      type="number"
                      min="0"
                      value={bulkReviewScore}
                      onChange={(event) => setBulkReviewScore(event.target.value)}
                    />
                  </label>
                  <label className="block min-w-0 flex-1">
                    <span className="wc-label">Default feedback</span>
                    <input
                      className="wc-input mt-2 bg-white"
                      value={bulkReviewFeedback}
                      onChange={(event) => setBulkReviewFeedback(event.target.value)}
                      placeholder="Very Good Work"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={selectedBulkReviewTaskIds.length === 0 || bulkReviewing}
                    onClick={() => void acceptSelectedSubmissions()}
                    className="wc-primary-btn whitespace-nowrap bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name={bulkReviewing ? "hourglass_empty" : "done_all"} />
                    {bulkReviewing ? "Accepting..." : `Accept Selected (${selectedBulkReviewTaskIds.length})`}
                  </button>
                </div>
                <p className="mt-3 text-xs text-emerald-800">Only currently submitted tasks can be selected. The marks and feedback above will be applied to every selected submission.</p>
              </div>
            ) : null}

            <div className="border-b border-outline-variant/70 bg-surface-container-low p-3">
              <div className="grid gap-3 md:grid-cols-12">
                <input className="wc-input md:col-span-4" placeholder="Search task title" value={query} onChange={(event) => setQuery(event.target.value)} />
                <select className="wc-input md:col-span-2" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                  <option value="all">All Trainees</option>
                  {assignedTaskStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name ?? student.email}</option>)}
                </select>
                <select className="wc-input md:col-span-2" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                  <option value="all">All Courses</option>
                  {coursesWithEnrollments.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
                <select className="wc-input md:col-span-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All Task Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="revision_required">Revision Required</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <input className="wc-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  <select className="wc-input" value={reviewedFilter} onChange={(event) => setReviewedFilter(event.target.value)}>
                    <option value="all">All Review</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="unreviewed">Unreviewed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {assignedOnlyTasks.length === 0 ? <div className="p-4"><EmptyState title="No assigned tasks" description="Create a new task to see it here." icon="assignment" /></div> : (
                <div className="divide-y divide-outline-variant/70">
                  {assignedOnlyTasks.map((task) => {
                    const taskResources = resources.filter((resource) => resource.task_id === task.id);
                    return (
                      <article key={task.id} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-3">
                              <h3 className="truncate text-base font-bold text-on-surface">{task.title}</h3>
                              <StatusPill value={task.status} />
                            </div>
                            <p className="truncate text-sm text-on-surface-variant">{task.description ?? "No description"}</p>
                            <p className="mt-2 text-xs text-on-surface-variant">
                              {studentById.get(task.student_id)?.full_name ?? "Unknown student"} Ãƒâ€šÃ‚Â· {courseById.get(task.course_id)?.title ?? "Unknown course"} Ãƒâ€šÃ‚Â· Deadline {formatDateTime(task.deadline)}
                            </p>
                            {taskResources.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {taskResources.map((resource) => (
                                  <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-primary">
                                    {resource.title ?? resource.resource_type.replaceAll("_", " ")}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {canCreate ? (
                              <button type="button" title="Load template" onClick={() => loadTaskTemplate(task)} className="wc-secondary-btn whitespace-nowrap">
                                <Icon name="content_copy" />
                                Template
                              </button>
                            ) : null}
                            {canCreate ? (
                              <button type="button" title="Duplicate task" disabled={saving} onClick={() => void duplicateTask(task)} className="wc-secondary-btn whitespace-nowrap disabled:opacity-50">
                                <Icon name="post_add" />
                                Duplicate
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button type="button" disabled={saving} onClick={() => deleteTask(task.id)} className="rounded-xl bg-error-container px-4 py-2 text-sm font-bold text-error">
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="space-y-4 p-4">
            <div className="flex flex-col gap-4 border-b border-outline-variant/70 p-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-black text-on-surface">{activeView === "zero-marks" ? "Accepted submissions with zero marks" : "Submission review"}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {activeView === "zero-marks"
                    ? "These submissions were accepted but currently have 0 marks. Open one to correct its score."
                    : "Open submitted tasks, score them, and give feedback."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Total {taskStats.total}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Pending {taskStats.pending}</span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Submitted {taskStats.submitted}</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Reviewed {taskStats.reviewed}</span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">Zero marks {allZeroMarksTasks.length}</span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">Rejected {taskStats.rejected}</span>
              </div>
            </div>

            <div className="border-b border-outline-variant/70 bg-surface-container-low p-3">
              <div className="grid gap-3 md:grid-cols-12">
                <input className="wc-input md:col-span-4" placeholder="Search task title" value={query} onChange={(event) => setQuery(event.target.value)} />
                <select className="wc-input md:col-span-2" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                  <option value="all">All Trainees</option>
                  {assignedTaskStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name ?? student.email}</option>)}
                </select>
                <select className="wc-input md:col-span-2" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                  <option value="all">All Courses</option>
                  {coursesWithEnrollments.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
                <select className="wc-input md:col-span-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All Task Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="revision_required">Revision Required</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <input className="wc-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  <select className="wc-input" value={reviewedFilter} onChange={(event) => setReviewedFilter(event.target.value)}>
                    <option value="all">All Review</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="unreviewed">Unreviewed</option>
                  </select>
                </div>
              </div>
            </div>
            {reviewVisibleTasks.length === 0 ? <div className="p-4"><EmptyState title={activeView === "zero-marks" ? "No accepted submissions with zero marks" : "No tasks matched"} description={activeView === "zero-marks" ? "All accepted submissions currently have marks greater than zero." : "Adjust filters or create a task."} icon={activeView === "zero-marks" ? "verified" : "assignment"} /></div> : (
              <div className="divide-y divide-outline-variant/70">
                {reviewVisibleTasks.map((task) => {
                  const taskResources = resources.filter((resource) => resource.task_id === task.id);
                  const isExpanded = expandedTaskId === task.id;
                  const taskSubmission = submissionByTaskId.get(task.id) ?? null;
                  const imageProofLinks = Array.isArray(taskSubmission?.proof_links)
                    ? taskSubmission.proof_links.filter((link): link is string => typeof link === "string" && link.trim().length > 0)
                    : [];
                  const taskSubmissionForm = taskSubmission ? submissionForms[taskSubmission.id] ?? {
                    status: taskSubmission.status,
                    score: String(taskSubmission.score ?? 0),
                    feedback: taskSubmission.feedback ?? "",
                  } : null;
                  const canBulkReview = taskSubmission?.status === "submitted";
                  const isBulkSelected = canBulkReview && selectedBulkReviewTaskIds.includes(task.id);
                  return (
                    <article key={task.id} className="p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        {canCreate && canBulkReview ? (
                          <label className="flex shrink-0 items-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface">
                            <input
                              type="checkbox"
                              checked={isBulkSelected}
                              disabled={bulkReviewing}
                              onChange={() => toggleBulkReviewTask(task.id)}
                              className="h-5 w-5 rounded border-outline-variant text-emerald-600"
                            />
                            Select
                          </label>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-sm font-black text-primary transition hover:bg-surface-container-high">
                            {isExpanded ? "ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢" : "+"}
                          </span>
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-3">
                              <h3 className="truncate text-base font-bold text-on-surface">{task.title}</h3>
                              <StatusPill value={task.status} />
                            </div>
                            <p className="truncate text-sm text-on-surface-variant">{task.description ?? "No description"}</p>
                            <p className="mt-2 text-xs text-on-surface-variant">
                              <span className="font-black text-slate-950">
                                {studentById.get(task.student_id)?.full_name ?? "Unknown student"}
                              </span>{" "}
                              Ãƒâ€šÃ‚Â· {courseById.get(task.course_id)?.title ?? "Unknown course"} Ãƒâ€šÃ‚Â· Deadline {formatDateTime(task.deadline)}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                              Submission:{" "}
                              {taskSubmission ? (
                                <span className="text-emerald-700">{taskSubmission.status.replaceAll("_", " ")}</span>
                              ) : (
                                <span className="text-amber-700">Waiting for student submission</span>
                              )}
                            </p>
                          </div>
                        </button>
                        <div className="flex shrink-0 gap-2">
                          {canCreate ? (
                            <button type="button" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="flex h-8 items-center justify-center rounded-lg bg-surface-container px-3 text-xs font-bold text-primary">
                              {isExpanded ? "Collapse" : "Details"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-4 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
                              <div className="grid gap-2 rounded-xl bg-surface p-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-on-surface-variant">Student</span>
                                  <span className="font-bold text-on-surface">{studentById.get(task.student_id)?.full_name ?? "Unknown student"}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-on-surface-variant">Course</span>
                                  <span className="font-bold text-on-surface">{courseById.get(task.course_id)?.title ?? "Unknown course"}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-on-surface-variant">Deadline</span>
                                  <span className="font-bold text-on-surface">{formatDateTime(task.deadline)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-on-surface-variant">Max score</span>
                                  <span className="font-bold text-on-surface">{task.max_score}</span>
                                </div>
                              </div>

                              <div className="rounded-3xl border border-outline-variant/60 bg-white p-6 shadow-md space-y-6">
                                <div className="flex items-start justify-between gap-4 pb-4 border-b border-outline-variant/50">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-primary">Submission Review</p>
                                    <h4 className="mt-1 text-base font-bold text-on-surface">
                                      {taskSubmission ? "Latest submission" : "No submission yet"}
                                    </h4>
                                  </div>
                                  {taskSubmission ? <StatusPill value={taskSubmission.status} /> : null}
                                </div>

                                <div className="space-y-3 rounded-2xl bg-surface-container-low p-4">
                                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Description</p>
                                  <p className="mt-1 text-sm text-on-surface">{task.description ?? "No description"}</p>
                                </div>

                                {taskSubmission && taskSubmissionForm ? (
                                  <div className="space-y-5">
                                    <div className="grid gap-3 grid-cols-2 rounded-2xl bg-surface-container-low p-4 text-xs text-on-surface-variant">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/70">Submitted</span>
                                        <span className="font-bold text-on-surface">{formatDateTime(taskSubmission.submitted_at)}</span>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/70">Reviewed</span>
                                        <span className="font-bold text-on-surface">
                                          {taskSubmission.reviewed_at ? formatDateTime(taskSubmission.reviewed_at) : "Not reviewed"}
                                        </span>
                                      </div>
                                      <div className="flex flex-col gap-1 col-span-2 border-t border-outline-variant/30 pt-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/70">Current Score</span>
                                        <span className="font-bold text-sm text-primary">
                                          {taskSubmission.score ?? 0} / {task.max_score}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Verification Links</p>
                                      <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-2">
                                        {taskSubmission.github_url ? (
                                          <a
                                            href={normalizeAnyUrl(taskSubmission.github_url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded-xl bg-primary text-white px-4 py-2.5 text-xs font-bold transition hover:bg-primary/90"
                                          >
                                            <span>Open Github Repository</span>
                                            <Icon name="open_in_new" className="text-sm" />
                                          </a>
                                        ) : (
                                          <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs font-medium text-on-surface-variant">
                                            No GitHub repository link provided.
                                          </div>
                                        )}
                                        <div className="grid gap-2 grid-cols-2">
                                          {taskSubmission.google_doc_url && <SubmissionLink label="Google Doc" url={taskSubmission.google_doc_url} />}
                                          {taskSubmission.google_sheet_url && <SubmissionLink label="Google Sheet" url={taskSubmission.google_sheet_url} />}
                                          {taskSubmission.image_url && <SubmissionLink label="Image" url={taskSubmission.image_url} />}
                                          {taskSubmission.youtube_url && <SubmissionLink label="YouTube" url={taskSubmission.youtube_url} />}
                                          {taskSubmission.proof_url && <SubmissionLink label="Proof Link" url={taskSubmission.proof_url} />}
                                        </div>
                                      </div>
                                    </div>
                                    <GoogleDriveImagePreviews links={imageProofLinks} />

                                    {screenshots.some((screen) => screen.task_submission_id === taskSubmission.id) ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Submitted Screenshots</p>
                                      {(() => {
                                        const subScreenshots = screenshots.filter((s) => s.task_submission_id === taskSubmission.id);
                                        if (subScreenshots.length === 0) {
                                          return (
                                            <p className="text-xs text-on-surface-variant/80 italic p-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low">
                                              No screenshots submitted.
                                            </p>
                                          );
                                        }
                                        return (
                                          <div className="grid gap-3 grid-cols-3 p-3 rounded-2xl bg-surface-container-low">
                                            {subScreenshots.map((screen) => (
                                              <div
                                                key={screen.id}
                                                className="group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant/50 hover:border-primary transition aspect-video bg-white"
                                                onClick={() => setLightboxUrl(screen.cdn_url)}
                                              >
                                                <img
                                                  src={screen.cdn_url}
                                                  alt={screen.original_filename}
                                                  className="w-full h-full object-cover transition group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                                                  <Icon name="zoom_in" className="text-white text-xs" />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    ) : null}

                                    <div className="space-y-4 pt-3 border-t border-outline-variant/50">
                                      <div className="grid gap-4 grid-cols-2">
                                        <label className="block space-y-1.5">
                                          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Review Status</span>
                                          <select
                                            className="wc-input bg-surface-container-low"
                                            value={taskSubmissionForm.status}
                                            onChange={(event) => updateSubmissionForm(taskSubmission.id, { status: event.target.value as SubmissionStatus })}
                                          >
                                            <option value="submitted">Submitted</option>
                                            <option value="reviewed">Accept</option>
                                            <option value="rejected">Reject</option>
                                            <option value="revision_required">Revise</option>
                                          </select>
                                        </label>
                                        <label className="block space-y-1.5">
                                          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Score</span>
                                          <input
                                            className="wc-input bg-surface-container-low"
                                            type="number"
                                            min="0"
                                            max={task.max_score}
                                            value={taskSubmissionForm.score}
                                            onChange={(event) => updateSubmissionForm(taskSubmission.id, { score: event.target.value })}
                                          />
                                        </label>
                                      </div>
                                      <label className="block space-y-1.5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Feedback</span>
                                        <textarea
                                          className="wc-input bg-surface-container-low min-h-24"
                                          value={taskSubmissionForm.feedback}
                                          onChange={(event) => updateSubmissionForm(taskSubmission.id, { feedback: event.target.value })}
                                          placeholder="Write feedback for the student..."
                                        />
                                      </label>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                      <button
                                        type="button"
                                        disabled={submissionBusyId === taskSubmission.id}
                                        onClick={() => void saveSubmissionReview(taskSubmission, "reviewed")}
                                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm"
                                      >
                                        <Icon name="check" className="text-base" /> Accept
                                      </button>
                                      <button
                                        type="button"
                                        disabled={submissionBusyId === taskSubmission.id}
                                        onClick={() => void saveSubmissionReview(taskSubmission, "rejected")}
                                        className="flex-1 py-3 border border-rose-500 text-rose-600 hover:bg-rose-50 rounded-2xl font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm"
                                      >
                                        <Icon name="block" className="text-base" /> Reject
                                      </button>
                                      <button
                                        type="button"
                                        disabled={submissionBusyId === taskSubmission.id}
                                        onClick={() => void saveSubmissionReview(taskSubmission, "revision_required")}
                                        className="flex-1 py-3 border border-orange-500 text-orange-600 hover:bg-orange-50 rounded-2xl font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm"
                                      >
                                        <Icon name="sync" className="text-base" /> Revise
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low">
                                    <Icon name="schedule" className="text-3xl text-on-surface-variant/30 mb-2" />
                                    <p className="text-sm text-on-surface-variant">Once the student submits this task, you can review it directly from here.</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {canCreate ? (
                                  <button type="button" title="Load template" onClick={() => loadTaskTemplate(task)} className="wc-secondary-btn whitespace-nowrap">
                                    <Icon name="content_copy" />
                                    Template
                                  </button>
                                ) : null}
                                {canCreate ? (
                                  <button type="button" title="Duplicate task" disabled={saving} onClick={() => void duplicateTask(task)} className="wc-secondary-btn whitespace-nowrap disabled:opacity-50">
                                    <Icon name="post_add" />
                                    Duplicate
                                  </button>
                                ) : null}
                                {canDelete ? (
                                  <button type="button" disabled={saving} onClick={() => deleteTask(task.id)} className="rounded-xl bg-error-container px-4 py-2 text-sm font-bold text-error">
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          )}
          </section>
      </motion.div>

      <AnimatePresence>
        {showTaskModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            onClick={() => setShowTaskModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_120px_rgba(2,7,27,0.4)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/70 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-on-surface">New task</h2>
                  <p className="text-sm text-on-surface-variant">Assign one task and add resources in a focused popup.</p>
                </div>
                <button type="button" onClick={() => setShowTaskModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="close" />
                </button>
              </div>

              {canCreate ? (
                <form onSubmit={assignTask} className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="wc-label">Enrolled Student</span>
                      <select
                        className="wc-input mt-2"
                        value={form.student_id}
                        onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))}
                        required
                        disabled={!form.course_id}
                      >
                        <option value="">{form.course_id ? "Choose student" : "Choose course first"}</option>
                        {singleAssignableStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.full_name ?? student.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="wc-label">Course Enrollment</span>
                      <select
                        className="wc-input mt-2"
                        value={form.course_id}
                        onChange={(event) => setForm((current) => ({ ...current, course_id: event.target.value, student_id: "" }))}
                        required
                      >
                        <option value="">Choose course</option>
                        {singleAssignableEnrollments.map((enrollment) => (
                          <option key={enrollment.course_id} value={enrollment.course_id}>
                            {courseById.get(enrollment.course_id)?.title ?? "Unknown course"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="wc-label">Title</span>
                      <input className="wc-input mt-2" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="wc-label">Description</span>
                      <textarea className="wc-input mt-2 min-h-24" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="wc-label">Deadline</span>
                      <input className="wc-input mt-2" type="datetime-local" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="wc-label">Max Score</span>
                      <input className="wc-input mt-2" type="number" min="1" value={form.max_score} onChange={(event) => setForm((current) => ({ ...current, max_score: event.target.value }))} />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-black text-on-surface">Resources</h3>
                      <button type="button" onClick={() => setResourceForms((current) => [...current, { ...emptyResource }])} className="text-xs font-bold text-primary">Add link</button>
                    </div>
                    <div className="space-y-3">
                      {resourceForms.map((resource, index) => (
                        <div key={index} className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className="wc-input" value={resource.resource_type} onChange={(event) => updateResource(index, { resource_type: event.target.value as ResourceType })}>
                              <option value="video">Video</option>
                              <option value="google_doc">Google Doc</option>
                              <option value="google_sheet">Google Sheet</option>
                              <option value="image">Image</option>
                              <option value="github">GitHub</option>
                              <option value="custom">Custom</option>
                            </select>
                            <input className="wc-input" placeholder="Resource title" value={resource.title} onChange={(event) => updateResource(index, { title: event.target.value })} />
                          </div>
                          <div className="mt-3 flex flex-col gap-3 md:flex-row">
                            <input className="wc-input flex-1" placeholder="https://..." value={resource.url} onChange={(event) => updateResource(index, { url: event.target.value })} />
                            {resourceForms.length > 1 ? <button type="button" onClick={() => setResourceForms((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-bold text-error">Remove</button> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setShowTaskModal(false)} className="wc-secondary-btn">Cancel</button>
                    <button disabled={saving} className="wc-primary-btn">{saving ? "Assigning..." : "Assign Task"}</button>
                  </div>
                </form>
              ) : (
                <div className="p-5">
                  <section className="wc-card p-4">
                    <h2 className="text-base font-bold text-on-surface">Read-only task access</h2>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">You can view assigned tasks, but creating new tasks is not enabled for this account.</p>
                  </section>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkTaskModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            onClick={() => setShowBulkTaskModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_120px_rgba(2,7,27,0.4)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/70 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-on-surface">Bulk task assignment</h2>
                  <p className="text-sm text-on-surface-variant">Pick one course, select multiple students, and assign the same task in one step.</p>
                </div>
                <button type="button" onClick={() => setShowBulkTaskModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="close" />
                </button>
              </div>

              {canCreate ? (
                <form onSubmit={assignBulkTasks} className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="wc-label">Course</span>
                      <select
                        className="wc-input mt-2"
                        value={bulkForm.course_id}
                        onChange={(event) => {
                          setBulkForm((current) => ({ ...current, course_id: event.target.value }));
                          setBulkSelectedStudentIds([]);
                        }}
                        required
                      >
                        <option value="">Choose course</option>
                        {bulkAssignableCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} ({course.enrolledStudents})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="wc-label">Task Title</span>
                      <input className="wc-input mt-2" value={bulkForm.title} onChange={(event) => setBulkForm((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="wc-label">Description</span>
                      <textarea className="wc-input mt-2 min-h-24" value={bulkForm.description} onChange={(event) => setBulkForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="wc-label">Deadline</span>
                      <input className="wc-input mt-2" type="datetime-local" value={bulkForm.deadline} onChange={(event) => setBulkForm((current) => ({ ...current, deadline: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="wc-label">Max Score</span>
                      <input className="wc-input mt-2" type="number" min="1" value={bulkForm.max_score} onChange={(event) => setBulkForm((current) => ({ ...current, max_score: event.target.value }))} />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-on-surface">Students in this course</h3>
                        <p className="text-sm text-on-surface-variant">
                          {bulkForm.course_id ? `${bulkCourseStudents.length} active student${bulkCourseStudents.length === 1 ? "" : "s"} found` : "Select a course first"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBulkSelectedStudentIds(bulkCourseStudents.map((student) => student.id))}
                          className="rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-on-surface"
                          disabled={!bulkForm.course_id || bulkCourseStudents.length === 0}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkSelectedStudentIds([])}
                          className="rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-on-surface"
                          disabled={bulkSelectedStudentIds.length === 0}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {!bulkForm.course_id ? (
                      <EmptyState title="Choose a course" description="The student checklist appears after you select a course." icon="school" />
                    ) : bulkCourseStudents.length === 0 ? (
                      <EmptyState title="No active students" description="This course has no active enrollments right now." icon="groups" />
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {bulkCourseStudents.map((student) => {
                          const checked = bulkSelectedStudentSet.has(student.id);
                          return (
                            <label key={student.id} className={checked ? "flex cursor-pointer items-center gap-3 rounded-2xl border border-primary bg-primary/5 p-4" : "flex cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant bg-white p-4"}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBulkStudent(student.id)}
                                className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-on-surface">{student.full_name ?? student.email}</p>
                                <p className="truncate text-xs text-on-surface-variant">{student.email}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-container px-4 py-3 text-sm">
                    <span className="font-bold text-on-surface-variant">Selected students</span>
                    <span className="font-black text-primary">{bulkSelectedStudentIds.length}</span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-black text-on-surface">Resources</h3>
                      <button type="button" onClick={() => setResourceForms((current) => [...current, { ...emptyResource }])} className="text-xs font-bold text-primary">Add link</button>
                    </div>
                    <div className="space-y-3">
                      {resourceForms.map((resource, index) => (
                        <div key={index} className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className="wc-input" value={resource.resource_type} onChange={(event) => updateResource(index, { resource_type: event.target.value as ResourceType })}>
                              <option value="video">Video</option>
                              <option value="google_doc">Google Doc</option>
                              <option value="google_sheet">Google Sheet</option>
                              <option value="image">Image</option>
                              <option value="github">GitHub</option>
                              <option value="custom">Custom</option>
                            </select>
                            <input className="wc-input" placeholder="Resource title" value={resource.title} onChange={(event) => updateResource(index, { title: event.target.value })} />
                          </div>
                          <div className="mt-3 flex flex-col gap-3 md:flex-row">
                            <input className="wc-input flex-1" placeholder="https://..." value={resource.url} onChange={(event) => updateResource(index, { url: event.target.value })} />
                            {resourceForms.length > 1 ? <button type="button" onClick={() => setResourceForms((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-bold text-error">Remove</button> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setShowBulkTaskModal(false)} className="wc-secondary-btn">Cancel</button>
                    <button disabled={saving} className="wc-primary-btn">{saving ? "Assigning..." : "Assign Tasks"}</button>
                  </div>
                </form>
              ) : (
                <div className="p-5">
                  <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm">
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl"></div>
                    <div className="relative">
                      <h2 className="flex items-center gap-2 text-base font-black text-on-surface">
                        <Icon name="lock" className="text-primary" />
                        Read-only access
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">You can view assigned tasks, but creating new tasks is not enabled for this account.</p>
                    </div>
                  </section>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkTaskModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            onClick={() => setShowBulkTaskModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_120px_rgba(2,7,27,0.4)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/70 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-on-surface">Bulk task assignment</h2>
                  <p className="text-sm text-on-surface-variant">Pick one course, select multiple students, and assign the same task in one step.</p>
                </div>
                <button type="button" onClick={() => setShowBulkTaskModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="close" />
                </button>
              </div>

              {canCreate ? (
                <form onSubmit={assignBulkTasks} className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="wc-label">Course</span>
                      <select
                        className="wc-input mt-2"
                        value={bulkForm.course_id}
                        onChange={(event) => {
                          setBulkForm((current) => ({ ...current, course_id: event.target.value }));
                          setBulkSelectedStudentIds([]);
                        }}
                        required
                      >
                        <option value="">Choose course</option>
                        {bulkAssignableCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} ({course.enrolledStudents})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="wc-label">Task Title</span>
                      <input className="wc-input mt-2" value={bulkForm.title} onChange={(event) => setBulkForm((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="wc-label">Description</span>
                      <textarea className="wc-input mt-2 min-h-24" value={bulkForm.description} onChange={(event) => setBulkForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="wc-label">Deadline</span>
                      <input className="wc-input mt-2" type="datetime-local" value={bulkForm.deadline} onChange={(event) => setBulkForm((current) => ({ ...current, deadline: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="wc-label">Max Score</span>
                      <input className="wc-input mt-2" type="number" min="1" value={bulkForm.max_score} onChange={(event) => setBulkForm((current) => ({ ...current, max_score: event.target.value }))} />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-on-surface">Students in this course</h3>
                        <p className="text-sm text-on-surface-variant">
                          {bulkForm.course_id ? `${bulkCourseStudents.length} active student${bulkCourseStudents.length === 1 ? "" : "s"} found` : "Select a course first"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBulkSelectedStudentIds(bulkCourseStudents.map((student) => student.id))}
                          className="rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-on-surface"
                          disabled={!bulkForm.course_id || bulkCourseStudents.length === 0}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkSelectedStudentIds([])}
                          className="rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-on-surface"
                          disabled={bulkSelectedStudentIds.length === 0}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {!bulkForm.course_id ? (
                      <EmptyState title="Choose a course" description="The student checklist appears after you select a course." icon="school" />
                    ) : bulkCourseStudents.length === 0 ? (
                      <EmptyState title="No active students" description="This course has no active enrollments right now." icon="groups" />
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {bulkCourseStudents.map((student) => {
                          const checked = bulkSelectedStudentSet.has(student.id);
                          return (
                            <label key={student.id} className={checked ? "flex cursor-pointer items-center gap-3 rounded-2xl border border-primary bg-primary/5 p-4" : "flex cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant bg-white p-4"}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBulkStudent(student.id)}
                                className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-on-surface">{student.full_name ?? student.email}</p>
                                <p className="truncate text-xs text-on-surface-variant">{student.email}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-container px-4 py-3 text-sm">
                    <span className="font-bold text-on-surface-variant">Selected students</span>
                    <span className="font-black text-primary">{bulkSelectedStudentIds.length}</span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-black text-on-surface">Resources</h3>
                      <button type="button" onClick={() => setResourceForms((current) => [...current, { ...emptyResource }])} className="text-xs font-bold text-primary">Add link</button>
                    </div>
                    <div className="space-y-3">
                      {resourceForms.map((resource, index) => (
                        <div key={index} className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className="wc-input" value={resource.resource_type} onChange={(event) => updateResource(index, { resource_type: event.target.value as ResourceType })}>
                              <option value="video">Video</option>
                              <option value="google_doc">Google Doc</option>
                              <option value="google_sheet">Google Sheet</option>
                              <option value="image">Image</option>
                              <option value="github">GitHub</option>
                              <option value="custom">Custom</option>
                            </select>
                            <input className="wc-input" placeholder="Resource title" value={resource.title} onChange={(event) => updateResource(index, { title: event.target.value })} />
                          </div>
                          <div className="mt-3 flex flex-col gap-3 md:flex-row">
                            <input className="wc-input flex-1" placeholder="https://..." value={resource.url} onChange={(event) => updateResource(index, { url: event.target.value })} />
                            {resourceForms.length > 1 ? <button type="button" onClick={() => setResourceForms((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-bold text-error">Remove</button> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setShowBulkTaskModal(false)} className="wc-secondary-btn">Cancel</button>
                    <button disabled={saving} className="wc-primary-btn">{saving ? "Assigning..." : "Assign Tasks"}</button>
                  </div>
                </form>
              ) : (
                <div className="p-5">
                  <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm">
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl"></div>
                    <div className="relative">
                      <h2 className="flex items-center gap-2 text-base font-black text-on-surface">
                        <Icon name="lock" className="text-primary" />
                        Read-only access
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">You can view assigned tasks, but creating new tasks is not enabled for this account.</p>
                    </div>
                  </section>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5"
            >
              <Icon name="open_in_new" className="text-sm" /> View full image
            </a>
            <button
              className="text-white hover:text-primary transition p-2"
              onClick={() => setLightboxUrl(null)}
            >
              <Icon name="close" className="text-2xl" />
            </button>
          </div>
          <img
            src={lightboxUrl}
            alt="Screenshot Preview"
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function SubmissionButton({ label, url, primary = false }: { label: string; url: string | null; primary?: boolean }) {
  if (!url) {
    return <div className="rounded-lg bg-white px-3 py-2 text-on-surface-variant">{label}: Not provided</div>;
  }

  return (
    <a
      href={normalizeAnyUrl(url)}
      target="_blank"
      rel="noreferrer"
      className={primary
        ? "flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
        : "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-primary transition hover:bg-primary/5"}
    >
      <span>{label}</span>
      <Icon name="open_in_new" className="text-base" />
    </a>
  );
}

function SubmissionLink({ label, url }: { label: string; url: string | null }) {
  return <SubmissionButton label={label} url={url} />;
}

function MetricCard({ label, value, icon, tone = "light" }: { label: string; value: string | number; icon: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={dark ? "rounded-2xl bg-primary p-4 text-white shadow-card" : "rounded-2xl border border-outline-variant bg-white p-4 shadow-sm"}>
      <div className={dark ? "mb-3 inline-flex rounded-xl bg-white/15 p-2" : "mb-3 inline-flex rounded-xl bg-surface-container p-2 text-primary"}>
        <Icon name={icon} className="text-lg" />
      </div>
      <p className={dark ? "text-xs font-bold text-blue-100" : "text-xs font-bold text-on-surface-variant"}>{label}</p>
      <p className={dark ? "text-2xl font-black text-white" : "text-2xl font-black text-primary"}>{value}</p>
    </div>
  );
}
