import type { Submission, Task } from "@/lib/supabase/types";

export const DEFAULT_TARGET_TASKS = 100;

export function isReviewedStatus(status: Task["status"] | Submission["status"] | undefined) {
  return status === "reviewed";
}

export function isRevisionRequiredStatus(status: Task["status"] | Submission["status"] | undefined) {
  return status === "revision_required";
}

export function isStartedStatus(status: Task["status"] | Submission["status"] | undefined) {
  return status === "submitted" || status === "in_progress" || status === "reviewed";
}

export function getCourseSignals(
  studentId: string,
  courseId: string,
  tasks: Task[],
  submissionByTaskId: Map<string, Submission>,
) {
  const courseTasks = tasks.filter((task) => task.student_id === studentId && task.course_id === courseId);
  const reviewedTasks = courseTasks.filter((task) => {
    const submissionStatus = submissionByTaskId.get(task.id)?.status;
    return isReviewedStatus(task.status) || isReviewedStatus(submissionStatus);
  }).length;
  const revisionRequiredTasks = courseTasks.filter((task) => {
    const submissionStatus = submissionByTaskId.get(task.id)?.status;
    return isRevisionRequiredStatus(task.status) || isRevisionRequiredStatus(submissionStatus);
  }).length;
  const startedTasks = courseTasks.filter((task) => {
    const submissionStatus = submissionByTaskId.get(task.id)?.status;
    return isStartedStatus(task.status) || isStartedStatus(submissionStatus);
  }).length;

  return {
    reviewedTasks,
    revisionRequiredTasks,
    startedTasks,
    totalTasks: courseTasks.length,
  };
}

export function deriveStudentProgressStatus(input: {
  isBlocked: boolean;
  isCompletedEnrollment: boolean;
  reviewedTasks: number;
  revisionRequiredTasks: number;
  startedTasks: number;
  targetTasks: number;
}): "active" | "completed" | "pending" | "dropped" {
  if (input.isBlocked) return "dropped";
  if (input.isCompletedEnrollment) return "completed";
  if (input.targetTasks > 0 && input.reviewedTasks >= input.targetTasks) return "completed";
  if (input.revisionRequiredTasks > 0) return "pending";
  if (input.startedTasks > 0) return "active";
  return "pending";
}

export function getProgressPercentage(input: {
  isCompletedEnrollment: boolean;
  reviewedTasks: number;
  targetTasks: number;
  enrollmentProgress?: number | null;
}) {
  if (input.isCompletedEnrollment) {
    return input.enrollmentProgress ?? 100;
  }

  return Math.min(100, Math.round((input.reviewedTasks / Math.max(input.targetTasks, 1)) * 100));
}
