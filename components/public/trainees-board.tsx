"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/loading-state";
import { Icon } from "@/components/icon";
import type { Course, Enrollment, ManualEnrollment, Profile, StudentFeeRecord, StudentProject, Submission, Task, Trainee } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/public/animations";
import { DEFAULT_TARGET_TASKS, deriveStudentProgressStatus, getCourseSignals, getProgressPercentage, isReviewedStatus } from "@/lib/student-progress-status";

const statusTone: Record<string, string> = {
  active: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  completed: "bg-green-500/20 text-green-300 border border-green-500/30",
  pending: "bg-[var(--wc-secondary)]/20 text-[var(--wc-secondary)] border border-[var(--wc-secondary)]/30",
  dropped: "bg-red-500/20 text-red-300 border border-red-500/30",
};

type TraineeView = {
  id: string;
  name: string;
  email: string;
  course_id: string | null;
  university: string | null;
  training_duration: string | null;
  assigned_tasks: number;
  completed_tasks: number;
  completed_projects: number;
  pending_tasks: number;
  progress_percentage: number;
  status: "active" | "completed" | "pending" | "dropped";
  created_at: string;
  updated_at: string;
  displayStatus: "active" | "completed" | "pending" | "dropped";
};

type TraineesBoardProps = {
  initialTrainees: Trainee[];
  initialCourses: Course[];
  initialFeeRecords: StudentFeeRecord[];
  initialStudents: Profile[];
  initialTasks: Task[];
  initialSubmissions: Submission[];
  initialEnrollments: Enrollment[];
  initialManualEnrollments: ManualEnrollment[];
  initialProjects: StudentProject[];
};

function compareMonthKeysDesc(a: string, b: string) {
  return b.localeCompare(a);
}

