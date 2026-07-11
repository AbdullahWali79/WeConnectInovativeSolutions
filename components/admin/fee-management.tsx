"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deleteStudentFeeRecord, toggleStudentFeeBlock, upsertStudentFeeRecord } from "@/app/admin/actions";
import type { Course, Enrollment, Profile, StudentFeeRecord, StudentFeeStatus } from "@/lib/supabase/types";

type EditableFee = Record<string, {
  amount_due: string;
  amount_paid: string;
  due_date: string;
  paid_at: string;
  status: StudentFeeStatus;
  payment_method: string;
  notes: string;
}>;

type StudentFeeSummary = {
  student: Profile;
  totalRecords: number;
  paidRecords: number;
  pendingRecords: number;
  blocked: boolean;
  courseIds: string[];
  latestMonthKey: string;
};

type StudentFeeView = StudentFeeSummary & {
  displayStatus: "active" | "pending_fee" | "blocked";
  displayStatusLabel: string;
  latestFeeLabel: string;
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(monthKey: string, monthsToAdd: number) {
  const [yearPart, monthPart] = monthKey.split("-").map(Number);
  if (!yearPart || !monthPart) return currentMonthKey();

  const nextDate = new Date(yearPart, monthPart - 1 + monthsToAdd, 1);
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getNextMonthKey(monthKey: string) {
  return addMonths(monthKey, 1);
}

function getSuggestedFeeMonth(
  feeRows: StudentFeeRecord[],
  studentId: string,
  courseId: string,
) {
  const relevantRows = feeRows
    .filter((fee) => fee.student_id === studentId && fee.course_id === courseId)
    .sort((a, b) => b.month_key.localeCompare(a.month_key));

  return relevantRows[0]?.month_key ? getNextMonthKey(relevantRows[0].month_key) : currentMonthKey();
}

function getFeeStatusTone(status: StudentFeeStatus | "blocked") {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 ring-green-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "partial":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "overdue":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "waived":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "blocked":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getFeeStatusLabel(status: StudentFeeStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "waived":
      return "Waived";
    case "pending":
    case "overdue":
    default:
      return "Pending Fee";
  }
}

export function FeeManagement() {
  const supabase = createSupabaseBrowserClient();
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [fees, setFees] = useState<StudentFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [isQuickFeesOpen, setIsQuickFeesOpen] = useState(false);
  const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [quickCourseId, setQuickCourseId] = useState("");
  const [quickMonth, setQuickMonth] = useState(currentMonthKey());
  const [quickAmountDue, setQuickAmountDue] = useState("0");
  const [forms, setForms] = useState<EditableFee>({});
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [studentResult, courseResult, enrollmentResult, feeResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
      supabase.from("courses").select("*").order("title"),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("student_fee_records").select("*").order("month_key", { ascending: false }),
    ]);

    const error = studentResult.error ?? courseResult.error ?? enrollmentResult.error ?? feeResult.error;
    if (error) setToast({ type: "error", message: error.message });

    const feeRows = feeResult.data ?? [];
    setStudents(studentResult.data ?? []);
    setCourses(courseResult.data ?? []);
    setEnrollments(enrollmentResult.data ?? []);
    setFees(feeRows);
    setForms(Object.fromEntries(feeRows.map((fee) => [fee.id, {
      amount_due: String(fee.amount_due ?? 0),
      amount_paid: String(fee.amount_paid ?? 0),
      due_date: fee.due_date ?? "",
      paid_at: fee.paid_at ?? "",
      status: fee.status,
      payment_method: fee.payment_method ?? "",
      notes: fee.notes ?? "",
    }])));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const enrollmentById = useMemo(() => new Map(enrollments.map((enrollment) => [enrollment.id, enrollment])), [enrollments]);
  const activeEnrollments = useMemo(() => enrollments.filter((enrollment) => enrollment.status === "active"), [enrollments]);
  const latestFeeByEnrollment = useMemo(() => {
    const map = new Map<string, StudentFeeRecord>();

    for (const fee of fees) {
      const key = `${fee.student_id}:${fee.course_id}`;
      const current = map.get(key);
      if (!current || fee.updated_at > current.updated_at) {
        map.set(key, fee);
      }
    }

    return map;
  }, [fees]);
  const paidActiveStudentIds = useMemo(() => {
    const ids = new Set<string>();

    for (const enrollment of activeEnrollments) {
      const fee = latestFeeByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`);
      if (!fee) continue;
      if (fee.status === "paid" || fee.status === "waived") {
        ids.add(enrollment.student_id);
      }
    }

    return ids;
  }, [activeEnrollments, latestFeeByEnrollment]);
  const selectedStudent = selectedStudentId ? studentById.get(selectedStudentId) ?? null : null;

  const selectedStudentEnrollments = useMemo(() => {
    if (!selectedStudentId) return [];
    return enrollments
      .filter((enrollment) => enrollment.student_id === selectedStudentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [enrollments, selectedStudentId]);

  const selectedStudentFees = useMemo(() => {
    if (!selectedStudentId) return [];
    return fees.filter((fee) => fee.student_id === selectedStudentId);
  }, [fees, selectedStudentId]);

  const studentLookupResults = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    const candidates = students.filter((student) => {
      if (!search) return true;
      const text = `${student.full_name ?? ""} ${student.email ?? ""} ${student.phone ?? ""}`.toLowerCase();
      return text.includes(search);
    });

    return candidates.slice(0, 12);
  }, [studentSearch, students]);

  const studentFeeSummaries = useMemo(() => {
    const summaryMap = new Map<string, StudentFeeSummary>();

    for (const fee of fees) {
      const student = studentById.get(fee.student_id);
      if (!student) continue;

      const current = summaryMap.get(student.id) ?? {
        student,
        totalRecords: 0,
        paidRecords: 0,
        pendingRecords: 0,
        blocked: Boolean(student.is_fee_blocked),
        courseIds: [],
        latestMonthKey: fee.month_key,
      };

      current.totalRecords += 1;
      current.paidRecords += fee.status === "paid" ? 1 : 0;
      current.pendingRecords += fee.status === "pending" || fee.status === "overdue" ? 1 : 0;
      current.blocked = current.blocked || Boolean(student.is_fee_blocked || fee.blocked);
      if (!current.courseIds.includes(fee.course_id)) {
        current.courseIds.push(fee.course_id);
      }
      if (fee.month_key > current.latestMonthKey) {
        current.latestMonthKey = fee.month_key;
      }

      summaryMap.set(student.id, current);
    }

    return Array.from(summaryMap.values()).sort((a, b) => {
      if (b.paidRecords !== a.paidRecords) return b.paidRecords - a.paidRecords;
      if (b.totalRecords !== a.totalRecords) return b.totalRecords - a.totalRecords;
      return (a.student.full_name ?? "").localeCompare(b.student.full_name ?? "");
    });
  }, [fees, studentById]);

  const studentFeeViews = useMemo<StudentFeeView[]>(() => {
    return studentFeeSummaries.map((summary) => {
      const latestFee = fees
        .filter((fee) => fee.student_id === summary.student.id)
        .sort((a, b) => b.month_key.localeCompare(a.month_key))[0] ?? null;

      const displayStatus: StudentFeeView["displayStatus"] = summary.blocked
        ? "blocked"
        : latestFee?.status === "paid" || latestFee?.status === "waived"
          ? "active"
          : "pending_fee";

      return {
        ...summary,
        displayStatus,
        displayStatusLabel: displayStatus === "active" ? "Active" : displayStatus === "blocked" ? "Blocked" : "Pending Fee",
        latestFeeLabel: latestFee ? getFeeStatusLabel(latestFee.status) : "Pending Fee",
      };
    });
  }, [fees, studentFeeSummaries]);

  const selectedStudentCourseOptions = useMemo(() => {
    const options = selectedStudentEnrollments
      .map((enrollment) => courseById.get(enrollment.course_id))
      .filter((course): course is Course => Boolean(course));

    return options.length > 0 ? options : courses;
  }, [courseById, courses, selectedStudentEnrollments]);

  const selectedStudentPaidMonths = selectedStudentFees.filter((fee) => fee.status === "paid").length;
  const selectedStudentTotalMonths = selectedStudentFees.length;
  const selectedStudentPrimaryCourse = selectedStudentCourseOptions[0] ?? null;
  const selectedStudentFeeView = useMemo(() => {
    const summary = studentFeeViews.find((item) => item.student.id === selectedStudentId) ?? null;
    if (!summary) return null;
    return summary;
  }, [selectedStudentId, studentFeeViews]);

  const filteredFees = useMemo(() => {
    const search = query.trim().toLowerCase();
    return fees.filter((fee) => {
      const student = studentById.get(fee.student_id);
      const course = courseById.get(fee.course_id);
      const text = `${student?.full_name ?? ""} ${student?.email ?? ""} ${student?.phone ?? ""} ${course?.title ?? ""}`.toLowerCase();
      const statusMatch =
        statusFilter === "all" ||
        fee.status === statusFilter ||
        (statusFilter === "pending_fee" && (fee.status === "pending" || fee.status === "overdue")) ||
        (statusFilter === "blocked" && (student?.is_fee_blocked || fee.blocked));
      const queryMatch = !search || text.includes(search);
      return statusMatch && queryMatch;
    });
  }, [courseById, fees, query, statusFilter, studentById]);

  const stats = useMemo(() => {
    return {
      total: fees.length,
      paid: paidActiveStudentIds.size,
      pending: fees.filter((fee) => fee.status === "pending" || fee.status === "overdue").length,
      blocked: fees.filter((fee) => fee.blocked || studentById.get(fee.student_id)?.is_fee_blocked).length,
    };
  }, [fees, paidActiveStudentIds, studentById]);

  function updateForm(id: string, patch: Partial<EditableFee[string]>) {
    setForms((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function selectStudent(studentId: string) {
    const student = studentById.get(studentId);
    if (!student) return;

    setSelectedStudentId(studentId);
    setStudentSearch(student.full_name ?? student.email ?? student.phone ?? "");
  }

  useEffect(() => {
    if (!selectedStudentId) return;

    const activeEnrollment = selectedStudentEnrollments[0] ?? null;
    const suggestedCourseId = activeEnrollment?.course_id ?? courses[0]?.id ?? "";
    const suggestedMonth = suggestedCourseId ? getSuggestedFeeMonth(fees, selectedStudentId, suggestedCourseId) : currentMonthKey();

    setQuickCourseId(suggestedCourseId);
    setQuickMonth(suggestedMonth);
  }, [courses, fees, selectedStudentEnrollments, selectedStudentId]);

  async function saveFee(fee: StudentFeeRecord) {
    const form = forms[fee.id];
    if (!form) return;
    setBusyId(fee.id);
    const result = await upsertStudentFeeRecord({
      id: fee.id,
      student_id: fee.student_id,
      enrollment_id: fee.enrollment_id,
      course_id: fee.course_id,
      month_key: fee.month_key,
      amount_due: Number(form.amount_due || 0),
      amount_paid: Number(form.amount_paid || 0),
      due_date: form.due_date || null,
      paid_at: form.paid_at || null,
      status: form.status,
      payment_method: form.payment_method,
      notes: form.notes,
    });
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Fee record could not be saved." });
      return;
    }

    setToast({ type: "success", message: "Fee record updated." });
    await loadData();
  }

  async function saveQuickFee() {
    if (!selectedStudentId) {
      setToast({ type: "error", message: "Please select a student first." });
      return;
    }

    if (!quickCourseId) {
      setToast({ type: "error", message: "Please select a course." });
      return;
    }

    setBusyId("quick-save");
    const result = await upsertStudentFeeRecord({
      student_id: selectedStudentId,
      course_id: quickCourseId,
      month_key: quickMonth,
      amount_due: Number(quickAmountDue || 0),
      amount_paid: 0,
      status: "pending",
    });
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Fee record could not be saved." });
      return;
    }

    setToast({ type: "success", message: "Fee record saved for the selected student." });
    setIsQuickFeesOpen(false);
    await loadData();
  }

  async function setBlocked(fee: StudentFeeRecord, blocked: boolean) {
    const reason = blocked ? window.prompt("Block reason", "Monthly fee pending") : "";
    if (blocked && reason === null) return;
    setBusyId(`block-${fee.id}`);
    const result = await toggleStudentFeeBlock({
      student_id: fee.student_id,
      fee_record_id: fee.id,
      blocked,
      reason: reason ?? "",
    });
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Student block status could not be updated." });
      return;
    }

    setToast({ type: "success", message: blocked ? "Student blocked for fee follow-up." : "Student unblocked." });
    await loadData();
  }

  async function removeFee(fee: StudentFeeRecord) {
    const ok = window.confirm(`Delete fee record for ${studentById.get(fee.student_id)?.full_name ?? "this student"}?`);
    if (!ok) return;

    setBusyId(`delete-${fee.id}`);
    const result = await deleteStudentFeeRecord(fee.id);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Fee record could not be deleted." });
      return;
    }

    setToast({ type: "success", message: "Fee record deleted." });
    await loadData();
  }

  if (loading) return <LoadingState label="Loading fee management..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Fee Management"
        title="Monthly student fee status"
        description="Track monthly payments for active enrollments. Current date paid students are counted, and overdue records are excluded from paid status."
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FeeStat icon="receipt_long" label="Month records" value={stats.total} />
          <FeeStat icon="paid" label="Current date paid students" value={stats.paid} tone="success" />
          <FeeStat icon="schedule" label="Pending Fee" value={stats.pending} tone="gold" />
          <FeeStat icon="block" label="Blocked" value={stats.blocked} tone="error" />
        </div>

        <section className="wc-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-outline-variant/70 bg-surface-container-low p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-primary">Quick fee entry</p>
              <h3 className="mt-1 text-xl font-black text-on-surface">Open fee entry popup</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Click the button and add fee details in a popup box.</p>
            </div>
            <button type="button" onClick={() => setIsQuickFeesOpen(true)} className="wc-primary-btn">
              <Icon name="add_card" className="text-lg" />
              Quick Fees Entry
            </button>
          </div>
        </section>
        {isQuickFeesOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[28px] bg-surface shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-outline-variant/70 bg-surface-container-low p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-primary">Quick fee entry</p>
                  <h3 className="mt-1 text-xl font-black text-on-surface">Add Fees</h3>
                </div>
                <button type="button" onClick={() => setIsQuickFeesOpen(false)} className="wc-secondary-btn">
                  Close
                </button>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-3">
                  <input
                    className="wc-input"
                    value={studentSearch}
                    onChange={(event) => {
                      setStudentSearch(event.target.value);
                      setSelectedStudentId("");
                    }}
                    placeholder="Search student by name, email, or phone"
                  />

                  <div className="max-h-72 space-y-2 overflow-auto pr-1">
                    {studentLookupResults.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-outline-variant/70 p-4 text-sm text-on-surface-variant">
                        No student matches found.
                      </div>
                    ) : (
                      studentLookupResults.map((student) => {
                        const isSelected = student.id === selectedStudentId;
                        const studentSummary = studentFeeSummaries.find((summary) => summary.student.id === student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => selectStudent(student.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary-container text-on-primary-container"
                                : "border-outline-variant/70 bg-surface hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold">{student.full_name ?? "Unnamed student"}</p>
                                <p className="mt-1 text-xs opacity-80">{student.email ?? "No email"} Â· {student.phone ?? "No phone"}</p>
                              </div>
                              {studentSummary ? (
                                <div className="text-right text-[11px] font-bold uppercase tracking-wider opacity-80">
                                  <div>{studentSummary.paidRecords} paid</div>
                                  <div>{studentSummary.totalRecords} months</div>
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-[24px] border border-outline-variant/70 bg-surface-container-low p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Assignment details</p>
                    <h4 className="mt-1 text-lg font-black text-on-surface">
                      {selectedStudent?.full_name ?? "Select a student"}
                    </h4>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {selectedStudent?.email ?? "Student summary appears here after selection."}
                    </p>
                  </div>

                  {selectedStudent ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-surface p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Paid months</p>
                        <p className="mt-1 text-2xl font-black text-primary">{selectedStudentPaidMonths}</p>
                      </div>
                      <div className="rounded-xl bg-surface p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total records</p>
                        <p className="mt-1 text-2xl font-black text-primary">{selectedStudentTotalMonths}</p>
                      </div>
                      <div className="rounded-xl bg-surface p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</p>
                        <div className="mt-1">
                          <StatusPill value={selectedStudentFeeView?.displayStatus ?? (selectedStudent.is_fee_blocked ? "blocked" : "pending_fee")} />
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-on-surface-variant">
                          {selectedStudentFeeView?.displayStatusLabel ?? "Pending Fee"}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <input className="wc-input bg-surface-container text-on-surface-variant" value={selectedStudentPrimaryCourse?.title ?? "Auto course pending"} disabled />
                    <input className="wc-input" type="month" value={quickMonth} onChange={(event) => setQuickMonth(event.target.value)} />
                    <input className="wc-input" type="number" min="0" value={quickAmountDue} onChange={(event) => setQuickAmountDue(event.target.value)} placeholder="Amount due" />
                    <button type="button" disabled={busyId === "quick-save"} onClick={saveQuickFee} className="wc-primary-btn w-full">
                      <Icon name="add_card" className="text-lg" />
                      {busyId === "quick-save" ? "Saving..." : "Add Fee Record"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="wc-card overflow-hidden">
          <div className="grid gap-3 border-b border-outline-variant/70 bg-surface-container-low p-4 md:grid-cols-3">
            <input className="wc-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, email, phone, course" />
            <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending_fee">Pending Fee</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="waived">Waived</option>
              <option value="blocked">Blocked</option>
            </select>
            <div className="flex items-center justify-end text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Showing {filteredFees.length} records
            </div>
          </div>

          {filteredFees.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No fee records found" description="Try another search or status filter." icon="receipt_long" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[26%]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-outline-variant/70 bg-surface-container-low text-left text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((fee) => {
                    const student = studentById.get(fee.student_id);
                    const course = courseById.get(fee.course_id);
                    const form = forms[fee.id];
                    const blocked = Boolean(student?.is_fee_blocked || fee.blocked);
                    const isExpanded = expandedFeeId === fee.id;
                    const statusTone = blocked ? "blocked" : fee.status;

                    return (
                      <Fragment key={fee.id}>
                        <tr key={fee.id} className="border-b border-outline-variant/60 align-top hover:bg-surface-container/40">
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedFeeId(isExpanded ? null : fee.id)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-sm font-black text-primary transition hover:bg-surface-container-high"
                                aria-label={isExpanded ? "Collapse fee details" : "Expand fee details"}
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                              <span className="min-w-0 truncate font-bold text-on-surface">{student?.full_name ?? 'Unknown student'}</span>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ${getFeeStatusTone(statusTone)}`}>
                                {blocked ? "Blocked" : getFeeStatusLabel(fee.status)}
                              </span>
                            </div>
                            <span className="truncate text-xs text-on-surface-variant">{student?.email ?? 'No email'} · {student?.phone ?? 'No phone'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="truncate font-semibold text-primary">{course?.title ?? 'Unknown course'}</div>
                          <div className="truncate text-xs text-on-surface-variant">
                            Enrollment {fee.enrollment_id ? enrollmentById.get(fee.enrollment_id)?.status ?? 'not linked' : 'not linked'}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle text-sm whitespace-nowrap text-on-surface-variant">{fee.month_key}</td>

                        <td className="px-4 py-4 align-middle">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-on-surface">Due {fee.amount_due ?? 0}</div>
                            <div className="text-xs text-on-surface-variant">Paid {fee.amount_paid ?? 0}</div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ${getFeeStatusTone(statusTone)}`}>
                            {blocked ? "Blocked" : getFeeStatusLabel(fee.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <button
                            type="button"
                            onClick={() => setExpandedFeeId(isExpanded ? null : fee.id)}
                            className="wc-secondary-btn whitespace-nowrap px-4 py-2 text-sm"
                          >
                            {isExpanded ? "Collapse" : "Edit"}
                          </button>
                        </td>
                      </tr>
                        {isExpanded ? (
                          <tr className="bg-surface-container/30">
                            <td colSpan={6} className="px-4 pb-4">
                              <div className="grid gap-3 rounded-2xl border border-outline-variant/70 bg-surface p-4 lg:grid-cols-4">
                                <input className="wc-input h-10" type="number" min="0" value={form?.amount_due ?? fee.amount_due ?? 0} onChange={(event) => updateForm(fee.id, { amount_due: event.target.value })} placeholder="Due amount" />
                                <input className="wc-input h-10" type="number" min="0" value={form?.amount_paid ?? fee.amount_paid ?? 0} onChange={(event) => updateForm(fee.id, { amount_paid: event.target.value })} placeholder="Paid amount" />
                                <select className="wc-input h-10" value={form?.status ?? fee.status} onChange={(event) => updateForm(fee.id, { status: event.target.value as StudentFeeStatus })}>
                                  <option value="pending">Pending</option>
                                  <option value="partial">Partial</option>
                                  <option value="paid">Paid</option>
                                  <option value="overdue">Overdue</option>
                                  <option value="waived">Waived</option>
                                </select>
                                <input className="wc-input h-10" value={form?.payment_method ?? fee.payment_method ?? ""} onChange={(event) => updateForm(fee.id, { payment_method: event.target.value })} placeholder="Payment method" />
                                <input className="wc-input h-10" type="date" value={form?.due_date ?? fee.due_date ?? ""} onChange={(event) => updateForm(fee.id, { due_date: event.target.value })} />
                                <input className="wc-input h-10" type="date" value={form?.paid_at ?? fee.paid_at ?? ""} onChange={(event) => updateForm(fee.id, { paid_at: event.target.value })} />
                                <textarea className="wc-input min-h-24 lg:col-span-2" value={form?.notes ?? fee.notes ?? ""} onChange={(event) => updateForm(fee.id, { notes: event.target.value })} placeholder="Notes" />
                                <div className="lg:col-span-2 rounded-xl bg-surface-container p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Block reason</p>
                                  <p className="mt-1 text-sm text-on-surface">{student?.fee_block_reason || (blocked ? "Student is currently blocked." : "No block reason")}</p>
                                </div>
                                <div className="lg:col-span-4 flex flex-wrap gap-2 pt-2">
                                  <button type="button" disabled={busyId === fee.id} onClick={() => saveFee(fee)} className="wc-primary-btn whitespace-nowrap px-4 py-2 text-sm">
                                    {busyId === fee.id ? "Saving..." : "Save changes"}
                                  </button>
                                  <button type="button" disabled={busyId === ('block-' + fee.id)} onClick={() => setBlocked(fee, !blocked)} className={blocked ? "wc-secondary-btn whitespace-nowrap px-4 py-2 text-sm" : "rounded-xl bg-error-container px-4 py-2 text-sm font-bold text-error"}>
                                    {blocked ? "Unblock" : "Block"}
                                  </button>
                                  <button type="button" disabled={busyId === ('delete-' + fee.id)} onClick={() => removeFee(fee)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
                                    {busyId === ('delete-' + fee.id) ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </motion.div>
    </>
  );
}

function FeeStat({ icon, label, value, tone }: { icon: string; label: string; value: number; tone?: "success" | "gold" | "error" }) {
  const toneClass =
    tone === "success" ? "bg-green-50 text-green-700" :
    tone === "gold" ? "bg-secondary-container text-on-secondary-fixed" :
    tone === "error" ? "bg-error-container text-error" :
    "bg-surface-container text-primary";

  return (
    <div className="wc-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
          <p className="mt-2 text-2xl font-black text-primary">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon name={icon} className="text-2xl" />
        </span>
      </div>
    </div>
  );
}


