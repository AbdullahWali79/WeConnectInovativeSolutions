"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  getPermissionLabels,
  isTeacherSelectablePermissionKey,
  TEACHER_SELECTABLE_PERMISSION_KEYS,
  type PermissionKey,
  type TeacherSelectablePermissionKey,
} from "@/lib/admin-permissions";
import {
  hasPermission,
  isMainAdmin,
  requireAdminOnly,
  requirePermission,
} from "@/lib/admin-access";
import type { AdminSignatureSettings, BrandingScope, BrandingSettingsSnapshot, ClientHuntLead, Course, Enrollment, InternshipLetter, ManualEnrollment, ManualEnrollmentComment, Profile, ProfileStatus, SoftwareHouse, StudentFeeRecord, Submission, Task } from "@/lib/supabase/types";
import { internshipLetterSchema, type InternshipLetterFormValues } from "@/lib/validations/internship-letter";
import type { BrandingSettingsInput } from "@/lib/branding-settings";
import { getMissingProfileLinks, isStudentProfileComplete } from "@/lib/profile-links";

export interface CreateTeacherInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  permissions: TeacherSelectablePermissionKey[];
}

export interface UpdateTeacherInput {
  fullName: string;
  email: string;
  phone: string;
}

export type TeacherAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "teacher";
  status: ProfileStatus;
  createdAt: string | null;
  permissions: TeacherSelectablePermissionKey[];
  permissionLabels: string[];
};

export type ProductContributorCandidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  courseTitle: string;
  feeMonth: string;
  hasProductAccess: boolean;
};

export type FeeRecordInput = {
  id?: string;
  student_id: string;
  enrollment_id?: string | null;
  course_id: string;
  month_key: string;
  amount_due: number;
  amount_paid: number;
  due_date?: string | null;
  paid_at?: string | null;
  status: "pending" | "paid" | "partial" | "overdue" | "waived";
  payment_method?: string | null;
  notes?: string | null;
};

export type StudentTaskDetail = {
  studentId: string;
  studentName: string;
  email: string;
  courseTitle: string;
  taskTitle?: string;
  joinedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  status: "submitted" | "pending";
  feedback?: string | null;
  taskStatus?: string | null;
};

export type DailyPendingReportRow = {
  studentId: string;
  studentName: string;
  taskTitles: string;
  clientHuntTitles: string;
  status: "submitted" | "pending";
};

export type DailyUnpaidReportRow = {
  studentId: string;
  studentName: string;
  courseTitles: string;
  taskTitles: string;
  feedback: string;
  feeStatus: string;
  status: "submitted" | "pending";
};

export type PaidFeeStudentDetail = {
  studentId: string;
  studentName: string;
  email: string;
  courseId: string;
  courseTitle: string;
  monthKey: string;
  amountDue: number;
  amountPaid: number;
  status: "paid" | "waived";
};

export type StudentWorkSummary = {
  studentId: string;
  studentName: string;
  email: string;
  paidFeesCount: number;
  tasksCompletedCount: number;
  clientHuntsDoneCount: number;
};

export type TaskAnalyticsDashboardData = {
  totalActiveStudents: number;
  todaySubmittedCount: number;
  completedTasksCount: number;
  pendingStudentsCount: number;
  paidFeeStudentsCount: number;
  clientHuntingAssignedCount: number;
  clientHuntingPendingCount: number;
  todaySubmittedStudents: StudentTaskDetail[];
  todayNotSubmittedStudents: StudentTaskDetail[];
  dailyPendingReportRows: DailyPendingReportRow[];
  dailyUnpaidReportRows: DailyUnpaidReportRow[];
  allTaskDetails: StudentTaskDetail[];
  pendingStudents: StudentTaskDetail[];
  activeStudents: StudentTaskDetail[];
  paidFeeStudents: PaidFeeStudentDetail[];
  unpaidFeeStudentsCount: number;
  unpaidActiveStudents: StudentTaskDetail[];
  unpaidTaskDetails: StudentTaskDetail[];
  clientHuntingAssignedStudents: StudentTaskDetail[];
  clientHuntingPendingStudents: StudentTaskDetail[];
  studentWorkSummaries: StudentWorkSummary[];
  report: {
    totalStudents: number;
    submittedStudents: StudentTaskDetail[];
    notSubmittedStudents: StudentTaskDetail[];
  };
};

async function ensureEnrollmentForFeeRecord(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  studentId: string,
  courseId: string,
) {
  const { data: existingEnrollment, error: existingError } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingEnrollment?.id) {
    return existingEnrollment.id as string;
  }

  const { data: createdEnrollment, error: createError } = await supabaseAdmin
    .from("enrollments")
    .upsert(
      {
        student_id: studentId,
        course_id: courseId,
        status: "active",
      },
      { onConflict: "student_id,course_id" },
    )
    .select("id")
    .single();

  if (createError || !createdEnrollment?.id) {
    throw new Error(createError?.message || "Failed to create enrollment for fee record.");
  }

  return createdEnrollment.id as string;
}

type ActionResult<T = null> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

const emailPattern = /^\S+@\S+\.\S+$/;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toTeacherAccount(profile: Profile, permissions: TeacherSelectablePermissionKey[] = []): TeacherAccount {
  return {
    id: profile.id,
    fullName: profile.full_name ?? "Unnamed teacher",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    role: "teacher",
    status: profile.status,
    createdAt: profile.created_at ?? null,
    permissions,
    permissionLabels: getPermissionLabels(permissions),
  };
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

function validateTeacherProfileInput(input: UpdateTeacherInput) {
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = input.phone.trim();

  if (!fullName) {
    throw new Error("Teacher name is required.");
  }

  if (!emailPattern.test(email)) {
    throw new Error("A valid email address is required.");
  }

  if (!phone) {
    throw new Error("Phone number is required.");
  }

  return { fullName, email, phone };
}

function validateTeacherPermissions(permissionKeys: readonly string[]) {
  const uniqueKeys = Array.from(new Set(permissionKeys));
  const invalidKey = uniqueKeys.find((permissionKey) => !isTeacherSelectablePermissionKey(permissionKey));

  if (invalidKey) {
    throw new Error(`Invalid teacher permission selected: ${invalidKey}`);
  }

  if (uniqueKeys.length === 0) {
    throw new Error("Select at least one teacher permission.");
  }

  return uniqueKeys as TeacherSelectablePermissionKey[];
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function sortStudentTaskDetails(rows: StudentTaskDetail[]) {
  return [...rows].sort((first, second) => {
    const nameCompare = first.studentName.localeCompare(second.studentName);
    if (nameCompare !== 0) return nameCompare;
    return first.courseTitle.localeCompare(second.courseTitle);
  });
}

function sortDailyPendingReportRows(rows: DailyPendingReportRow[]) {
  return [...rows].sort((first, second) => first.studentName.localeCompare(second.studentName));
}

function toStudentTaskDetail({
  student,
  course,
  enrollment,
  task,
  submission,
  status,
}: {
  student: Profile | undefined;
  course: Course | undefined;
  enrollment: Enrollment;
  task?: Task;
  submission?: Submission;
  status: "submitted" | "pending";
}): StudentTaskDetail {
  return {
    studentId: enrollment.student_id,
    studentName: student?.full_name || "Unknown student",
    email: student?.email || "",
    courseTitle: course?.title || "Unknown course",
    taskTitle: task?.title,
    joinedAt: enrollment.created_at,
    submittedAt: submission?.submitted_at ?? task?.created_at ?? null,
    reviewedAt: submission?.reviewed_at ?? null,
    status,
    feedback: submission?.feedback ?? null,
    taskStatus: submission?.status ?? task?.status ?? null,
  };
}

function toClientHuntingTaskDetail(profile: Profile): StudentTaskDetail {
  const missingLinks = getMissingProfileLinks(profile).length;
  const profileComplete = isStudentProfileComplete(profile);

  return {
    studentId: profile.id,
    studentName: profile.full_name || profile.email || "Unknown student",
    email: profile.email || "",
    courseTitle: "Client Hunting",
    taskTitle: profileComplete ? "Client Hunting Profile Complete" : `Client Hunting Profile Links (${missingLinks} missing)`,
    joinedAt: profile.created_at,
    submittedAt: profileComplete ? profile.created_at : null,
    reviewedAt: null,
    status: profileComplete ? "submitted" : "pending",
    feedback: null,
    taskStatus: profileComplete ? "reviewed" : "pending",
  };
}

function firstDetailPerStudent(rows: StudentTaskDetail[]) {
  const byStudent = new Map<string, StudentTaskDetail>();

  for (const row of rows) {
    const existing = byStudent.get(row.studentId);
    if (!existing) {
      byStudent.set(row.studentId, row);
      continue;
    }

    if (row.status === "submitted" && existing.status !== "submitted") {
      byStudent.set(row.studentId, row);
      continue;
    }

    if (row.submittedAt && (!existing.submittedAt || row.submittedAt > existing.submittedAt)) {
      byStudent.set(row.studentId, row);
    }
  }

  return sortStudentTaskDetails(Array.from(byStudent.values()));
}

function getPakistanDayBounds(dateStr: string): { startIso: string; endIso: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startPktInUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 5 * 60 * 60 * 1000);
  const endPktInUtc = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 5 * 60 * 60 * 1000);
  return {
    startIso: startPktInUtc.toISOString(),
    endIso: endPktInUtc.toISOString(),
  };
}