export function TraineesBoard({
  initialTrainees,
  initialCourses,
  initialFeeRecords,
  initialStudents,
  initialTasks,
  initialSubmissions,
  initialEnrollments,
  initialManualEnrollments,
  initialProjects,
}: TraineesBoardProps) {
  const [trainees] = useState<Trainee[]>(initialTrainees);
  const [courses] = useState<Course[]>(initialCourses);
  const [feeRecords] = useState<StudentFeeRecord[]>(initialFeeRecords);
  const [students] = useState<Profile[]>(initialStudents);
  const [tasks] = useState<Task[]>(initialTasks);
  const [submissions] = useState<Submission[]>(initialSubmissions);
  const [enrollments] = useState<Enrollment[]>(initialEnrollments);
  const [manualEnrollments] = useState<ManualEnrollment[]>(initialManualEnrollments);
  const [projects] = useState<StudentProject[]>(initialProjects);
  const [loading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [courseFilter, setCourseFilter] = useState("all");
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const studentByEmail = useMemo(() => new Map(students.map((student) => [student.email?.trim().toLowerCase() ?? "", student])), [students]);
  const traineeByEmail = useMemo(() => new Map(trainees.map((trainee) => [trainee.email.trim().toLowerCase(), trainee])), [trainees]);
  const submissionByTaskId = useMemo(() => new Map(submissions.map((submission) => [submission.task_id, submission])), [submissions]);
  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((enrollment) => enrollment.course_id)), [enrollments]);
  const enrolledCourses = useMemo(
    () => courses.filter((course) => enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds],
  );
  const manualEnrollmentByKey = useMemo(() => {
    return new Map(
      manualEnrollments.map((record) => [
        `${record.email?.trim().toLowerCase() ?? ""}::${record.course_name.trim().toLowerCase()}`,
        record,
      ]),
    );
  }, [manualEnrollments]);
  const enrollmentByStudentId = useMemo(() => {
    return enrollments.reduce((map, enrollment) => {
      const current = map.get(enrollment.student_id) ?? [];
      current.push(enrollment);
      map.set(enrollment.student_id, current);
      return map;
    }, new Map<string, Enrollment[]>());
  }, [enrollments]);

  const approvedProjectsByStudentAndCourse = useMemo(() => {
    return projects.reduce((map, project) => {
      if (!project.course_id || project.status !== "approved") return map;
      const key = `${project.student_id}:${project.course_id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }, [projects]);

  const traineesWithStatus = useMemo<TraineeView[]>(() => {
    const feeRecordsByStudentId = feeRecords.reduce((map, fee) => {
      const current = map.get(fee.student_id) ?? [];
      current.push(fee);
      map.set(fee.student_id, current);
      return map;
    }, new Map<string, StudentFeeRecord[]>());

    const reportsByStudentId = tasks.reduce((map, task) => {
      const key = task.student_id;
      const current = map.get(key) ?? [];
      current.push(task);
      map.set(key, current);
      return map;
    }, new Map<string, Task[]>());

    const reportsByStudentAndCourse = new Map<string, { tasks: Task[]; completed: number; pending: number; progress: number }>();
    for (const [studentId, studentTasks] of reportsByStudentId.entries()) {
      const taskByCourse = new Map<string, Task[]>();
      for (const task of studentTasks) {
        const current = taskByCourse.get(task.course_id) ?? [];
        current.push(task);
        taskByCourse.set(task.course_id, current);
      }

      for (const [courseId, courseTasks] of taskByCourse.entries()) {
        const completed = courseTasks.filter((task) => {
          const submissionStatus = submissionByTaskId.get(task.id)?.status;
          return isReviewedStatus(task.status) || isReviewedStatus(submissionStatus);
        }).length;
        const pending = Math.max(courseTasks.length - completed, 0);
        const progress = courseTasks.length > 0 ? Math.min(100, Math.round((completed / DEFAULT_TARGET_TASKS) * 100)) : 0;
        reportsByStudentAndCourse.set(`${studentId}:${courseId}`, { tasks: courseTasks, completed, pending, progress });
      }
    }

    const profileRows = students
      .filter((student) => student.role === "student")
      .map((student) => {
        const trainee = traineeByEmail.get(student.email?.trim().toLowerCase() ?? "");
        const records = (feeRecordsByStudentId.get(student.id) ?? []).sort((a, b) => compareMonthKeysDesc(a.month_key, b.month_key));
        const isBlocked = records.some((record) => record.blocked);
        const studentEnrollments = enrollmentByStudentId.get(student.id) ?? [];
        const latestEnrollment = studentEnrollments[0] ?? null;

        const selectedCourseId =
          latestEnrollment?.course_id ??
          trainee?.course_id ??
          [...records].sort((a, b) => compareMonthKeysDesc(a.month_key, b.month_key))[0]?.course_id ??
          tasks.find((task) => task.student_id === student.id)?.course_id ??
          null;
        const selectedSignals = selectedCourseId ? getCourseSignals(student.id, selectedCourseId, tasks, submissionByTaskId) : null;
        const taskStats = selectedCourseId ? reportsByStudentAndCourse.get(`${student.id}:${selectedCourseId}`) : null;
        const totalTasks = taskStats?.tasks.length ?? selectedSignals?.totalTasks ?? trainee?.assigned_tasks ?? 0;
        const completedTasks = taskStats?.completed ?? selectedSignals?.reviewedTasks ?? trainee?.completed_tasks ?? 0;
        const completedProjects = selectedCourseId ? (approvedProjectsByStudentAndCourse.get(`${student.id}:${selectedCourseId}`) ?? 0) : 0;
        const pendingTasks = taskStats?.pending ?? trainee?.pending_tasks ?? Math.max(totalTasks - completedTasks, 0);
        const reviewedTasks = selectedSignals?.reviewedTasks ?? completedTasks;
        const revisionRequiredTasks = selectedSignals?.revisionRequiredTasks ?? 0;
        const startedTasks = selectedSignals?.startedTasks ?? 0;
        const targetTasks = trainee?.assigned_tasks > 0 ? Math.max(trainee.assigned_tasks, DEFAULT_TARGET_TASKS) : DEFAULT_TARGET_TASKS;
        const isCompletedEnrollment = latestEnrollment?.status === "completed";
        const completedWork = reviewedTasks + completedProjects;
        const progressPercentage = getProgressPercentage({
          isCompletedEnrollment,
          reviewedTasks: completedWork,
          targetTasks,
          enrollmentProgress: latestEnrollment?.progress_percentage,
        });

        const derivedStatus: TraineeView["status"] = deriveStudentProgressStatus({
          isBlocked,
          isCompletedEnrollment,
          reviewedTasks: completedWork,
          revisionRequiredTasks,
          startedTasks,
          targetTasks,
        });
        const displayTotalTasks = derivedStatus === "completed" ? Math.max(totalTasks, targetTasks) : totalTasks;
        const displayCompletedTasks = derivedStatus === "completed" ? displayTotalTasks : completedTasks;
        const displayPendingTasks = derivedStatus === "completed" ? 0 : pendingTasks;
        const displayProgressPercentage = derivedStatus === "completed" ? 100 : progressPercentage;

        return {
          id: student.id,
          name: student.full_name ?? trainee?.name ?? student.email ?? "Student",
          email: student.email ?? trainee?.email ?? "",
          course_id: selectedCourseId ?? records[0]?.course_id ?? trainee?.course_id ?? null,
          university: trainee?.university ?? null,
          training_duration: trainee?.training_duration ?? null,
          assigned_tasks: displayTotalTasks,
          completed_tasks: displayCompletedTasks,
          completed_projects: completedProjects,
          pending_tasks: displayPendingTasks,
          progress_percentage: displayProgressPercentage,
          status: derivedStatus,
          created_at: trainee?.created_at ?? student.created_at,
          updated_at: trainee?.updated_at ?? student.created_at,
          displayStatus: derivedStatus,
        };
      });

    const matchedEmails = new Set(profileRows.map((row) => row.email.trim().toLowerCase()));
    const extraRows = trainees
      .filter((trainee) => !matchedEmails.has(trainee.email.trim().toLowerCase()))
      .map((trainee) => {
        const student = studentByEmail.get(trainee.email.trim().toLowerCase());
        const records = student
          ? (feeRecordsByStudentId.get(student.id) ?? []).sort((a, b) => compareMonthKeysDesc(a.month_key, b.month_key))
          : [];
        const isBlocked = records.some((record) => record.blocked);
        const studentEnrollments = student ? enrollmentByStudentId.get(student.id) ?? [] : [];
        const latestEnrollment = studentEnrollments[0] ?? null;
        const selectedSignals = student && trainee.course_id ? getCourseSignals(student.id, trainee.course_id, tasks, submissionByTaskId) : null;
        const taskStats = student && trainee.course_id ? reportsByStudentAndCourse.get(`${student.id}:${trainee.course_id}`) : null;
        const totalTasks = taskStats?.tasks.length ?? selectedSignals?.totalTasks ?? trainee.assigned_tasks;
        const completedTasks = taskStats?.completed ?? selectedSignals?.reviewedTasks ?? trainee.completed_tasks;
        const completedProjects = student && trainee.course_id ? (approvedProjectsByStudentAndCourse.get(`${student.id}:${trainee.course_id}`) ?? 0) : 0;
        const pendingTasks = taskStats?.pending ?? trainee.pending_tasks ?? Math.max(totalTasks - completedTasks, 0);
        const reviewedTasks = selectedSignals?.reviewedTasks ?? completedTasks;
        const revisionRequiredTasks = selectedSignals?.revisionRequiredTasks ?? 0;
        const startedTasks = selectedSignals?.startedTasks ?? 0;
        const targetTasks = trainee.assigned_tasks > 0 ? Math.max(trainee.assigned_tasks, DEFAULT_TARGET_TASKS) : DEFAULT_TARGET_TASKS;
        const manualRecord = student && trainee.course_id
          ? manualEnrollmentByKey.get(`${student.email?.trim().toLowerCase() ?? ""}::${courseById.get(trainee.course_id)?.title.trim().toLowerCase() ?? ""}`)
          : null;
        const isCompletedEnrollment = latestEnrollment?.status === "completed" || Boolean(manualRecord?.completion_date);
        const completedWork = reviewedTasks + completedProjects;
        const progressPercentage = getProgressPercentage({
          isCompletedEnrollment,
          reviewedTasks: completedWork,
          targetTasks,
          enrollmentProgress: latestEnrollment?.progress_percentage,
        });
        const derivedStatus: TraineeView["status"] = deriveStudentProgressStatus({
          isBlocked,
          isCompletedEnrollment,
          reviewedTasks: completedWork,
          revisionRequiredTasks,
          startedTasks,
          targetTasks,
        });
        const displayTotalTasks = derivedStatus === "completed" ? Math.max(totalTasks, targetTasks) : totalTasks;
        const displayCompletedTasks = derivedStatus === "completed" ? displayTotalTasks : completedTasks;
        const displayPendingTasks = derivedStatus === "completed" ? 0 : pendingTasks;
        const displayProgressPercentage = derivedStatus === "completed" ? 100 : progressPercentage;

        return {
          id: trainee.id,
          name: trainee.name,
          email: trainee.email,
          course_id: trainee.course_id,
          university: trainee.university ?? null,
          training_duration: trainee.training_duration ?? null,
          assigned_tasks: displayTotalTasks,
          completed_tasks: displayCompletedTasks,
          completed_projects: completedProjects,
          pending_tasks: displayPendingTasks,
          progress_percentage: displayProgressPercentage,
          status: derivedStatus,
          created_at: trainee.created_at,
          updated_at: trainee.updated_at,
          displayStatus: derivedStatus,
        };
      });

    return [...profileRows, ...extraRows];
  }, [feeRecords, studentByEmail, students, tasks, submissionByTaskId, traineeByEmail, trainees, enrollmentByStudentId, courseById, manualEnrollmentByKey, approvedProjectsByStudentAndCourse]);

  const filtered = useMemo(() => traineesWithStatus.filter((trainee) => {
    const text = `${trainee.name} ${trainee.email}`.toLowerCase();
    const queryMatch = text.includes(query.trim().toLowerCase());
    const statusMatch = statusFilter === "all" || trainee.displayStatus === statusFilter;
    const courseMatch = courseFilter === "all" || trainee.course_id === courseFilter;
    return queryMatch && statusMatch && courseMatch;
  }), [traineesWithStatus, query, statusFilter, courseFilter]);

  useEffect(() => {
    if (courseFilter !== "all" && !enrolledCourseIds.has(courseFilter)) {
      setCourseFilter("all");
    }
  }, [courseFilter, enrolledCourseIds]);

  function escapeXml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function downloadTraineeCard(trainee: TraineeView) {
    const width = 1200;
    const height = 760;
    const progressWidth = Math.max(0, Math.min(100, trainee.progress_percentage)) * 8.4;
    const safeName = escapeXml(trainee.name);
    const safeEmail = escapeXml(trainee.email);
    const safeCourse = escapeXml(trainee.course_id ? (courseById.get(trainee.course_id)?.title ?? "Not assigned") : "Not assigned");
    const safeUniversity = trainee.university ? escapeXml(trainee.university) : "";
    const safeDuration = trainee.training_duration ? escapeXml(trainee.training_duration) : "";
    const safeWebsite = "weconnectinnovation.online";

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#071738"/>
            <stop offset="100%" stop-color="#0b2458"/>
          </linearGradient>
          <linearGradient id="bar" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="var(--wc-secondary)"/>
            <stop offset="100%" stop-color="var(--wc-brand-accent)"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" rx="34" fill="url(#bg)"/>
        <rect x="26" y="26" width="${width - 52}" height="${height - 108}" rx="30" fill="var(--wc-surface-lowest)" stroke="rgba(255,255,255,0.10)"/>
        <circle cx="100" cy="104" r="34" fill="#ffffff"/>
        <text x="170" y="108" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${safeName}</text>
        <text x="170" y="150" fill="var(--wc-on-surface-variant)" font-family="Arial, sans-serif" font-size="22" font-weight="600">${safeEmail}</text>
        <text x="170" y="190" fill="#ffffff" font-family="Arial, sans-serif" font-size="22">Course: <tspan font-weight="700">${safeCourse}</tspan></text>
        ${safeUniversity ? `<rect x="170" y="220" rx="18" ry="18" width="${Math.max(140, safeUniversity.length * 11)}" height="34" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/><text x="188" y="243" fill="var(--wc-on-surface-variant)" font-family="Arial, sans-serif" font-size="16" font-weight="700">${safeUniversity}</text>` : ""}
        ${safeDuration ? `<rect x="${safeUniversity ? 170 + Math.max(140, safeUniversity.length * 11) + 14 : 170}" y="220" rx="18" ry="18" width="${Math.max(120, safeDuration.length * 10)}" height="34" fill="rgba(var(--landing-accent-rgb),0.10)" stroke="rgba(var(--landing-accent-rgb),0.20)"/><text x="${safeUniversity ? 188 + Math.max(140, safeUniversity.length * 11) + 14 : 188}" y="243" fill="var(--wc-secondary)" font-family="Arial, sans-serif" font-size="16" font-weight="700">${safeDuration}</text>` : ""}
        <rect x="90" y="320" width="1020" height="170" rx="24" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.05)"/>
        <text x="210" y="374" fill="#7D8BA6" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">ASSIGNED</text>
        <text x="210" y="424" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="800" text-anchor="middle">${trainee.assigned_tasks}</text>
        <line x1="345" y1="348" x2="345" y2="460" stroke="rgba(255,255,255,0.08)"/>
        <text x="465" y="374" fill="#7D8BA6" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">TASKS COMPLETED</text>
        <text x="465" y="424" fill="#22c55e" font-family="Arial, sans-serif" font-size="44" font-weight="800" text-anchor="middle">${trainee.completed_tasks}</text>
        <line x1="600" y1="348" x2="600" y2="460" stroke="rgba(255,255,255,0.08)"/>
        <text x="735" y="374" fill="#7D8BA6" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">PROJECTS COMPLETED</text>
        <text x="735" y="424" fill="#38bdf8" font-family="Arial, sans-serif" font-size="44" font-weight="800" text-anchor="middle">${trainee.completed_projects}</text>
        <line x1="870" y1="348" x2="870" y2="460" stroke="rgba(255,255,255,0.08)"/>
        <text x="990" y="374" fill="#7D8BA6" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">PENDING</text>
        <text x="990" y="424" fill="var(--wc-secondary)" font-family="Arial, sans-serif" font-size="44" font-weight="800" text-anchor="middle">${trainee.pending_tasks}</text>
        <text x="90" y="540" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="700">Progress</text>
        <text x="1110" y="540" fill="var(--wc-secondary)" font-family="Arial, sans-serif" font-size="22" font-weight="700" text-anchor="end">${trainee.progress_percentage}%</text>
        <rect x="90" y="558" width="1020" height="18" rx="9" fill="rgba(0,0,0,0.45)"/>
        <rect x="90" y="558" width="${progressWidth}" height="18" rx="9" fill="url(#bar)"/>
        <text x="90" y="650" fill="#5B6B88" font-family="Arial, sans-serif" font-size="18" font-weight="700">Enrolled: ${formatDate(trainee.created_at)}</text>
        <rect x="26" y="${height - 72}" width="${width - 52}" height="46" rx="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>
        <text x="${width / 2}" y="${height - 43}" fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="700" text-anchor="middle">We Connect Innovations Solutions · ${safeWebsite}</text>
        <text x="${width / 2}" y="${height - 20}" fill="var(--wc-on-surface-variant)" font-family="Arial, sans-serif" font-size="14" font-weight="600" text-anchor="middle">Download generated from trainee progress card</text>
      </svg>
    `;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${trainee.name.trim().replace(/\s+/g, "-").toLowerCase()}-card.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="flex h-[60vh] w-full items-center justify-center bg-[var(--wc-bg)]">
      <LoadingState label="Loading trainees..." />
    </div>
  );

  return (
    <section className="relative overflow-hidden bg-[var(--wc-bg)] py-20 lg:py-24">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></div>

      <div className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page">
        <FadeIn>
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-4">
              <Icon name="school" className="text-sm" /> Trainees
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-on-surface leading-tight">Trainee Progress Overview</h1>
            <p className="mt-4 max-w-3xl text-lg text-[var(--wc-on-surface-variant)]">Track trainee activity, assigned tasks, completion rates, and current status.</p>
          </div>

          <div className="mb-10 grid gap-4 md:grid-cols-4 bg-[var(--wc-surface-lowest)]/40 backdrop-blur-md p-6 rounded-3xl border border-[var(--wc-outline-variant)] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="relative md:col-span-2">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7D8BA6]" />
              <input
                className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] pl-11 pr-4 py-3 text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or email"
              />
            </div>
            <select
              className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
            >
              <option value="all" className="text-black">All Courses</option>
              {enrolledCourses.map((course) => <option key={course.id} value={course.id} className="text-black">{course.title}</option>)}
            </select>
            <select
              className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all" className="text-black">All Statuses</option>
              {Object.keys(statusTone).map((status) => <option key={status} value={status} className="text-black">{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
            </select>
          </div>
        </FadeIn>

        {filtered.length === 0 ? (
          <FadeIn>
            <div className="rounded-3xl border border-dashed border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-12 text-center backdrop-blur-md">
              <Icon name="monitoring" className="mx-auto text-5xl text-[var(--wc-on-surface-variant)]" />
              <h3 className="mt-5 text-2xl font-black text-on-surface">No trainees found</h3>
              <p className="mt-2 text-[var(--wc-on-surface-variant)]">Trainees matching your criteria will appear here.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid gap-6 lg:grid-cols-2" staggerDelay={0.05}>
            {filtered.map((trainee) => (
              <StaggerItem key={trainee.id}>
                <article className="group relative overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:border-[var(--wc-secondary)]/30 hover:bg-[var(--wc-surface-lowest)]/80">
                  <div className="mb-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => downloadTraineeCard(trainee)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] transition hover:bg-[var(--wc-secondary)]/15"
                    >
                      <Icon name="download" className="text-sm" />
                      Download Card
                    </button>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-on-surface group-hover:text-[var(--wc-secondary)] transition-colors">{trainee.name}</h3>
                      <p className="text-sm font-bold text-[var(--wc-on-surface-variant)] mb-2">{trainee.email}</p>
                      <p className="text-sm text-[var(--wc-on-surface-variant)] mb-4">Course: <strong className="text-on-surface">{trainee.course_id ? (courseById.get(trainee.course_id)?.title ?? "Unknown") : "Not assigned"}</strong></p>

                      <div className="flex flex-wrap gap-2">
                        {trainee.university ? <span className="rounded-full bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">{trainee.university}</span> : null}
                        {trainee.training_duration ? <span className="rounded-full bg-[var(--wc-secondary)]/10 border border-[var(--wc-secondary)]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{trainee.training_duration}</span> : null}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${statusTone[trainee.displayStatus] ?? "bg-[var(--wc-surface-low)] text-on-surface border border-[var(--wc-outline-variant)]"}`}>
                      {trainee.displayStatus}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-y-4 rounded-2xl bg-[var(--wc-surface-lowest)] p-4 text-center border border-[var(--wc-outline-variant)] sm:grid-cols-4 sm:gap-y-0">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D8BA6] mb-1">Assigned</p>
                      <strong className="text-xl font-black text-on-surface">{trainee.assigned_tasks}</strong>
                    </div>
                    <div className="border-l border-[var(--wc-outline-variant)]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D8BA6] mb-1">Tasks Completed</p>
                      <strong className="text-xl font-black text-green-400">{trainee.completed_tasks}</strong>
                    </div>
                    <div className="border-l border-[var(--wc-outline-variant)]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D8BA6] mb-1">Projects Completed</p>
                      <strong className="text-xl font-black text-sky-400">{trainee.completed_projects}</strong>
                    </div>
                    <div className="border-l border-[var(--wc-outline-variant)]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D8BA6] mb-1">Pending</p>
                      <strong className="text-xl font-black text-[var(--wc-secondary)]">{trainee.pending_tasks}</strong>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-on-surface">
                      <span>Progress</span>
                      <span className="text-[var(--wc-secondary)]">{trainee.progress_percentage}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 border border-[var(--wc-outline-variant)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] shadow-[0_0_10px_rgba(var(--landing-accent-rgb),0.5)] transition-all duration-1000 ease-out"
                        style={{ width: `${trainee.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-[#5B6B88]">
                    Enrolled: <span className="text-[var(--wc-on-surface-variant)]">{formatDate(trainee.created_at)}</span>
                  </p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </section>
  );
}
