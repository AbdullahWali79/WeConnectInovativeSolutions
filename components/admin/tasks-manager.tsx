"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { GoogleDriveImagePreviews } from "@/components/admin/google-drive-image-previews";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { courseInScope, filterCoursesByScope, filterEnrollmentsByScope, loadTeacherCourseScope, type CourseScope } from "@/lib/admin-course-scope";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Course, CourseTopic, Enrollment, Profile, ResourceType, Submission, SubmissionStatus, Task, TaskResource } from "@/lib/supabase/types";
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

const taskCheckboxClass = "h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-blue-700 bg-blue-50 text-blue-700 accent-blue-700 checked:border-blue-700 checked:bg-blue-700 indeterminate:border-blue-700 indeterminate:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
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
  const [pagination, setPagination] = useState({ key: "", page: 1 });
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
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [bulkSelectedTopicId, setBulkSelectedTopicId] = useState("");
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
    const [studentResult, courseResult, topicResult, enrollmentResult, taskResult, resourceResult, submissionResult, screenshotResult, projectResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").eq("status", "approved").order("full_name"),
      supabase.from("courses").select("*").order("title"),
      supabase.from("course_topics").select("*").order("day_number"),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_resources").select("*").order("created_at", { ascending: true }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("submission_screenshots").select("*").order("created_at", { ascending: true }),
      supabase.from("student_projects").select("id", { count: "exact", head: true }),
    ]);
    const error = studentResult.error ?? courseResult.error ?? topicResult.error ?? enrollmentResult.error ?? taskResult.error ?? resourceResult.error ?? submissionResult.error ?? screenshotResult.error;
    if (error) setToast({ type: "error", message: error.message });
    const scopedEnrollments = filterEnrollmentsByScope(enrollmentResult.data ?? [], scope);
    const scopedStudentIds = new Set(scopedEnrollments.map((enrollment) => enrollment.student_id));
    setStudents(currentRole === "teacher" ? (studentResult.data ?? []).filter((student) => scopedStudentIds.has(student.id)) : (studentResult.data ?? []));
    setCourses(filterCoursesByScope(courseResult.data ?? [], scope));
    setCourseTopics((topicResult.data ?? []).filter((topic) => courseInScope(topic.course_id, scope)));
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
    const seenCourses = new Set<string>();
    return enrollmentOptions.filter((enrollment) => {
      const matchesStudent = !form.student_id || enrollment.student_id === form.student_id;
      if (!matchesStudent || seenCourses.has(enrollment.course_id)) return false;
      seenCourses.add(enrollment.course_id);
      return true;
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
  const singleCourseTopics = useMemo(
    () => courseTopics.filter((topic) => topic.course_id === form.course_id),
    [courseTopics, form.course_id],
  );
  const bulkCourseTopics = useMemo(
    () => courseTopics.filter((topic) => topic.course_id === bulkForm.course_id),
    [courseTopics, bulkForm.course_id],
  );

  function topicDescription(topic: CourseTopic) {
    return [
      `Day ${String(topic.day_number).padStart(2, "0")}`,
      topic.practice_project ? `Practice project:\n${topic.practice_project}` : "",
      topic.english_video ? `English learning resource:\n${topic.english_video}` : "",
      topic.urdu_video ? `Hindi / Urdu learning resource:\n${topic.urdu_video}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function applySingleTopic(topicId: string) {
    setSelectedTopicId(topicId);
    const topic = courseTopics.find((item) => item.id === topicId);
    if (!topic) return;
    setForm((current) => ({
      ...current,
      title: `Day ${String(topic.day_number).padStart(2, "0")}: ${topic.title}`,
      description: topicDescription(topic),
    }));
  }

  function applyBulkTopic(topicId: string) {
    setBulkSelectedTopicId(topicId);
    const topic = courseTopics.find((item) => item.id === topicId);
    if (!topic) return;
    setBulkForm((current) => ({
      ...current,
      title: `Day ${String(topic.day_number).padStart(2, "0")}: ${topic.title}`,
      description: topicDescription(topic),
    }));
  }
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
    return visibleTasks
      .filter((task) => task.workflow_type !== "daily")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [visibleTasks]);
  const paginationKey = JSON.stringify([activeView, query, studentFilter, courseFilter, statusFilter, dueDate, reviewedFilter]);
  const listedTasks = activeView === "assigned" ? assignedOnlyTasks : reviewVisibleTasks;
  const pageCount = Math.max(1, Math.ceil(listedTasks.length / 25));
  const currentPage = Math.min(pagination.key === paginationKey ? pagination.page : 1, pageCount);
  const pageTasks = listedTasks.slice((currentPage - 1) * 25, currentPage * 25);
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

  // The submission trigger synchronizes task status and course progress.
  // Apply confirmed rows without reloading every list or clearing other drafts.
  function applyReviewedSubmissions(updated: Submission[]) {
    const byId = new Map(updated.map((submission) => [submission.id, submission]));
    const byTaskId = new Map(updated.map((submission) => [submission.task_id, submission]));
    setSubmissions((current) => current.map((submission) => byId.get(submission.id) ?? submission));
    setTasks((current) => current.map((task) => {
      const submission = byTaskId.get(task.id);
      return submission ? { ...task, status: submission.status } : task;
    }));
    setSubmissionForms((current) => ({
      ...current,
      ...Object.fromEntries(updated.map((submission) => [submission.id, {
        status: submission.status,
        score: String(submission.score ?? 0),
        feedback: submission.feedback ?? "",
      }])),
    }));
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

    if (!bulkReviewFeedback.trim()) {
      setToast({ type: "error", message: "Admin feedback is required before accepting selected tasks." });
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
    const { data: updatedSubmissions, error: submissionError } = await supabase
      .from("submissions")
      .update({
        status: "reviewed",
        score,
        feedback: bulkReviewFeedback.trim(),
        reviewed_at: reviewedAt,
      })
      .in("id", selectedSubmissions.map((submission) => submission.id))
      .eq("status", "submitted")
      .select("*");

    if (submissionError) {
      setBulkReviewing(false);
      setToast({ type: "error", message: submissionError.message });
      return;
    }

    applyReviewedSubmissions(updatedSubmissions ?? []);

    setBulkReviewing(false);
    setBulkReviewSelection([]);
    setToast({ type: "success", message: `${updatedSubmissions?.length ?? 0} submissions accepted with ${score} marks.` });
  }

  async function saveSubmissionReview(submission: Submission, forcedStatus?: SubmissionStatus) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to review submissions." });
      return;
    }

    const form = submissionForms[submission.id];
    if (!form) return;

    const status = forcedStatus ?? form.status;
    if (!form.feedback.trim()) {
      setToast({ type: "error", message: "Admin feedback is required before saving a review." });
      return;
    }
    const score = status === "reviewed" ? Number(form.score) : 0;
    const maxScore = tasks.find((task) => task.id === submission.task_id)?.max_score ?? 100;
    if (status === "reviewed" && (!form.score.trim() || !Number.isFinite(score) || score < 0 || score > maxScore)) {
      setToast({ type: "error", message: `Enter marks between 0 and ${maxScore}.` });
      return;
    }

    setSubmissionBusyId(submission.id);
    const { data: updatedSubmission, error } = await supabase
      .from("submissions")
      .update({
        status,
        score,
        feedback: form.feedback.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id)
      .select("*")
      .single();

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
    applyReviewedSubmissions([updatedSubmission]);
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
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Tasks</h1>
          <p className="mt-1 text-xs text-on-surface-variant">Assign work, review submissions, and track results.</p>
        </div>
        {canCreate ? <div className="flex gap-2">
          <button type="button" onClick={() => setShowBulkTaskModal(true)} className="wc-secondary-btn !px-3 !py-2 !text-xs"><Icon name="group_add" /> Bulk assign</button>
          <button type="button" onClick={() => setShowTaskModal(true)} className="wc-primary-btn !px-3 !py-2 !text-xs"><Icon name="add" /> New task</button>
        </div> : null}
      </header>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total tasks" value={taskStats.total} icon="assignment" tone="dark" />
        <MetricCard label="Pending" value={taskStats.pending} icon="pending_actions" />
        <MetricCard label="Submitted" value={taskStats.submitted} icon="upload_file" />
        <MetricCard label="Accepted" value={taskStats.reviewed} icon="task_alt" />
        <MetricCard label="Needs revision" value={taskStats.revisions} icon="restart_alt" />
        <MetricCard label="Rejected" value={taskStats.rejected} icon="block" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <section className="wc-card overflow-hidden [&_.wc-input]:min-w-0 [&_.wc-input]:px-3 [&_.wc-input]:py-2 [&_.wc-input]:text-sm [&_.wc-input]:shadow-none [&_.wc-label]:text-[10px] [&_.wc-secondary-btn]:px-3 [&_.wc-secondary-btn]:py-2 [&_.wc-secondary-btn]:text-xs">
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
            <div className="space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
              <div>
                <h2 className="text-base font-black text-on-surface">Assigned tasks</h2>
                <p className="mt-1 text-xs text-on-surface-variant">View all assigned tasks separately from submission reviews.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Total {taskStats.total}</span>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-2.5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(180px,2fr)_repeat(3,minmax(120px,1fr))_150px_minmax(120px,1fr)]">
                <input aria-label="Search tasks" className="wc-input" placeholder="Search task title..." value={query} onChange={(event) => setQuery(event.target.value)} />
                <select aria-label="Filter by trainee" className="wc-input" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                  <option value="all">All Trainees</option>
                  {assignedTaskStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name ?? student.email}</option>)}
                </select>
                <select aria-label="Filter by course" className="wc-input" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                  <option value="all">All Courses</option>
                  {coursesWithEnrollments.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
                <select aria-label="Filter by task status" className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All Task Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="revision_required">Revision Required</option>
                  <option value="rejected">Rejected</option>
                </select>
                  <input aria-label="Filter by deadline" className="wc-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  <select aria-label="Filter by review status" className="wc-input" value={reviewedFilter} onChange={(event) => setReviewedFilter(event.target.value)}>
                    <option value="all">All Review</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="unreviewed">Unreviewed</option>
                  </select>
              </div>
            </div>
            <div className="space-y-3">
              {assignedOnlyTasks.length === 0 ? <div className="p-4"><EmptyState title="No assigned tasks" description="Create a new task to see it here." icon="assignment" /></div> : (
                <div className="divide-y divide-outline-variant/70">
                  {pageTasks.map((task) => {
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
                              {studentById.get(task.student_id)?.full_name ?? "Unknown student"} / {courseById.get(task.course_id)?.title ?? "Unknown course"} / Deadline {formatDateTime(task.deadline)}
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
            <div className="space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
              <div>
                <h2 className="text-base font-black text-on-surface">{activeView === "zero-marks" ? "Accepted submissions with zero marks" : "Submission review"}</h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {activeView === "zero-marks"
                    ? "These submissions were accepted but currently have 0 marks. Open one to correct its score."
                    : "Open submitted tasks, score them, and give feedback."}
                </p>
              </div>
              <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">{reviewVisibleTasks.length} matching tasks</span>
            </div>

            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-2.5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(180px,2fr)_repeat(3,minmax(120px,1fr))_150px_minmax(120px,1fr)]">
                <input aria-label="Search tasks" className="wc-input" placeholder="Search task title..." value={query} onChange={(event) => setQuery(event.target.value)} />
                <select aria-label="Filter by trainee" className="wc-input" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                  <option value="all">All Trainees</option>
                  {assignedTaskStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name ?? student.email}</option>)}
                </select>
                <select aria-label="Filter by course" className="wc-input" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                  <option value="all">All Courses</option>
                  {coursesWithEnrollments.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
                <select aria-label="Filter by task status" className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All Task Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="revision_required">Revision Required</option>
                  <option value="rejected">Rejected</option>
                </select>
                  <input aria-label="Filter by deadline" className="wc-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  <select aria-label="Filter by review status" className="wc-input" value={reviewedFilter} onChange={(event) => setReviewedFilter(event.target.value)}>
                    <option value="all">All Review</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="unreviewed">Unreviewed</option>
                  </select>
              </div>
            </div>
            {canCreate && activeView === "reviews" ? (
              <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[auto_90px_minmax(160px,1fr)_auto] xl:items-end">
                  <label className="flex min-h-9 items-center gap-2 text-xs font-semibold text-on-surface">
                    <input
                      type="checkbox"
                      ref={(input) => {
                        if (input) input.indeterminate = selectedBulkReviewTaskIds.length > 0 && !allVisibleSubmittedSelected;
                      }}
                      checked={allVisibleSubmittedSelected}
                      disabled={bulkReviewableTasks.length === 0 || bulkReviewing}
                      onChange={toggleAllVisibleSubmitted}
                      className={taskCheckboxClass}
                    />
                    Select all ({bulkReviewableTasks.length})
                  </label>
                  <label className="block">
                    <span className="wc-label">Marks</span>
                    <input
                      className="wc-input mt-1 bg-white"
                      type="number"
                      min="0"
                      value={bulkReviewScore}
                      onChange={(event) => setBulkReviewScore(event.target.value)}
                    />
                  </label>
                  <label className="block min-w-0 flex-1">
                    <span className="wc-label">Feedback</span>
                    <input
                      className="wc-input mt-1 bg-white"
                      value={bulkReviewFeedback}
                      onChange={(event) => setBulkReviewFeedback(event.target.value)}
                      placeholder="Very Good Work"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={selectedBulkReviewTaskIds.length === 0 || bulkReviewing}
                    onClick={() => void acceptSelectedSubmissions()}
                    className="wc-primary-btn !px-3 !py-2 !text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name={bulkReviewing ? "hourglass_empty" : "done_all"} />
                    {bulkReviewing ? "Accepting..." : `Accept Selected (${selectedBulkReviewTaskIds.length})`}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-on-surface-variant">Select all includes submitted tasks across all filtered pages. Marks and feedback apply to the selection.</p>
              </div>
            ) : null}

            {reviewVisibleTasks.length === 0 ? <div className="p-4"><EmptyState title={activeView === "zero-marks" ? "No accepted submissions with zero marks" : "No tasks matched"} description={activeView === "zero-marks" ? "All accepted submissions currently have marks greater than zero." : "Adjust filters or create a task."} icon={activeView === "zero-marks" ? "verified" : "assignment"} /></div> : (
              <div className="divide-y divide-outline-variant/70">
                {pageTasks.map((task) => {
                  const submission = submissionByTaskId.get(task.id);
                  const review = submission ? submissionForms[submission.id] : null;
                  const isExpanded = expandedTaskId === task.id;
                  const selected = selectedBulkReviewTaskIds.includes(task.id);
                  const busy = bulkReviewing || submissionBusyId === submission?.id;
                  return (
                    <article key={task.id} className={selected ? "bg-primary/[0.03]" : "bg-white"}>
                      <div className="flex items-center gap-3 px-2 py-3 sm:px-3">
                        {canCreate && submission?.status === "submitted" ? (
                          <input type="checkbox" aria-label={`Select ${task.title}`} checked={selected} disabled={bulkReviewing} onChange={() => toggleBulkReviewTask(task.id)} className={taskCheckboxClass} />
                        ) : <span className="w-5 shrink-0" />}
                        <button type="button" aria-expanded={isExpanded} aria-controls={`task-details-${task.id}`} onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-primary">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="min-w-0 break-words text-sm font-semibold text-on-surface">{task.title}</h3>
                              <StatusPill value={submission?.status ?? task.status} className="!px-2 !py-0.5 !text-[10px]" />
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                              <span className="font-medium text-on-surface">{studentById.get(task.student_id)?.full_name ?? "Unknown student"}</span>
                              <span>{courseById.get(task.course_id)?.title ?? "Unknown course"}</span>
                              {submission ? <span>{formatDateTime(submission.submitted_at)}</span> : <span>Awaiting submission</span>}
                            </div>
                          </div>
                          {submission?.status === "reviewed" ? <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">{submission.score}/{task.max_score}</span> : null}
                          <Icon name={isExpanded ? "expand_less" : "expand_more"} className="shrink-0 text-xl text-on-surface-variant" />
                        </button>
                      </div>
                      {isExpanded ? (
                        <div id={`task-details-${task.id}`} className="border-t border-outline-variant/50 bg-surface-container-low p-3 sm:p-4">
                          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="min-w-0 space-y-4">
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                                <span>Deadline: <strong className="font-medium text-on-surface">{formatDateTime(task.deadline)}</strong></span>
                                <span>Max score: <strong className="font-medium text-on-surface">{task.max_score}</strong></span>
                                {submission?.reviewed_at ? <span>Reviewed: {formatDateTime(submission.reviewed_at)}</span> : null}
                              </div>
                              <div>
                                <h4 className="mb-1.5 text-xs font-semibold text-on-surface">{submission ? "Student explanation" : "Task brief"}</h4>
                                <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{submission?.explanation || task.description || "No description provided."}</p>
                              </div>
                              {submission?.explanation && task.description && submission.explanation.trim() !== task.description.trim() ? (
                                <details className="text-xs text-on-surface-variant"><summary className="cursor-pointer font-semibold">Original task brief</summary><p className="mt-2 whitespace-pre-wrap break-words leading-5">{task.description}</p></details>
                              ) : null}
                              {submission ? <div>
                                <h4 className="mb-2 text-xs font-semibold text-on-surface">Proof &amp; attachments</h4>
                                <div className="flex flex-wrap gap-2">
                                  {submission.proof_url ? <SubmissionLink label="Proof link" url={submission.proof_url} /> : null}
                                  {submission.github_url ? <SubmissionLink label="GitHub" url={submission.github_url} /> : null}
                                  {submission.google_doc_url ? <SubmissionLink label="Google Doc" url={submission.google_doc_url} /> : null}
                                  {submission.google_sheet_url ? <SubmissionLink label="Google Sheet" url={submission.google_sheet_url} /> : null}
                                  {submission.image_url ? <SubmissionLink label="Image" url={submission.image_url} /> : null}
                                  {submission.youtube_url ? <SubmissionLink label="YouTube" url={submission.youtube_url} /> : null}
                                </div>
                                <GoogleDriveImagePreviews links={Array.isArray(submission.proof_links) ? submission.proof_links.filter((link): link is string => typeof link === "string" && Boolean(link.trim())) : []} />
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {screenshots.filter((screen) => screen.task_submission_id === submission.id).map((screen) => (
                                    <button key={screen.id} type="button" onClick={() => setLightboxUrl(screen.cdn_url)} className="h-20 w-28 overflow-hidden rounded-lg border border-outline-variant/50" aria-label={`View ${screen.original_filename}`}>
                                      <img src={screen.cdn_url} alt={screen.original_filename} loading="lazy" className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              </div> : null}
                              {resources.some((resource) => resource.task_id === task.id) ? <div className="flex flex-wrap gap-2">
                                {resources.filter((resource) => resource.task_id === task.id).map((resource) => <SubmissionLink key={resource.id} label={resource.title || "Task resource"} url={resource.url} />)}
                              </div> : null}
                              <div className="flex flex-wrap gap-2 border-t border-outline-variant/50 pt-3">
                                {canCreate ? <>
                                  <button type="button" onClick={() => { loadTaskTemplate(task); setShowTaskModal(true); }} className="wc-secondary-btn"><Icon name="content_copy" className="text-sm" /> Use template</button>
                                  <button type="button" disabled={saving} onClick={() => void duplicateTask(task)} className="wc-secondary-btn"><Icon name="post_add" className="text-sm" /> Duplicate</button>
                                </> : null}
                                {canDelete ? <button type="button" disabled={saving} onClick={() => deleteTask(task.id)} className="rounded-lg px-3 py-2 text-xs font-semibold text-error hover:bg-error-container">Delete</button> : null}
                              </div>
                            </div>
                            {submission && review ? (
                              <fieldset disabled={!canCreate || busy} className="min-w-0 space-y-3 rounded-xl border border-outline-variant/60 bg-white p-3 disabled:opacity-70">
                                <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2">
                                  <h4 className="text-sm font-semibold text-on-surface">Review submission</h4>
                                  <span className="text-xs tabular-nums text-on-surface-variant">{submission.score ?? 0} / {task.max_score}</span>
                                </div>
                                <div className="grid grid-cols-[1fr_100px] gap-2">
                                  <label className="block"><span className="wc-label">Status</span><select className="wc-input mt-1" value={review.status} onChange={(event) => updateSubmissionForm(submission.id, { status: event.target.value as SubmissionStatus })}>
                                    <option value="submitted">Submitted</option><option value="reviewed">Accept</option><option value="revision_required">Revise</option><option value="rejected">Reject</option>
                                  </select></label>
                                  <label className="block"><span className="wc-label">Marks / {task.max_score}</span><input type="number" min="0" max={task.max_score} className="wc-input mt-1" value={review.score} onChange={(event) => updateSubmissionForm(submission.id, { score: event.target.value })} /></label>
                                </div>
                                <label className="block"><span className="wc-label">Feedback *</span><textarea rows={3} className="wc-input mt-1 resize-y" value={review.feedback} onChange={(event) => updateSubmissionForm(submission.id, { feedback: event.target.value })} placeholder="Add clear feedback for the student..." /></label>
                                <button type="button" onClick={() => void saveSubmissionReview(submission)} className="wc-primary-btn w-full !py-2 !text-xs">{busy ? "Saving..." : "Save review"}</button>
                                <div className="grid grid-cols-3 gap-2">
                                  <button type="button" onClick={() => void saveSubmissionReview(submission, "reviewed")} className="rounded-lg bg-emerald-50 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">Accept</button>
                                  <button type="button" onClick={() => void saveSubmissionReview(submission, "revision_required")} className="rounded-lg bg-amber-50 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">Revise</button>
                                  <button type="button" onClick={() => void saveSubmissionReview(submission, "rejected")} className="rounded-lg bg-rose-50 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100">Reject</button>
                                </div>
                              </fieldset>
                            ) : <p className="rounded-xl border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">Waiting for the student to submit their work.</p>}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          )}
            <nav aria-label="Task pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 px-4 py-3 text-xs text-on-surface-variant">
              <span>{listedTasks.length ? `${(currentPage - 1) * 25 + 1}-${Math.min(currentPage * 25, listedTasks.length)} of ${listedTasks.length} tasks` : "0 tasks"}</span>
              <div className="flex items-center gap-3">
                <button type="button" disabled={currentPage === 1} onClick={() => { setPagination({ key: paginationKey, page: currentPage - 1 }); setExpandedTaskId(null); }} className="rounded-lg border border-outline-variant px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
                <span>Page {currentPage} of {pageCount}</span>
                <button type="button" disabled={currentPage === pageCount} onClick={() => { setPagination({ key: paginationKey, page: currentPage + 1 }); setExpandedTaskId(null); }} className="rounded-lg border border-outline-variant px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
              </div>
            </nav>
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
                        onChange={(event) => {
                          setForm((current) => ({ ...current, course_id: event.target.value, student_id: "" }));
                          setSelectedTopicId("");
                        }}
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

                  {singleCourseTopics.length > 0 ? (
                    <label className="mt-4 block">
                      <span className="wc-label">Course Topic</span>
                      <select className="wc-input mt-2" value={selectedTopicId} onChange={(event) => applySingleTopic(event.target.value)}>
                        <option value="">Choose a topic or enter task manually</option>
                        {singleCourseTopics.map((topic) => (
                          <option key={topic.id} value={topic.id}>Day {topic.day_number}: {topic.title}</option>
                        ))}
                      </select>
                      <span className="mt-2 block text-xs text-on-surface-variant">Selecting a topic fills the task title, practice project, and learning resources automatically.</span>
                    </label>
                  ) : null}

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
                          setBulkSelectedTopicId("");
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

                  {bulkCourseTopics.length > 0 ? (
                    <label className="mt-4 block">
                      <span className="wc-label">Course Topic</span>
                      <select className="wc-input mt-2" value={bulkSelectedTopicId} onChange={(event) => applyBulkTopic(event.target.value)}>
                        <option value="">Choose a topic or enter task manually</option>
                        {bulkCourseTopics.map((topic) => (
                          <option key={topic.id} value={topic.id}>Day {topic.day_number}: {topic.title}</option>
                        ))}
                      </select>
                      <span className="mt-2 block text-xs text-on-surface-variant">The selected topic will be assigned to every checked student.</span>
                    </label>
                  ) : null}

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
                                className={taskCheckboxClass}
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
                          setBulkSelectedTopicId("");
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

                  {bulkCourseTopics.length > 0 ? (
                    <label className="mt-4 block">
                      <span className="wc-label">Course Topic</span>
                      <select className="wc-input mt-2" value={bulkSelectedTopicId} onChange={(event) => applyBulkTopic(event.target.value)}>
                        <option value="">Choose a topic or enter task manually</option>
                        {bulkCourseTopics.map((topic) => (
                          <option key={topic.id} value={topic.id}>Day {topic.day_number}: {topic.title}</option>
                        ))}
                      </select>
                      <span className="mt-2 block text-xs text-on-surface-variant">The selected topic will be assigned to every checked student.</span>
                    </label>
                  ) : null}

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
                                className={taskCheckboxClass}
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
        : "inline-flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5"}
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
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${dark ? "border-primary bg-primary text-white" : "border-outline-variant/60 bg-white text-on-surface"}`}>
      <Icon name={icon} className={`text-xl ${dark ? "text-white/80" : "text-primary/70"}`} />
      <div><p className={`text-[11px] font-medium ${dark ? "text-white/80" : "text-on-surface-variant"}`}>{label}</p><p className="text-xl font-bold leading-6 tabular-nums">{value}</p></div>
    </div>
  );
}