function getPakistanDateContext() {
  const nowInPkt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const year = nowInPkt.getUTCFullYear();
  const month = String(nowInPkt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(nowInPkt.getUTCDate()).padStart(2, "0");
  return {
    todayPktStr: `${year}-${month}-${day}`,
  };
}

export async function getTaskAnalyticsDashboardData(): Promise<TaskAnalyticsDashboardData> {
  await requireAdminOnly();

  const supabaseAdmin = createSupabaseServiceClient();
  const [enrollmentResult, clientHuntingProfileResult] = await Promise.all([
    supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("status", "approved")
      .order("full_name", { ascending: true }),
  ]);

  const enrollmentError = enrollmentResult.error ?? clientHuntingProfileResult.error;

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  const activeEnrollments = (enrollmentResult.data ?? []) as Enrollment[];
  if (activeEnrollments.length === 0) {
    const clientHuntingAssignedStudents = sortStudentTaskDetails(
      ((clientHuntingProfileResult.data ?? []) as Profile[]).map(toClientHuntingTaskDetail),
    );
    const clientHuntingPendingStudents = sortStudentTaskDetails(
      clientHuntingAssignedStudents.filter((detail) => detail.status === "pending"),
    );

    return {
      totalActiveStudents: 0,
      todaySubmittedCount: 0,
      completedTasksCount: 0,
      pendingStudentsCount: 0,
      paidFeeStudentsCount: 0,
      clientHuntingAssignedCount: uniqueCount(clientHuntingAssignedStudents.map((detail) => detail.studentId)),
      clientHuntingPendingCount: uniqueCount(clientHuntingPendingStudents.map((detail) => detail.studentId)),
      todaySubmittedStudents: [],
      todayNotSubmittedStudents: [],
      dailyPendingReportRows: [],
      dailyUnpaidReportRows: [],
      allTaskDetails: [],
      pendingStudents: [],
      activeStudents: [],
      paidFeeStudents: [],
      unpaidFeeStudentsCount: 0,
      unpaidActiveStudents: [],
      unpaidTaskDetails: [],
      clientHuntingAssignedStudents,
      clientHuntingPendingStudents,
      studentWorkSummaries: [],
      report: {
        totalStudents: 0,
        submittedStudents: [],
        notSubmittedStudents: [],
      },
    };
  }

  const clientHuntingAssignedStudents = sortStudentTaskDetails(
    ((clientHuntingProfileResult.data ?? []) as Profile[]).map(toClientHuntingTaskDetail),
  );
  const clientHuntingPendingStudents = sortStudentTaskDetails(
    clientHuntingAssignedStudents.filter((detail) => detail.status === "pending"),
  );
  const activeStudentIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.student_id)));
  const courseIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.course_id)));

  const { todayPktStr } = getPakistanDateContext();

  const { data: feeRecordsData, error: feeRecordsError } = await supabaseAdmin
    .from("student_fee_records")
    .select("student_id,course_id,month_key,amount_due,amount_paid,status,due_date,updated_at")
    .in("student_id", activeStudentIds)
    .in("course_id", courseIds)
    .order("updated_at", { ascending: false });

  if (feeRecordsError) {
    throw new Error(feeRecordsError.message);
  }

  const { data: clientHuntLeadsData, error: clientHuntLeadsError } = await supabaseAdmin
    .from("client_hunt_leads")
    .select("student_id,status,updated_at")
    .in("student_id", activeStudentIds);

  if (clientHuntLeadsError) {
    throw new Error(clientHuntLeadsError.message);
  }

  const latestFeeRecordByEnrollment = new Map<string, StudentFeeRecord>();
  for (const feeRecord of (feeRecordsData ?? []) as StudentFeeRecord[]) {
    const key = `${feeRecord.student_id}:${feeRecord.course_id}`;
    const currentRecord = latestFeeRecordByEnrollment.get(key);
    if (!currentRecord || feeRecord.updated_at > currentRecord.updated_at) {
      latestFeeRecordByEnrollment.set(key, feeRecord);
    }
  }

  const eligibleEnrollments = activeEnrollments.filter((enrollment) => {
    const feeRecord = latestFeeRecordByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`);
    if (!feeRecord) return false;
    if (feeRecord.status !== "paid" && feeRecord.status !== "waived") return false;
    return true;
  });
  const unpaidEnrollments = activeEnrollments.filter((enrollment) => {
    const feeRecord = latestFeeRecordByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`);
    return !feeRecord || (feeRecord.status !== "paid" && feeRecord.status !== "waived");
  });

  const eligibleStudentIds = new Set(eligibleEnrollments.map((enrollment) => enrollment.student_id));
  const paidActiveEnrollments = eligibleEnrollments;
  const paidActiveStudentIds = Array.from(eligibleStudentIds);

  const allActiveStudentIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.student_id)));
  const allCourseIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.course_id)));

  const [studentResult, courseResult, taskResult, submissionResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").in("id", allActiveStudentIds),
    supabaseAdmin.from("courses").select("*").in("id", allCourseIds),
    supabaseAdmin.from("tasks").select("*").in("student_id", allActiveStudentIds).in("course_id", allCourseIds).order("created_at", { ascending: false }),
    supabaseAdmin.from("submissions").select("*").in("student_id", allActiveStudentIds).order("submitted_at", { ascending: false }),
  ]);

  const error = studentResult.error ?? courseResult.error ?? taskResult.error ?? submissionResult.error;
  if (error) {
    throw new Error(error.message);
  }

  const students = (studentResult.data ?? []) as Profile[];
  const courses = (courseResult.data ?? []) as Course[];
  const tasks = ((taskResult.data ?? []) as Task[]).filter((task) =>
    activeEnrollments.some((enrollment) => enrollment.student_id === task.student_id && enrollment.course_id === task.course_id),
  );
  const activeTaskIds = new Set(tasks.map((task) => task.id));
  const submissions = ((submissionResult.data ?? []) as Submission[]).filter((submission) => activeTaskIds.has(submission.task_id));
  const clientHuntLeads = (clientHuntLeadsData ?? []) as ClientHuntLead[];

  const studentById = new Map(students.map((student) => [student.id, student]));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const latestPaidFeeByStudent = new Map<string, PaidFeeStudentDetail & { updatedAt: string }>();

  for (const feeRecord of latestFeeRecordByEnrollment.values()) {
    if (feeRecord.status !== "paid" && feeRecord.status !== "waived") continue;

    const student = studentById.get(feeRecord.student_id);
    const course = courseById.get(feeRecord.course_id);
    const current = latestPaidFeeByStudent.get(feeRecord.student_id);

    if (current && current.updatedAt >= feeRecord.updated_at) {
      continue;
    }

    latestPaidFeeByStudent.set(feeRecord.student_id, {
      studentId: feeRecord.student_id,
      studentName: student?.full_name || "Unknown student",
      email: student?.email || "",
      courseId: feeRecord.course_id,
      courseTitle: course?.title || "Unknown course",
      monthKey: feeRecord.month_key,
      amountDue: Number(feeRecord.amount_due ?? 0),
      amountPaid: Number(feeRecord.amount_paid ?? 0),
      status: feeRecord.status,
      updatedAt: feeRecord.updated_at,
    });
  }

  const paidFeeStudents = Array.from(latestPaidFeeByStudent.values())
    .sort((first, second) => first.studentName.localeCompare(second.studentName))
    .map((detail) => ({
      studentId: detail.studentId,
      studentName: detail.studentName,
      email: detail.email,
      courseId: detail.courseId,
      courseTitle: detail.courseTitle,
      monthKey: detail.monthKey,
      amountDue: detail.amountDue,
      amountPaid: detail.amountPaid,
      status: detail.status,
    }));

  const tasksByEnrollment = new Map<string, Task[]>();
  const latestSubmissionByTask = new Map<string, Submission>();

  for (const task of tasks) {
    const key = `${task.student_id}:${task.course_id}`;
    tasksByEnrollment.set(key, [...(tasksByEnrollment.get(key) ?? []), task]);
  }

  for (const submission of submissions) {
    const current = latestSubmissionByTask.get(submission.task_id);
    if (!current || submission.submitted_at > current.submitted_at) {
      latestSubmissionByTask.set(submission.task_id, submission);
    }
  }

  function buildTaskDetailsForEnrollments(enrollments: Enrollment[]) {
    const taskDetails: StudentTaskDetail[] = [];
    const activeDetails: StudentTaskDetail[] = [];

    for (const enrollment of enrollments) {
      const key = `${enrollment.student_id}:${enrollment.course_id}`;
      const enrollmentTasks = tasksByEnrollment.get(key) ?? [];
      const student = studentById.get(enrollment.student_id);
      const course = courseById.get(enrollment.course_id);
      let firstDetailForEnrollment: StudentTaskDetail | null = null;

      if (enrollmentTasks.length === 0) {
        activeDetails.push(toStudentTaskDetail({ student, course, enrollment, status: "pending" }));
        continue;
      }

      for (const task of enrollmentTasks) {
        const submission = latestSubmissionByTask.get(task.id);
        const detail = toStudentTaskDetail({
          student,
          course,
          enrollment,
          task,
          submission,
          status: (submission || ["submitted", "reviewed", "rejected", "revision_required"].includes(task.status)) ? "submitted" : "pending",
        });
        if (!firstDetailForEnrollment) {
          firstDetailForEnrollment = detail;
        }
        taskDetails.push(detail);
      }

      activeDetails.push(firstDetailForEnrollment ?? toStudentTaskDetail({ student, course, enrollment, status: "pending" }));
    }

    return { taskDetails, activeDetails };
  }

  const { taskDetails, activeDetails } = buildTaskDetailsForEnrollments(paidActiveEnrollments);
  const { taskDetails: unpaidTaskDetails, activeDetails: unpaidActiveDetails } = buildTaskDetailsForEnrollments(unpaidEnrollments);

  const paidFeeCountByStudent = new Map<string, number>();
  for (const enrollment of paidActiveEnrollments) {
    paidFeeCountByStudent.set(enrollment.student_id, (paidFeeCountByStudent.get(enrollment.student_id) ?? 0) + 1);
  }

  const reviewedTaskCountByStudent = new Map<string, number>();
  for (const detail of taskDetails) {
    if (detail.taskStatus !== "reviewed") continue;
    reviewedTaskCountByStudent.set(detail.studentId, (reviewedTaskCountByStudent.get(detail.studentId) ?? 0) + 1);
  }

  const approvedClientHuntCountByStudent = new Map<string, number>();
  for (const lead of clientHuntLeads) {
    if (lead.status !== "approved") continue;
    approvedClientHuntCountByStudent.set(lead.student_id, (approvedClientHuntCountByStudent.get(lead.student_id) ?? 0) + 1);
  }

  const studentWorkSummaries = paidFeeStudents
    .map((student) => ({
      studentId: student.studentId,
      studentName: student.studentName,
      email: student.email,
      paidFeesCount: paidFeeCountByStudent.get(student.studentId) ?? 0,
      tasksCompletedCount: reviewedTaskCountByStudent.get(student.studentId) ?? 0,
      clientHuntsDoneCount: approvedClientHuntCountByStudent.get(student.studentId) ?? 0,
    }))
    .sort((first, second) => first.studentName.localeCompare(second.studentName));

  const { startIso: todayStartIso, endIso: tomorrowStartIso } = getPakistanDayBounds(todayPktStr);

  const todaySubmittedStudents = sortStudentTaskDetails(
    taskDetails.filter((detail) => {
      const activeDate = detail.reviewedAt ?? detail.submittedAt;
      return activeDate && activeDate >= todayStartIso && activeDate < tomorrowStartIso;
    }),
  );
  const todayNotSubmittedStudents = sortStudentTaskDetails(
    taskDetails
      .filter((detail) => {
        const activeDate = detail.reviewedAt ?? detail.submittedAt;
        return !activeDate || activeDate < todayStartIso || activeDate >= tomorrowStartIso;
      })
      .map((detail) => ({ ...detail, status: "pending" as const, submittedAt: null, reviewedAt: null })),
  );
  const pendingStudents = sortStudentTaskDetails(taskDetails.filter((detail) => detail.status === "pending"));
  const submittedReportStudents = firstDetailPerStudent(taskDetails.filter((detail) => detail.status === "submitted"));
  const submittedReportStudentIds = new Set(submittedReportStudents.map((detail) => detail.studentId));
  const activeDetailsByStudent = firstDetailPerStudent([...activeDetails, ...taskDetails]);
  const notSubmittedReportStudents = activeDetailsByStudent
    .filter((detail) => !submittedReportStudentIds.has(detail.studentId))
    .map((detail) => ({ ...detail, status: "pending" as const, submittedAt: null, reviewedAt: null }));

  const dailyPendingReportRows = sortDailyPendingReportRows(
    paidActiveEnrollments.map((enrollment) => {
      const student = studentById.get(enrollment.student_id);
      const enrollmentTasks = tasksByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`) ?? [];
      const todaysTaskTitles = enrollmentTasks
        .map((task) => {
          const submission = latestSubmissionByTask.get(task.id);
          const submittedAt = submission?.submitted_at ?? task.created_at ?? null;
          const reviewedAt = submission?.reviewed_at ?? null;
          const activeDate = reviewedAt ?? submittedAt;
          if (!activeDate || activeDate < todayStartIso || activeDate >= tomorrowStartIso) {
            return null;
          }
          return task.title;
        })
        .filter((title): title is string => Boolean(title));
      const todaysClientHuntTitles = enrollmentTasks
        .map((task) => {
          const submission = latestSubmissionByTask.get(task.id);
          const submittedAt = submission?.submitted_at ?? task.created_at ?? null;
          const reviewedAt = submission?.reviewed_at ?? null;
          const activeDate = reviewedAt ?? submittedAt;
          if (!activeDate || activeDate < todayStartIso || activeDate >= tomorrowStartIso) {
            return null;
          }
          const title = task.title?.trim();
          if (!title || !title.toLowerCase().includes("client hunting")) {
            return null;
          }
          return title;
        })
        .filter((title): title is string => Boolean(title));

      return {
        studentId: enrollment.student_id,
        studentName: student?.full_name || "Unknown student",
        taskTitles: todaysTaskTitles.length > 0 ? todaysTaskTitles.join(", ") : "Nothing Submitted",
        clientHuntTitles: todaysClientHuntTitles.length > 0 ? todaysClientHuntTitles.join(", ") : "Nothing Submitted",
        status: todaysTaskTitles.length > 0 ? "submitted" : "pending",
      };
    }),
  );

  const dailyUnpaidReportRows: DailyUnpaidReportRow[] = Array.from(new Map(unpaidActiveDetails.map((detail) => [detail.studentId, detail])).values())
    .map((detail) => {
      const todaysTaskTitles = unpaidTaskDetails
        .filter((item) => item.studentId === detail.studentId)
        .map((taskDetail) => {
          const activeDate = taskDetail.reviewedAt ?? taskDetail.submittedAt;
          if (!activeDate || activeDate < todayStartIso || activeDate >= tomorrowStartIso) return null;
          return taskDetail.taskTitle?.trim() || null;
        })
        .filter((title): title is string => Boolean(title));
      const todaysFeedback = unpaidTaskDetails
        .filter((item) => item.studentId === detail.studentId)
        .map((taskDetail) => {
          const activeDate = taskDetail.reviewedAt ?? taskDetail.submittedAt;
          if (!activeDate || activeDate < todayStartIso || activeDate >= tomorrowStartIso) return null;
          return taskDetail.feedback?.trim() || null;
        })
        .filter((value): value is string => Boolean(value));
      const courseTitles = Array.from(
        new Set(
          unpaidTaskDetails
            .filter((item) => item.studentId === detail.studentId)
            .map((taskDetail) => taskDetail.courseTitle)
            .filter(Boolean),
        ),
      ).sort((first, second) => first.localeCompare(second));
      const row = {
        studentId: detail.studentId,
        studentName: detail.studentName,
        courseTitles: courseTitles.length > 0 ? courseTitles.join(", ") : detail.courseTitle,
        taskTitles: todaysTaskTitles.length > 0 ? todaysTaskTitles.join(", ") : "Nothing Submitted",
        feedback: todaysFeedback.length > 0 ? todaysFeedback.join("; ") : "No feedback",
        feeStatus: "Unpaid",
        status: todaysTaskTitles.length > 0 ? "submitted" : "pending",
      } satisfies DailyUnpaidReportRow;
      return row;
    })
    .sort((first, second) => first.studentName.localeCompare(second.studentName));

  return {
    totalActiveStudents: uniqueCount(paidActiveStudentIds),
    todaySubmittedCount: uniqueCount(todaySubmittedStudents.map((detail) => detail.studentId)),
    completedTasksCount: taskDetails.filter((detail) => detail.taskStatus === "reviewed").length,
    pendingStudentsCount: uniqueCount(pendingStudents.map((detail) => detail.studentId)),
    paidFeeStudentsCount: paidFeeStudents.length,
    clientHuntingAssignedCount: uniqueCount(clientHuntingAssignedStudents.map((detail) => detail.studentId)),
    clientHuntingPendingCount: uniqueCount(clientHuntingPendingStudents.map((detail) => detail.studentId)),
    todaySubmittedStudents,
    todayNotSubmittedStudents,
    dailyPendingReportRows,
    dailyUnpaidReportRows,
    allTaskDetails: taskDetails,
    pendingStudents,
    activeStudents: activeDetailsByStudent,
    paidFeeStudents,
    unpaidFeeStudentsCount: uniqueCount(unpaidEnrollments.map((enrollment) => enrollment.student_id)),
    unpaidActiveStudents: unpaidActiveDetails,
    unpaidTaskDetails,
    clientHuntingAssignedStudents,
    clientHuntingPendingStudents,
    studentWorkSummaries,
    report: {
      totalStudents: uniqueCount(paidActiveStudentIds),
      submittedStudents: submittedReportStudents,
      notSubmittedStudents: notSubmittedReportStudents,
    },
  };
}

async function saveTeacherPermissions(teacherId: string, selectedPermissions: TeacherSelectablePermissionKey[], grantedBy: string) {
  const supabaseAdmin = createSupabaseServiceClient();
  const permissionSet = new Set(selectedPermissions);

  const { error: disableError } = await supabaseAdmin
    .from("user_permissions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", teacherId)
    .in("permission_key", [...TEACHER_SELECTABLE_PERMISSION_KEYS]);

  if (disableError) {
    throw new Error(disableError.message);
  }

  if (permissionSet.size === 0) {
    return;
  }

  const { error: upsertError } = await supabaseAdmin.from("user_permissions").upsert(
    Array.from(permissionSet).map((permissionKey) => ({
      user_id: teacherId,
      permission_key: permissionKey,
      enabled: true,
      granted_by: grantedBy,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,permission_key" },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }
}

const STUDENT_PRODUCT_PERMISSIONS = ["products.view", "products.create", "products.edit"] as const;

async function loadEligibleProductContributorCandidates() {
  const supabaseAdmin = createSupabaseServiceClient();
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("status", "active");

  if (enrollmentError) throw new Error(enrollmentError.message);

  const activeEnrollments = (enrollments ?? []) as Enrollment[];
  const studentIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.student_id)));
  const courseIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.course_id)));
  if (studentIds.length === 0) return [] satisfies ProductContributorCandidate[];

  const [profilesResult, feesResult, coursesResult, permissionsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", studentIds)
      .eq("role", "student")
      .eq("status", "approved"),
    supabaseAdmin
      .from("student_fee_records")
      .select("*")
      .in("student_id", studentIds)
      .order("updated_at", { ascending: false }),
    courseIds.length > 0
      ? supabaseAdmin.from("courses").select("*").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from("user_permissions")
      .select("user_id,permission_key,enabled")
      .in("user_id", studentIds)
      .in("permission_key", [...STUDENT_PRODUCT_PERMISSIONS]),
  ]);

  const loadError = profilesResult.error ?? feesResult.error ?? coursesResult.error ?? permissionsResult.error;
  if (loadError) throw new Error(loadError.message);

  const latestFeeByEnrollment = new Map<string, StudentFeeRecord>();
  for (const fee of (feesResult.data ?? []) as StudentFeeRecord[]) {
    const key = `${fee.student_id}:${fee.course_id}`;
    if (!latestFeeByEnrollment.has(key)) latestFeeByEnrollment.set(key, fee);
  }

  const courseById = new Map(((coursesResult.data ?? []) as Course[]).map((course) => [course.id, course]));
  const accessByStudent = new Set(
    (permissionsResult.data ?? [])
      .filter((row) => row.enabled && row.permission_key === "products.view")
      .map((row) => row.user_id),
  );
  const eligibleEnrollmentByStudent = new Map<string, { enrollment: Enrollment; fee: StudentFeeRecord }>();

  for (const enrollment of activeEnrollments) {
    const fee = latestFeeByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`);
    if (!fee || !["paid", "waived"].includes(fee.status)) continue;

    const current = eligibleEnrollmentByStudent.get(enrollment.student_id);
    if (!current || fee.updated_at > current.fee.updated_at) {
      eligibleEnrollmentByStudent.set(enrollment.student_id, { enrollment, fee });
    }
  }

  return ((profilesResult.data ?? []) as Profile[])
    .flatMap((profile) => {
      const eligible = eligibleEnrollmentByStudent.get(profile.id);
      if (!eligible) return [];

      return [{
        id: profile.id,
        fullName: profile.full_name ?? "Unnamed student",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        courseTitle: courseById.get(eligible.enrollment.course_id)?.title ?? "Active course",
        feeMonth: eligible.fee.month_key,
        hasProductAccess: accessByStudent.has(profile.id),
      } satisfies ProductContributorCandidate];
    })
    .sort((first, second) => first.fullName.localeCompare(second.fullName));
}

