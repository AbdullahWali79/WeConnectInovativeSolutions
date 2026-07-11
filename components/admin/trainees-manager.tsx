"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Course, Profile, StudentFeeRecord, Trainee } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

const defaultForm = {
  name: "",
  email: "",
  course_id: "",
  assigned_tasks: "0",
  completed_tasks: "0",
  pending_tasks: "0",
  progress_percentage: "0",
  status: "pending",
};

type TraineeRowView = Trainee & {
  displayStatus: "active" | "pending_fee" | "completed" | "dropped" | "blocked";
  displayStatusLabel: string;
  feeSummaryLabel: string;
  paidMonths: number;
  feeRecordsCount: number;
  latestFeeMonth: string | null;
};

function compareMonthKeysDesc(a: string, b: string) {
  return b.localeCompare(a);
}

function formatFeeLabel(status: StudentFeeRecord["status"]) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "overdue":
      return "Pending Fee";
    case "waived":
      return "Waived";
    default:
      return "Pending Fee";
  }
}

function getStatusTone(status: TraineeRowView["displayStatus"]) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "pending_fee":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "blocked":
      return "bg-red-50 text-red-700 border-red-200";
    case "dropped":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStatusLabel(status: TraineeRowView["displayStatus"]) {
  switch (status) {
    case "active":
      return "Active";
    case "pending_fee":
      return "Pending Fee";
    case "completed":
      return "Completed";
    case "dropped":
      return "Dropped";
    case "blocked":
      return "Blocked";
    default:
      return "Pending Fee";
  }
}