export async function getProductContributorCandidates(): Promise<ActionResult<ProductContributorCandidate[]>> {
  try {
    await requireAdminOnly();
    return { success: true, data: await loadEligibleProductContributorCandidates(), error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to load eligible students.") };
  }
}

export async function setStudentProductContributorAccess(
  studentId: string,
  enabled: boolean,
): Promise<ActionResult<{ studentId: string; enabled: boolean }>> {
  try {
    const adminProfile = await requireAdminOnly();
    const eligibleStudents = await loadEligibleProductContributorCandidates();
    if (!eligibleStudents.some((student) => student.id === studentId)) {
      throw new Error("Only an approved student with an active enrollment and paid fee can receive product access.");
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("user_permissions").upsert(
      STUDENT_PRODUCT_PERMISSIONS.map((permissionKey) => ({
        user_id: studentId,
        permission_key: permissionKey,
        enabled,
        granted_by: adminProfile.id,
        updated_at: now,
      })),
      { onConflict: "user_id,permission_key" },
    );

    if (error) throw new Error(error.message);

    revalidatePath("/admin/subadmins");
    revalidatePath("/student");
    revalidatePath("/student/products");
    return { success: true, data: { studentId, enabled }, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update product access.") };
  }
}

async function loadTeacherPermissions(teacherId: string) {
  const supabaseAdmin = createSupabaseServiceClient();
  const { data, error } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key")
    .eq("user_id", teacherId)
    .eq("enabled", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => row.permission_key)
    .filter(isTeacherSelectablePermissionKey);
}

async function logPermissionUpdateIfAvailable(input: {
  actorId: string;
  targetUserId: string;
  permissions: TeacherSelectablePermissionKey[];
}) {
  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const fromUntyped = supabaseAdmin.from as unknown as (table: string) => {
      insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };

    await fromUntyped("audit_logs").insert({
      actor_id: input.actorId,
      target_user_id: input.targetUserId,
      action: "teacher_permissions.updated",
      metadata: { permissions: input.permissions },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit logging is optional until an audit_logs table is added to this project.
  }
}

export async function checkAdminRole(userId: string) {
  return isMainAdmin(userId);
}

export async function checkAdminOrTeacherRole(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("role,status").eq("id", userId).single();
  return (data?.role === "admin" || data?.role === "teacher") && data.status === "approved";
}

export async function createTeacherAccount(input: CreateTeacherInput): Promise<ActionResult<TeacherAccount>> {
  let createdAuthUserId: string | null = null;

  try {
    const adminProfile = await requireAdminOnly();

    const { fullName, email, phone } = validateTeacherProfileInput(input);
    const selectedPermissions = validateTeacherPermissions(input.permissions ?? []);

    if (!input.password || input.password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      throw new Error(existingProfileError.message);
    }

    if (existingProfile) {
      throw new Error("An account with this email already exists.");
    }

    const { data: createdAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "teacher",
      },
    });

    const authUser = createdAuthUser.user;

    if (createAuthError || !authUser) {
      throw new Error(createAuthError?.message || "Failed to create teacher account.");
    }

    createdAuthUserId = authUser.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          email,
          full_name: fullName,
          phone,
          role: "teacher",
          status: "approved",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message || "Teacher profile could not be saved.");
    }

    await saveTeacherPermissions(authUser.id, selectedPermissions, adminProfile.id);
    await logPermissionUpdateIfAvailable({
      actorId: adminProfile.id,
      targetUserId: authUser.id,
      permissions: selectedPermissions,
    });

    revalidatePath("/admin/subadmins");
    revalidatePath("/admin");

    return { success: true, data: toTeacherAccount(profile as Profile, selectedPermissions), error: null };
  } catch (error) {
    if (createdAuthUserId) {
      await createSupabaseServiceClient().auth.admin.deleteUser(createdAuthUserId).catch(() => null);
    }
    return { success: false, data: null, error: actionError(error, "Failed to create teacher account.") };
  }
}

export async function updateTeacherProfile(teacherId: string, input: UpdateTeacherInput): Promise<ActionResult<TeacherAccount>> {
  try {
    await requireAdminOnly();

    const { fullName, email, phone } = validateTeacherProfileInput(input);
    const supabaseAdmin = createSupabaseServiceClient();

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacher) {
      throw new Error("Teacher account could not be found.");
    }

    const { data: duplicateProfile, error: duplicateError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", teacherId)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(duplicateError.message);
    }

    if (duplicateProfile) {
      throw new Error("Another account already uses this email address.");
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(teacherId, {
      email,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "teacher",
      },
    });

    if (authUpdateError) {
      throw new Error(authUpdateError.message);
    }

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        phone,
      })
      .eq("id", teacherId)
      .eq("role", "teacher")
      .select("*")
      .single();

    if (updateError || !profile) {
      throw new Error(updateError?.message || "Teacher profile could not be updated.");
    }

    const permissions = await loadTeacherPermissions(teacherId);
    revalidatePath("/admin/subadmins");
    return { success: true, data: toTeacherAccount(profile as Profile, permissions), error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update teacher account.") };
  }
}

export async function updateTeacherPermissions(
  teacherId: string,
  permissionKeys: TeacherSelectablePermissionKey[],
): Promise<ActionResult<TeacherAccount>> {
  try {
    const adminProfile = await requireAdminOnly();
    const selectedPermissions = validateTeacherPermissions(permissionKeys);
    const supabaseAdmin = createSupabaseServiceClient();

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacher) {
      throw new Error("Teacher account could not be found.");
    }

    await saveTeacherPermissions(teacherId, selectedPermissions, adminProfile.id);
    await logPermissionUpdateIfAvailable({
      actorId: adminProfile.id,
      targetUserId: teacherId,
      permissions: selectedPermissions,
    });

    revalidatePath("/admin/subadmins");
    revalidatePath("/admin");

    return { success: true, data: toTeacherAccount(teacher as Profile, selectedPermissions), error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update teacher permissions.") };
  }
}