export function TraineesManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const canCreate = canUse("trainees.create");
  const canEdit = canUse("trainees.edit");
  const canDelete = canUse("trainees.delete");
  const canOpenTasks = currentRole === "admin" || permissions.includes("tasks.view");
  const canOpenSubmissions = currentRole === "admin" || permissions.includes("submissions.view");
  const [rows, setRows] = useState<Trainee[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [feeRecords, setFeeRecords] = useState<StudentFeeRecord[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [traineeResult, courseResult] = await Promise.all([
      supabase.from("trainees").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
    ]);
    const [feeResult, studentResult] = await Promise.all([
      supabase.from("student_fee_records").select("*").order("month_key", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
    ]);
    if (traineeResult.error ?? courseResult.error ?? feeResult.error ?? studentResult.error) {
      setToast({
        type: "error",
        message: (traineeResult.error ?? courseResult.error ?? feeResult.error ?? studentResult.error)?.message ?? "Failed to load trainees.",
      });
    }
    setRows(traineeResult.data ?? []);
    setCourses(courseResult.data ?? []);
    setFeeRecords(feeResult.data ?? []);
    setStudents(studentResult.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const studentByEmail = useMemo(() => new Map(students.map((student) => [student.email?.trim().toLowerCase() ?? "", student])), [students]);

  const rowsWithFeeStatus = useMemo<TraineeRowView[]>(() => {
    const feeRecordsByStudentId = feeRecords.reduce((map, fee) => {
      const current = map.get(fee.student_id) ?? [];
      current.push(fee);
      map.set(fee.student_id, current);
      return map;
    }, new Map<string, StudentFeeRecord[]>());

    return rows.map((row) => {
      const student = studentByEmail.get(row.email.trim().toLowerCase());
      const records = student ? (feeRecordsByStudentId.get(student.id) ?? []).sort((a, b) => compareMonthKeysDesc(a.month_key, b.month_key)) : [];
      const latestFee = records[0] ?? null;
      const blocked = Boolean(student?.is_fee_blocked || records.some((fee) => fee.blocked));
      const paidMonths = records.filter((fee) => fee.status === "paid").length;
      const feeRecordsCount = records.length;

      let displayStatus: TraineeRowView["displayStatus"] = "pending_fee";
      if (row.status === "completed") {
        displayStatus = "completed";
      } else if (blocked) {
        displayStatus = "blocked";
      } else if (records.length > 0) {
        displayStatus = latestFee?.status === "paid" || latestFee?.status === "waived" ? "active" : "pending_fee";
      } else if (row.status === "active") {
        displayStatus = "active";
      } else if (row.status === "dropped") {
        displayStatus = "dropped";
      }

      return {
        ...row,
        displayStatus,
        displayStatusLabel: getStatusLabel(displayStatus),
        feeSummaryLabel: latestFee ? formatFeeLabel(latestFee.status) : "Pending Fee",
        paidMonths,
        feeRecordsCount,
        latestFeeMonth: latestFee?.month_key ?? null,
      };
    });
  }, [feeRecords, rows, studentByEmail]);

  const filtered = useMemo(() => rowsWithFeeStatus.filter((row) => {
    const text = `${row.name} ${row.email}`.toLowerCase();
    const queryMatch = text.includes(query.trim().toLowerCase());
    const courseMatch = courseFilter === "all" || row.course_id === courseFilter;
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && row.displayStatus === "active") ||
      (statusFilter === "pending_fee" && row.displayStatus === "pending_fee") ||
      (statusFilter === "completed" && row.displayStatus === "completed") ||
      (statusFilter === "dropped" && row.displayStatus === "dropped") ||
      (statusFilter === "blocked" && row.displayStatus === "blocked");
    const progressMatch = progressFilter === "all"
      || (progressFilter === "0-25" && row.progress_percentage <= 25)
      || (progressFilter === "26-50" && row.progress_percentage > 25 && row.progress_percentage <= 50)
      || (progressFilter === "51-75" && row.progress_percentage > 50 && row.progress_percentage <= 75)
      || (progressFilter === "76-100" && row.progress_percentage > 75);
    const created = new Date(row.created_at);
    const fromMatch = !fromDate || created >= new Date(`${fromDate}T00:00:00`);
    const toMatch = !toDate || created <= new Date(`${toDate}T23:59:59`);
    return queryMatch && courseMatch && statusMatch && progressMatch && fromMatch && toMatch;
  }), [rowsWithFeeStatus, query, courseFilter, statusFilter, progressFilter, fromDate, toDate]);

  const activeCount = rowsWithFeeStatus.filter((row) => row.displayStatus === "active").length;
  const pendingFeeCount = rowsWithFeeStatus.filter((row) => row.displayStatus === "pending_fee").length;
  const blockedCount = rowsWithFeeStatus.filter((row) => row.displayStatus === "blocked").length;

  function startEdit(row: Trainee) {
    if (!canEdit) {
      setToast({ type: "error", message: "You do not have permission to edit trainee records." });
      return;
    }
    setEditingId(row.id);
    setForm({
      name: row.name,
      email: row.email,
      course_id: row.course_id ?? "",
      assigned_tasks: String(row.assigned_tasks),
      completed_tasks: String(row.completed_tasks),
      pending_tasks: String(row.pending_tasks),
      progress_percentage: String(row.progress_percentage),
      status: row.status,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  async function saveRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canSave = editingId ? canEdit : canCreate;

    if (!canSave) {
      setToast({ type: "error", message: "You do not have permission to save trainee records." });
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setToast({ type: "error", message: "Name and email are required." });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      course_id: form.course_id || null,
      assigned_tasks: Number(form.assigned_tasks || 0),
      completed_tasks: Number(form.completed_tasks || 0),
      pending_tasks: Number(form.pending_tasks || 0),
      progress_percentage: Math.max(0, Math.min(100, Number(form.progress_percentage || 0))),
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    const request = editingId ? supabase.from("trainees").update(payload).eq("id", editingId) : supabase.from("trainees").insert(payload);
    const { error } = await request;
    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: editingId ? "Trainee updated." : "Trainee added." });
    resetForm();
    await loadData();
  }

  async function deleteRow(id: string) {
    if (!canDelete) {
      setToast({ type: "error", message: "You do not have permission to delete trainee records." });
      return;
    }
    if (!window.confirm("Delete this trainee row?")) return;
    const { error } = await supabase.from("trainees").delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Trainee deleted." });
    await loadData();
  }

  if (loading) return <LoadingState label="Loading trainees..." />;

  const traineeAccessMessage = canEdit || canDelete
    ? "Use the action buttons in the table to manage trainee records enabled for this account."
    : "You can view trainee progress, but create, edit, and delete actions are not enabled for this account.";

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Trainees"
        title="Manage trainees"
        description="Track trainee progress, update status, and monitor task completion at a glance."
        action={<Link href="/trainees" className="wc-secondary-btn text-sm"><Icon name="preview" /> View Trainees</Link>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="wc-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Active Students</p>
          <p className="mt-2 text-2xl font-black text-green-600">{activeCount}</p>
        </div>
        <div className="wc-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pending Fee</p>
          <p className="mt-2 text-2xl font-black text-amber-600">{pendingFeeCount}</p>
        </div>
        <div className="wc-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Blocked</p>
          <p className="mt-2 text-2xl font-black text-red-600">{blockedCount}</p>
        </div>
        <div className="wc-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total</p>
          <p className="mt-2 text-2xl font-black text-primary">{rowsWithFeeStatus.length}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {(canCreate || editingId) ? <form onSubmit={saveRow} className="wc-card space-y-3 p-4">
          <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit Trainee" : "Add Trainee"}</h2>
          <input className="wc-input" placeholder="Trainee name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <input className="wc-input" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          <select className="wc-input" value={form.course_id} onChange={(event) => setForm((current) => ({ ...current, course_id: event.target.value }))}>
            <option value="">Course</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>

          <div className="grid gap-2 sm:grid-cols-3">
            <input className="wc-input" type="number" min="0" placeholder="Assigned" value={form.assigned_tasks} onChange={(event) => setForm((current) => ({ ...current, assigned_tasks: event.target.value }))} />
            <input className="wc-input" type="number" min="0" placeholder="Completed" value={form.completed_tasks} onChange={(event) => setForm((current) => ({ ...current, completed_tasks: event.target.value }))} />
            <input className="wc-input" type="number" min="0" placeholder="Pending" value={form.pending_tasks} onChange={(event) => setForm((current) => ({ ...current, pending_tasks: event.target.value }))} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input className="wc-input" type="number" min="0" max="100" placeholder="Progress %" value={form.progress_percentage} onChange={(event) => setForm((current) => ({ ...current, progress_percentage: event.target.value }))} />
            <select className="wc-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button disabled={saving} className="wc-primary-btn flex-1">{saving ? "Saving..." : editingId ? "Update" : "Create"}</button>
            {editingId ? <button type="button" onClick={resetForm} className="wc-secondary-btn">Cancel</button> : null}
          </div>
        </form> : (
          <section className="wc-card p-4">
            <h2 className="text-base font-bold text-on-surface">{canEdit || canDelete ? "Trainee actions" : "Read-only trainee access"}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{traineeAccessMessage}</p>
          </section>
        )}

        <section className="wc-card overflow-hidden">
          <div className="grid gap-2 border-b border-outline-variant/50 bg-surface-container-low p-3 md:grid-cols-6">
            <input className="wc-input md:col-span-2" placeholder="Search name/email" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="wc-input" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="all">All Courses</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending_fee">Pending Fee</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
              <option value="blocked">Blocked</option>
            </select>
            <select className="wc-input" value={progressFilter} onChange={(event) => setProgressFilter(event.target.value)}><option value="all">Any Progress</option><option value="0-25">0-25%</option><option value="26-50">26-50%</option><option value="51-75">51-75%</option><option value="76-100">76-100%</option></select>
            <input className="wc-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <input className="wc-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>

          {filtered.length === 0 ? <div className="p-4"><EmptyState title="No trainees found" description="Try changing filters." icon="monitoring" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3"><p className="text-sm font-bold text-on-surface">{row.name}</p><p className="text-xs text-on-surface-variant">{row.email}</p></td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.course_id ? (courseById.get(row.course_id)?.title ?? "Unknown") : "-"}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.assigned_tasks}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.completed_tasks}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.pending_tasks}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-24">
                          <p className="mb-1 text-xs font-bold text-primary">{row.progress_percentage}%</p>
                          <div className="h-2 rounded-full bg-surface-container"><div className="h-2 rounded-full bg-primary" style={{ width: `${row.progress_percentage}%` }} /></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(row.displayStatus)}`}>
                          {row.displayStatusLabel}
                        </span>
                        <p className="mt-1 text-[11px] text-on-surface-variant">
                          {row.feeSummaryLabel}
                          {row.latestFeeMonth ? ` · ${row.latestFeeMonth}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canOpenTasks ? <Link href="/admin/tasks" className="rounded-lg bg-surface-container p-2 text-primary" title="Assign Tasks"><Icon name="assignment_add" /></Link> : null}
                          {canOpenSubmissions ? <Link href="/admin/submissions" className="rounded-lg bg-surface-container p-2 text-primary" title="Review Submissions"><Icon name="rate_review" /></Link> : null}
                          {canEdit ? <button className="rounded-lg bg-surface-container p-2 text-primary" onClick={() => startEdit(row)} title="Edit"><Icon name="edit" /></button> : null}
                          {canDelete ? <button className="rounded-lg bg-error-container p-2 text-error" onClick={() => deleteRow(row.id)} title="Delete"><Icon name="delete" /></button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