export async function updateTeacherCourseAssignments(
  teacherId: string,
  courseIds: string[],
): Promise<ActionResult<{ teacherId: string; courseIds: string[] }>> {
  try {
    const adminProfile = await requireAdminOnly();
    const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));
    const supabaseAdmin = createSupabaseServiceClient();

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacher) {
      throw new Error("Teacher account could not be found.");
    }

    const { error: deleteError } = await supabaseAdmin
      .from("teacher_course_assignments")
      .delete()
      .eq("teacher_id", teacherId);

    if (deleteError) throw new Error(deleteError.message);

    if (uniqueCourseIds.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("teacher_course_assignments").insert(
        uniqueCourseIds.map((courseId) => ({
          teacher_id: teacherId,
          course_id: courseId,
          assigned_by: adminProfile.id,
        })),
      );
      if (insertError) throw new Error(insertError.message);
    }

    revalidatePath("/admin/subadmins");
    revalidatePath("/admin/students");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/progress");

    return { success: true, data: { teacherId, courseIds: uniqueCourseIds }, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update teacher course assignments.") };
  }
}

export async function updateTeacherStatus(
  teacherId: string,
  status: Extract<ProfileStatus, "approved" | "rejected">,
): Promise<ActionResult<TeacherAccount>> {
  try {
    await requireAdminOnly();

    const supabaseAdmin = createSupabaseServiceClient();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .update({ status })
      .eq("id", teacherId)
      .eq("role", "teacher")
      .select("*")
      .single();

    if (error || !profile) {
      throw new Error(error?.message || "Teacher status could not be updated.");
    }

    const permissions = await loadTeacherPermissions(teacherId);
    revalidatePath("/admin/subadmins");
    return { success: true, data: toTeacherAccount(profile as Profile, permissions), error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update teacher status.") };
  }
}

export async function resetTeacherPassword(teacherId: string, newPassword: string): Promise<ActionResult> {
  try {
    await requireAdminOnly();

    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacher) {
      throw new Error("Teacher account could not be found.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(teacherId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/subadmins");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to reset teacher password.") };
  }
}

export async function resetStudentPassword(studentId: string, newPassword: string) {
  try {
    await requirePermission("students.edit");

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.auth.admin.updateUserById(studentId, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reset password" };
  }
}

export async function updateStudentGithubUrl(studentId: string, githubUrl: string | null) {
  try {
    await requirePermission("students.edit");

    const trimmedUrl = githubUrl?.trim() || null;
    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl);
        const validHosts = new Set(["github.com", "www.github.com", "gist.github.com"]);
        if (!["http:", "https:"].includes(parsed.protocol) || !validHosts.has(parsed.hostname)) {
          throw new Error();
        }
      } catch {
        return { success: false, error: "Enter a valid GitHub URL." };
      }
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ github_url: trimmedUrl })
      .eq("id", studentId)
      .eq("role", "student");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/progress");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update GitHub link." };
  }
}

export async function updateStudentNotes(input: {
  studentId: string;
  weakAreas: string;
  nextFocus: string;
  followUpDate: string;
}) {
  try {
    await requirePermission("students.edit");

    const weakAreas = input.weakAreas.trim() || null;
    const nextFocus = input.nextFocus.trim() || null;
    const followUpDate = input.followUpDate.trim() || null;

    if (followUpDate) {
      const parsed = new Date(followUpDate);
      if (Number.isNaN(parsed.getTime())) {
        return { success: false, error: "Enter a valid follow-up date." };
      }
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        weak_areas: weakAreas,
        next_focus: nextFocus,
        follow_up_date: followUpDate,
      })
      .eq("id", input.studentId)
      .eq("role", "student");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/students");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update student notes." };
  }
}

export async function updateStudentStatus(studentId: string, status: Extract<ProfileStatus, "approved" | "rejected">) {
  try {
    await requirePermission("students.edit");

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        status,
        admin_status: status === "approved" ? "approved" : "inactive",
      })
      .eq("id", studentId)
      .eq("role", "student")
      .select("*")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "Failed to update student status." };
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/progress");
    revalidatePath("/admin/task-analytics");
    revalidatePath("/admin/client-hunting");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update student status." };
  }
}

export async function setStudentLifecycleStatus(input: {
  studentId: string;
  status: "approved" | "active" | "completed" | "inactive";
}): Promise<ActionResult<null>> {
  try {
    await requirePermission("students.edit");

    const supabase = createSupabaseServiceClient();
    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("id, status")
      .eq("id", input.studentId)
      .eq("role", "student")
      .single();

    if (studentError || !student) {
      return { success: false, data: null, error: studentError?.message ?? "Student not found." };
    }

    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course_id, status")
      .eq("student_id", input.studentId);

    if (enrollmentError) {
      return { success: false, data: null, error: enrollmentError.message };
    }

    if (input.status === "inactive") {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "rejected", admin_status: "inactive" })
        .eq("id", input.studentId)
        .eq("role", "student");

      if (error) return { success: false, data: null, error: error.message };
    } else if (input.status === "approved") {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved", admin_status: "approved" })
        .eq("id", input.studentId)
        .eq("role", "student");

      if (error) return { success: false, data: null, error: error.message };
    } else if (input.status === "completed") {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved", admin_status: "completed" })
        .eq("id", input.studentId)
        .eq("role", "student");

      if (error) return { success: false, data: null, error: error.message };

      for (const enrollment of enrollments ?? []) {
        const { error } = await supabase.rpc("mark_course_completed", {
          target_student_id: input.studentId,
          target_course_id: enrollment.course_id,
        });
        if (error) return { success: false, data: null, error: error.message };
      }
    } else if (input.status === "active") {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved", admin_status: "active" })
        .eq("id", input.studentId)
        .eq("role", "student");

      if (error) return { success: false, data: null, error: error.message };

      for (const enrollment of enrollments ?? []) {
        const { error: reopenError } = await supabase
          .from("enrollments")
          .update({ status: "active", completed_at: null })
          .eq("student_id", input.studentId)
          .eq("course_id", enrollment.course_id);

        if (reopenError) return { success: false, data: null, error: reopenError.message };

        const { error: completionDeleteError } = await supabase
          .from("completed_students")
          .delete()
          .eq("student_id", input.studentId)
          .eq("course_id", enrollment.course_id);

        if (completionDeleteError) return { success: false, data: null, error: completionDeleteError.message };

        const { error: progressError } = await supabase.rpc("refresh_student_progress", {
          target_student_id: input.studentId,
          target_course_id: enrollment.course_id,
        });

        if (progressError) return { success: false, data: null, error: progressError.message };
      }
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/progress");
    revalidatePath("/admin/task-analytics");
    return { success: true, data: null, error: null };
  } catch (err) {
    return { success: false, data: null, error: err instanceof Error ? err.message : "Failed to update student lifecycle status." };
  }
}

export async function toggleStudentCompletion(studentId: string, courseId: string, markCompleted: boolean) {
  try {
    await requirePermission("students.edit");

    const supabase = createSupabaseServiceClient();

    if (markCompleted) {
      const { error } = await supabase.rpc("mark_course_completed", {
        target_student_id: studentId,
        target_course_id: courseId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    }

    const [enrollmentResult, completedResult] = await Promise.all([
      supabase
        .from("enrollments")
        .update({ status: "active", completed_at: null })
        .eq("student_id", studentId)
        .eq("course_id", courseId),
      supabase
        .from("completed_students")
        .delete()
        .eq("student_id", studentId)
        .eq("course_id", courseId),
    ]);

    if (enrollmentResult.error) {
      return { success: false, error: enrollmentResult.error.message };
    }

    if (completedResult.error) {
      return { success: false, error: completedResult.error.message };
    }

    const { error: progressError } = await supabase.rpc("refresh_student_progress", {
      target_student_id: studentId,
      target_course_id: courseId,
    });

    if (progressError) {
      return { success: false, error: progressError.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update completion status." };
  }
}

export async function updateEnrollmentTargetTasks(input: {
  studentId: string;
  courseId: string;
  targetTasks: number;
}) {
  try {
    await requireAdminOnly();

    const targetTasks = Number.isFinite(input.targetTasks) ? Math.max(1, Math.floor(input.targetTasks)) : 100;
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("enrollments")
      .update({ target_tasks: targetTasks })
      .eq("student_id", input.studentId)
      .eq("course_id", input.courseId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/progress");
    revalidatePath("/admin/students");
    revalidatePath("/student/progress");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update target tasks." };
  }
}

export async function updateStudentProgressSummary(input: {
  studentId: string;
  courseId: string;
  completedTasks: number;
  targetTasks: number;
  averageScore: number;
}) {
  try {
    await requireAdminOnly();

    const completedTasks = Math.max(0, Math.floor(Number(input.completedTasks ?? 0)));
    const targetTasks = Math.max(1, Math.floor(Number(input.targetTasks ?? 100)));
    const averageScore = Math.max(0, Math.round(Number(input.averageScore ?? 0)));
    const progressPercentage = Math.min(100, Math.round((completedTasks / targetTasks) * 100));
    const finalScore = progressPercentage >= 100 ? 100 : averageScore;
    const completedAt = progressPercentage >= 100 ? new Date().toISOString() : null;

    const supabase = createSupabaseServiceClient();

    const [progressResult, enrollmentResult, completionResult] = await Promise.all([
      supabase
        .from("progress_reports")
        .upsert(
          {
            student_id: input.studentId,
            course_id: input.courseId,
            total_tasks: targetTasks,
            completed_tasks: completedTasks,
            pending_tasks: Math.max(targetTasks - completedTasks, 0),
            average_score: finalScore,
            progress_percentage: progressPercentage,
            target_tasks: targetTasks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,course_id" },
        ),
      supabase
        .from("enrollments")
        .update({
          target_tasks: targetTasks,
          progress_percentage: progressPercentage,
          final_score: finalScore,
          status: progressPercentage >= 100 ? "completed" : "active",
          completed_at: completedAt,
        })
        .eq("student_id", input.studentId)
        .eq("course_id", input.courseId),
      progressPercentage >= 100
        ? supabase
            .from("completed_students")
            .upsert(
              {
                student_id: input.studentId,
                course_id: input.courseId,
                final_score: finalScore,
                progress_percentage: 100,
                is_public: true,
                completed_at: completedAt,
              },
              { onConflict: "student_id,course_id" },
            )
        : supabase
            .from("completed_students")
            .delete()
            .eq("student_id", input.studentId)
            .eq("course_id", input.courseId),
    ]);

    const error = progressResult.error ?? enrollmentResult.error ?? completionResult.error;
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/progress");
    revalidatePath("/admin/completions");
    revalidatePath("/student/progress");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update student progress." };
  }
}

export async function upsertStudentFeeRecord(input: FeeRecordInput): Promise<ActionResult<null>> {
  try {
    const adminProfile = await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();
    const monthKey = input.month_key?.trim();

    if (!input.student_id || !input.course_id || !monthKey) {
      throw new Error("Student, course, and month are required.");
    }

    const paid = Number(input.amount_paid ?? 0);
    const due = Number(input.amount_due ?? 0);
    const status = input.status || (paid <= 0 ? "pending" : paid < due ? "partial" : "paid");
    const enrollmentId = input.enrollment_id || (await ensureEnrollmentForFeeRecord(supabaseAdmin, input.student_id, input.course_id));

    const payload = {
      student_id: input.student_id,
      enrollment_id: enrollmentId,
      course_id: input.course_id,
      month_key: monthKey,
      amount_due: due,
      amount_paid: paid,
      due_date: input.due_date || null,
      paid_at: input.paid_at || (status === "paid" ? new Date().toISOString().slice(0, 10) : null),
      status,
      payment_method: input.payment_method?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: adminProfile.id,
      updated_at: new Date().toISOString(),
    };

    const feeQuery = input.id
      ? supabaseAdmin.from("student_fee_records").update(payload).eq("id", input.id)
      : supabaseAdmin.from("student_fee_records").insert(payload);
    const { error } = await feeQuery;

    if (error?.code === "23505") {
      throw new Error("This student's fee record already exists for the selected course and month. Open that month and edit it instead.");
    }
    if (error) throw new Error(error.message);

    revalidatePath("/admin/fees");
    revalidatePath("/admin/students");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save fee record.") };
  }
}

export async function generateMonthlyFeeRecords(input: {
  month_key: string;
  course_id?: string;
  amount_due: number;
  due_date?: string;
}): Promise<ActionResult<{ created: number }>> {
  try {
    const adminProfile = await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();
    const monthKey = input.month_key?.trim();

    if (!monthKey) throw new Error("Month is required.");

    let enrollmentQuery = supabaseAdmin
      .from("enrollments")
      .select("id,student_id,course_id,status")
      .eq("status", "active");

    if (input.course_id) {
      enrollmentQuery = enrollmentQuery.eq("course_id", input.course_id);
    }

    const { data: enrollmentsData, error: enrollmentError } = await enrollmentQuery;
    if (enrollmentError) throw new Error(enrollmentError.message);

    const enrollments = enrollmentsData ?? [];
    if (enrollments.length === 0) {
      return { success: true, data: { created: 0 }, error: null };
    }

    const { error } = await supabaseAdmin.from("student_fee_records").upsert(
      enrollments.map((enrollment) => ({
        student_id: enrollment.student_id,
        enrollment_id: enrollment.id,
        course_id: enrollment.course_id,
        month_key: monthKey,
        amount_due: Number(input.amount_due ?? 0),
        amount_paid: 0,
        due_date: input.due_date || null,
        status: "pending" as const,
        created_by: adminProfile.id,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "student_id,course_id,month_key" },
    );

    if (error) throw new Error(error.message);

    revalidatePath("/admin/fees");
    return { success: true, data: { created: enrollments.length }, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to generate fee records.") };
  }
}

export async function toggleStudentFeeBlock(input: {
  student_id: string;
  fee_record_id?: string;
  blocked: boolean;
  reason?: string;
}): Promise<ActionResult<null>> {
  try {
    await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const reason = input.reason?.trim() || null;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_fee_blocked: input.blocked,
        fee_block_reason: input.blocked ? reason : null,
        fee_blocked_at: input.blocked ? now : null,
      })
      .eq("id", input.student_id)
      .eq("role", "student");

    if (profileError) throw new Error(profileError.message);

    if (input.fee_record_id) {
      const { error: feeError } = await supabaseAdmin
        .from("student_fee_records")
        .update({
          blocked: input.blocked,
          blocked_reason: input.blocked ? reason : null,
          updated_at: now,
        })
        .eq("id", input.fee_record_id);

      if (feeError) throw new Error(feeError.message);
    }

    revalidatePath("/admin/fees");
    revalidatePath("/admin/students");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update student fee block.") };
  }
}

export async function deleteStudentFeeRecord(feeRecordId: string): Promise<ActionResult<null>> {
  try {
    await requireAdminOnly();

    if (!feeRecordId?.trim()) {
      throw new Error("Fee record is required.");
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin
      .from("student_fee_records")
      .delete()
      .eq("id", feeRecordId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/fees");
    revalidatePath("/admin/students");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to delete fee record.") };
  }
}

export async function deleteStudentAccount(studentId: string) {
  try {
    await requireAdminOnly();

    const supabaseAdmin = createSupabaseServiceClient();
    const { data: studentProfile, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,role")
      .eq("id", studentId)
      .eq("role", "student")
      .maybeSingle();

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (!studentProfile) {
      return { success: false, error: "Student account could not be found." };
    }

    if (studentProfile.email) {
      await supabaseAdmin.from("applications").delete().eq("email", studentProfile.email);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/applications");

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete student account" };
  }
}

export async function createInternshipLetter(input: InternshipLetterFormValues): Promise<ActionResult<InternshipLetter>> {
  try {
    const profile = await requireAdminOnly();
    const parsed = internshipLetterSchema.parse(input);
    const supabaseAdmin = createSupabaseServiceClient();

    const { data, error } = await supabaseAdmin
      .from("internship_letters")
      .insert({
        student_name: parsed.student_name,
        father_name: parsed.father_name,
        gender: parsed.gender,
        student_id: parsed.student_id,
        internship_role: parsed.internship_role,
        joining_date: parsed.joining_date,
        completion_date: parsed.completion_date,
        attendance_marks: parsed.attendance_marks,
        technical_marks: parsed.technical_marks,
        total_marks: parsed.total_marks,
        letter_date: parsed.letter_date,
        hr_manager_name: parsed.hr_manager_name || null,
        ceo_name: parsed.ceo_name || null,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to save internship letter.");
    }

    revalidatePath("/admin/internship-letters");

    return { success: true, data: data as InternshipLetter, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save internship letter.") };
  }
}

export { hasPermission, isMainAdmin };
export type { PermissionKey };

// ============================================================
// Manual Enrollment Actions
// ============================================================

export interface ManualEnrollmentInput {
  full_name: string;
  father_name: string;
  email: string;
  phone: string;
  course_name: string;
  internship_role: string;
  joining_date: string;
  completion_date: string;
  final_score: number;
  grade: string;
  attendance_marks: number;
  technical_marks: number;
  total_marks: number;
  certificate_issued: boolean;
  show_on_completed_page: boolean;
  notes: string;
}

export async function createManualEnrollment(input: ManualEnrollmentInput): Promise<ActionResult<ManualEnrollment>> {
  try {
    const profile = await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();

    if (!input.full_name?.trim()) throw new Error("Student name is required.");
    if (!input.course_name?.trim()) throw new Error("Course name is required.");

    const { data, error } = await supabaseAdmin
      .from("manual_enrollments")
      .insert({
        full_name: input.full_name.trim(),
        father_name: input.father_name?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        course_name: input.course_name.trim(),
        internship_role: input.internship_role?.trim() || null,
        joining_date: input.joining_date || null,
        completion_date: input.completion_date || null,
        final_score: input.final_score ?? 0,
        grade: input.grade?.trim() || null,
        attendance_marks: input.attendance_marks ?? 5,
        technical_marks: input.technical_marks ?? 20,
        total_marks: input.total_marks ?? 25,
        certificate_issued: input.certificate_issued ?? false,
        show_on_completed_page: input.show_on_completed_page ?? false,
        notes: input.notes?.trim() || null,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to create enrollment.");

    revalidatePath("/admin/manual-enrollments");
    revalidatePath("/completed-students");
    return { success: true, data: data as ManualEnrollment, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to create manual enrollment.") };
  }
}

export async function updateManualEnrollment(id: string, input: ManualEnrollmentInput): Promise<ActionResult<ManualEnrollment>> {
  try {
    await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();

    if (!input.full_name?.trim()) throw new Error("Student name is required.");
    if (!input.course_name?.trim()) throw new Error("Course name is required.");

    const { data, error } = await supabaseAdmin
      .from("manual_enrollments")
      .update({
        full_name: input.full_name.trim(),
        father_name: input.father_name?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        course_name: input.course_name.trim(),
        internship_role: input.internship_role?.trim() || null,
        joining_date: input.joining_date || null,
        completion_date: input.completion_date || null,
        final_score: input.final_score ?? 0,
        grade: input.grade?.trim() || null,
        attendance_marks: input.attendance_marks ?? 5,
        technical_marks: input.technical_marks ?? 20,
        total_marks: input.total_marks ?? 25,
        certificate_issued: input.certificate_issued ?? false,
        show_on_completed_page: input.show_on_completed_page ?? false,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to update enrollment.");

    revalidatePath("/admin/manual-enrollments");
    revalidatePath(`/admin/manual-enrollments/${id}`);
    revalidatePath("/completed-students");
    revalidatePath(`/certificate/${id}`);
    return { success: true, data: data as ManualEnrollment, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update manual enrollment.") };
  }
}

export async function toggleManualEnrollmentDisplay(id: string, show: boolean): Promise<ActionResult<null>> {
  try {
    await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();

    const { error } = await supabaseAdmin
      .from("manual_enrollments")
      .update({ show_on_completed_page: show, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/manual-enrollments");
    revalidatePath("/completed-students");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update display setting.") };
  }
}

export async function deleteManualEnrollment(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();

    const { error } = await supabaseAdmin.from("manual_enrollments").delete().eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/manual-enrollments");
    revalidatePath("/completed-students");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to delete manual enrollment.") };
  }
}

export interface ManualCompletionInput {
  studentId: string;
  courseId: string;
  certificateIssued?: boolean;
  showOnCompletedPage?: boolean;
  notes?: string;
}

export async function createManualCompletion(input: ManualCompletionInput): Promise<ActionResult<ManualEnrollment>> {
  try {
    const profile = await requireAdminOnly();
    const studentId = input.studentId.trim();
    const courseId = input.courseId.trim();

    if (!studentId) throw new Error("Student is required.");
    if (!courseId) throw new Error("Course is required.");

    const supabaseAdmin = createSupabaseServiceClient();
    const [{ data: student, error: studentError }, { data: course, error: courseError }, { data: enrollment, error: enrollmentError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", studentId).eq("role", "student").single(),
      supabaseAdmin.from("courses").select("*").eq("id", courseId).single(),
      supabaseAdmin
        .from("enrollments")
        .select("id, created_at, target_tasks")
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .maybeSingle(),
    ]);

    if (studentError || !student) {
      throw new Error(studentError?.message || "Student could not be found.");
    }

    if (courseError || !course) {
      throw new Error(courseError?.message || "Course could not be found.");
    }

    if (enrollmentError) {
      throw new Error(enrollmentError.message);
    }

    const studentEmail = student.email?.trim().toLowerCase() ?? null;
    const today = new Date().toISOString().slice(0, 10);
    const joiningDate = enrollment?.created_at ? enrollment.created_at.slice(0, 10) : student.created_at?.slice(0, 10) ?? today;
    const completionDate = today;
    const targetTasks = enrollment?.target_tasks ?? 100;
    const payload = {
      full_name: student.full_name?.trim() || student.email?.split("@")[0] || "Manual completion",
      father_name: "",
      email: studentEmail,
      phone: student.phone?.trim() || null,
      course_name: (course as Course).title.trim(),
      internship_role: "Completed manually",
      joining_date: joiningDate,
      completion_date: completionDate,
      final_score: 100,
      grade: "A+",
      attendance_marks: 5,
      technical_marks: 20,
      total_marks: 25,
      certificate_issued: input.certificateIssued ?? true,
      show_on_completed_page: input.showOnCompletedPage ?? true,
      notes: input.notes?.trim() || "Manual completion created from the admin panel.",
      created_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    const existingQuery = studentEmail
      ? supabaseAdmin
          .from("manual_enrollments")
          .select("*")
          .eq("email", studentEmail)
          .eq("course_name", (course as Course).title)
          .maybeSingle()
      : supabaseAdmin
          .from("manual_enrollments")
          .select("*")
          .eq("full_name", payload.full_name)
          .eq("course_name", (course as Course).title)
          .maybeSingle();

    const { data: existingRecord, error: existingError } = await existingQuery;
    if (existingError) {
      throw new Error(existingError.message);
    }

    const query = existingRecord?.id
      ? supabaseAdmin.from("manual_enrollments").update(payload).eq("id", existingRecord.id).select("*").single()
      : supabaseAdmin.from("manual_enrollments").insert(payload).select("*").single();

    const { data, error } = await query;
    if (error || !data) {
      throw new Error(error?.message || "Failed to save manual completion.");
    }

    const completedAt = new Date().toISOString();
    const [enrollmentSync, completionSync, progressSync] = await Promise.all([
      supabaseAdmin.from("enrollments").upsert(
        {
          student_id: studentId,
          course_id: courseId,
          status: "completed",
          progress_percentage: 100,
          final_score: 100,
          target_tasks: targetTasks,
          completed_at: completedAt,
        },
        { onConflict: "student_id,course_id" },
      ),
      supabaseAdmin.from("completed_students").upsert(
        {
          student_id: studentId,
          course_id: courseId,
          final_score: 100,
          progress_percentage: 100,
          is_public: input.showOnCompletedPage ?? true,
          completed_at: completedAt,
        },
        { onConflict: "student_id,course_id" },
      ),
      supabaseAdmin.from("progress_reports").upsert(
        {
          student_id: studentId,
          course_id: courseId,
          total_tasks: targetTasks,
          completed_tasks: targetTasks,
          pending_tasks: 0,
          average_score: 100,
          progress_percentage: 100,
          target_tasks: targetTasks,
          updated_at: completedAt,
        },
        { onConflict: "student_id,course_id" },
      ),
    ]);

    const syncError = enrollmentSync.error ?? completionSync.error ?? progressSync.error;
    if (syncError) {
      throw new Error(syncError.message);
    }

    revalidatePath("/admin/manual-completions");
    revalidatePath("/admin/manual-enrollments");
    revalidatePath("/admin/completions");
    revalidatePath("/admin/progress");
    revalidatePath("/admin/students");
    revalidatePath("/trainees");
    revalidatePath("/completed-students");
    revalidatePath(`/certificate/${data.id}`);
    return { success: true, data: data as ManualEnrollment, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to create manual completion.") };
  }
}

// ============================================================
// Comment Actions (public — no auth needed)
// ============================================================

export async function submitManualEnrollmentComment(input: {
  enrollment_id: string;
  commenter_email: string;
  commenter_name: string;
  comment: string;
}): Promise<ActionResult<ManualEnrollmentComment>> {
  try {
    if (!input.commenter_name?.trim()) throw new Error("Name is required.");
    if (!input.commenter_email?.trim()) throw new Error("Email is required.");
    if (!input.comment?.trim()) throw new Error("Comment cannot be empty.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.commenter_email.trim())) {
      throw new Error("Please enter a valid email address.");
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // Check enrollment exists
    const { data: enrollment } = await supabaseAdmin
      .from("manual_enrollments")
      .select("id")
      .eq("id", input.enrollment_id)
      .single();

    if (!enrollment) throw new Error("Enrollment not found.");

    const { data, error } = await supabaseAdmin
      .from("manual_enrollment_comments")
      .insert({
        enrollment_id: input.enrollment_id,
        commenter_email: input.commenter_email.trim().toLowerCase(),
        commenter_name: input.commenter_name.trim(),
        comment: input.comment.trim(),
      })
      .select("*")
      .single();

    if (error) {
      // Unique constraint violation = already commented
      if (error.code === "23505") {
        throw new Error("You have already submitted a comment for this student.");
      }
      throw new Error(error.message);
    }

    if (!data) throw new Error("Failed to save comment.");

    revalidatePath(`/certificate/${input.enrollment_id}`);
    return { success: true, data: data as ManualEnrollmentComment, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to submit comment.") };
  }
}

// ============================================================
// Signature Settings Actions
// ============================================================

export async function saveBrandingSettings(scope: BrandingScope, input: BrandingSettingsInput, syncLogoAcrossScopes = false): Promise<ActionResult<BrandingSettingsSnapshot>> {
  try {
    const profile = await requireAdminOnly();
    if (scope !== "landing" && scope !== "admin" && scope !== "student") {
      throw new Error("Invalid branding scope.");
    }

    const normalizeColor = (value: string, fallback: string) => {
      const candidate = value.trim();
      return /^#?[0-9a-fA-F]{6}$/.test(candidate) ? (candidate.startsWith("#") ? candidate.toLowerCase() : `#${candidate.toLowerCase()}`) : fallback;
    };

    const payload = {
      scope,
      logo_url: input.logoUrl?.trim() || null,
      background_color: normalizeColor(input.backgroundColor, scope === "landing" ? "#030b1c" : "#f8fafc"),
      surface_color: normalizeColor(input.surfaceColor, "#ffffff"),
      primary_color: normalizeColor(input.primaryColor, scope === "landing" ? "#062b7f" : "#0f4c81"),
      secondary_color: normalizeColor(input.secondaryColor, scope === "landing" ? "#ffd24a" : "#0ea5a4"),
      accent_color: normalizeColor(input.accentColor, scope === "landing" ? "#ffa03a" : "#22c55e"),
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin
      .from("branding_settings")
      .upsert(payload, { onConflict: "scope" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to save branding settings.");
    }

    if (syncLogoAcrossScopes) {
      const sharedLogoUrl = input.logoUrl?.trim() || null;
      const otherScopes: BrandingScope[] = ["landing", "admin", "student"].filter((item) => item !== scope) as BrandingScope[];

      const { error: syncError } = await supabaseAdmin
        .from("branding_settings")
        .update({
          logo_url: sharedLogoUrl,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .in("scope", otherScopes);

      if (syncError) {
        throw new Error(syncError.message || "Failed to sync shared logo across branding scopes.");
      }
    }

    revalidatePath("/admin/settings/branding");
    revalidatePath("/admin");
    revalidatePath("/student");
    revalidatePath("/");

    return { success: true, data: data as BrandingSettingsSnapshot, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save branding settings.") };
  }
}

export async function uploadBrandingLogo(formData: FormData): Promise<ActionResult<{ publicUrl: string }>> {
  try {
    await requireAdminOnly();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("Please select an image file.");
    }

    const allowedLogoTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = allowedLogoTypes[file.type];
    if (!extension) throw new Error("Please upload a PNG, JPG, WEBP, or GIF image.");

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Logo must be under 5 MB.");
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const storagePath = `shared/logo-${Date.now()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from("branding-assets")
      .upload(storagePath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message || "Supabase logo upload failed.");

    const { data } = supabaseAdmin.storage.from("branding-assets").getPublicUrl(storagePath);
    if (!data.publicUrl) throw new Error("Supabase did not return a public logo URL.");

    return { success: true, data: { publicUrl: data.publicUrl }, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to upload branding logo.") };
  }
}

export async function saveSignatureSettings(input: {
  signature_url: string;
  stamp_url: string;
  hr_signature_url: string;
}): Promise<ActionResult<AdminSignatureSettings>> {
  try {
    const profile = await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();

    const payload = {
      admin_user_id: profile.id,
      signature_url: input.signature_url || null,
      stamp_url: input.stamp_url || null,
      hr_signature_url: input.hr_signature_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("admin_signature_settings")
      .select("*")
      .eq("admin_user_id", profile.id)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    let data: AdminSignatureSettings | null = null;
    let error: { message: string } | null = null;

    if (existing) {
      const result = await supabaseAdmin
        .from("admin_signature_settings")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
      data = result.data as AdminSignatureSettings | null;
      error = result.error;
    } else {
      const result = await supabaseAdmin
        .from("admin_signature_settings")
        .insert(payload)
        .select("*")
        .single();
      data = result.data as AdminSignatureSettings | null;
      error = result.error;
    }

    if (error || !data) throw new Error(error?.message || "Failed to save signature settings.");

    revalidatePath("/admin/settings/signature");
    revalidatePath("/admin/internship-letters");
    return { success: true, data: data as AdminSignatureSettings, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save signature settings.") };
  }
}

// ============================================================
// Software Houses Actions
// ============================================================

export interface SoftwareHouseInput {
  name: string;
  tagline: string;
  logo_url: string;
  watermark_url: string;
  website_url: string;
  facebook_url: string;
  phone: string;
  phone2: string;
  email: string;
  address: string;
  hr_manager_name: string;
  ceo_name: string;
  header_color1: string;
  header_color2: string;
  is_active: boolean;
  display_order: number;
}

export async function createSoftwareHouse(input: SoftwareHouseInput): Promise<ActionResult<SoftwareHouse>> {
  try {
    await requireAdminOnly();
    if (!input.name?.trim()) throw new Error("Software house name is required.");
    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin
      .from("software_houses")
      .insert({
        name: input.name.trim(),
        tagline: input.tagline?.trim() || null,
        logo_url: input.logo_url || null,
        watermark_url: input.watermark_url || null,
        website_url: input.website_url?.trim() || null,
        facebook_url: input.facebook_url?.trim() || null,
        phone: input.phone?.trim() || null,
        phone2: input.phone2?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        hr_manager_name: input.hr_manager_name?.trim() || null,
        ceo_name: input.ceo_name?.trim() || null,
        header_color1: input.header_color1 || '#1e40af',
        header_color2: input.header_color2 || '#1e40af',
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "Failed to create software house.");
    revalidatePath("/admin/software-houses");
    revalidatePath("/admin/internship-letters");
    return { success: true, data: data as SoftwareHouse, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to create software house.") };
  }
}

export async function updateSoftwareHouse(id: string, input: SoftwareHouseInput): Promise<ActionResult<SoftwareHouse>> {
  try {
    await requireAdminOnly();
    if (!input.name?.trim()) throw new Error("Software house name is required.");
    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin
      .from("software_houses")
      .update({
        name: input.name.trim(),
        tagline: input.tagline?.trim() || null,
        logo_url: input.logo_url || null,
        watermark_url: input.watermark_url || null,
        website_url: input.website_url?.trim() || null,
        facebook_url: input.facebook_url?.trim() || null,
        phone: input.phone?.trim() || null,
        phone2: input.phone2?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        hr_manager_name: input.hr_manager_name?.trim() || null,
        ceo_name: input.ceo_name?.trim() || null,
        header_color1: input.header_color1 || '#1e40af',
        header_color2: input.header_color2 || '#1e40af',
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "Failed to update software house.");
    revalidatePath("/admin/software-houses");
    revalidatePath("/admin/internship-letters");
    return { success: true, data: data as SoftwareHouse, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update software house.") };
  }
}

export async function deleteSoftwareHouse(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdminOnly();
    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin.from("software_houses").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/software-houses");
    revalidatePath("/admin/internship-letters");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to delete software house.") };
  }
}

export async function updateApplicationStatus(applicationId: string, action: "approve_application" | "reject_application"): Promise<ActionResult> {
  try {
    await requirePermission("applications.approve");
    const supabaseAdmin = createSupabaseServiceClient();
    const supabase = await createSupabaseServerClient();

    const { data: application, error: appError } = await supabaseAdmin.from("applications").select("email").eq("id", applicationId).single();

    if (appError || !application) {
      throw new Error("Application not found.");
    }

    const { error: rpcError } = await supabase.rpc(action, { application_id: applicationId });

    if (rpcError) throw new Error(rpcError.message);

    if (action === "approve_application") {
      await supabaseAdmin.from("profiles").update({ status: "approved" }).eq("email", application.email).eq("role", "student");
    } else {
      await supabaseAdmin.from("profiles").update({ status: "rejected" }).eq("email", application.email).eq("role", "student");
    }

    revalidatePath("/admin/applications");
    revalidatePath("/admin/students");
    return { success: true, data: null, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to update application.") };
  }
}
