"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { EmptyState } from "@/components/empty-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ManualEnrollment } from "@/lib/supabase/types";
import {
  createManualEnrollment,
  updateManualEnrollment,
  deleteManualEnrollment,
  toggleManualEnrollmentDisplay,
  type ManualEnrollmentInput,
} from "@/app/admin/actions";
import { ManualEnrollmentForm } from "./manual-enrollment-form";
import Link from "next/link";

function formatDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${val.slice(0, 10)}T00:00:00`),
  );
}

function gradeColor(grade: string | null) {
  if (!grade) return "bg-surface-container text-on-surface-variant";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (g.startsWith("B")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (g.startsWith("C")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
}

export function ManualEnrollmentManager() {
  const supabase = createSupabaseBrowserClient();
  const [enrollments, setEnrollments] = useState<ManualEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ManualEnrollment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("manual_enrollments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setToast({ type: "error", message: error.message });
    setEnrollments((data as ManualEnrollment[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const filtered = enrollments.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.course_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSave(input: ManualEnrollmentInput) {
    setSaving(true);
    const result = editing
      ? await updateManualEnrollment(editing.id, input)
      : await createManualEnrollment(input);
    setSaving(false);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save." });
      return;
    }

    setToast({ type: "success", message: editing ? "Enrollment updated." : "Student enrolled successfully!" });
    setShowForm(false);
    setEditing(null);
    await loadEnrollments();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this enrollment? This cannot be undone.")) return;
    setDeletingId(id);
    const result = await deleteManualEnrollment(id);
    setDeletingId(null);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to delete." });
    } else {
      setToast({ type: "success", message: "Enrollment deleted." });
      setEnrollments((prev) => prev.filter((e) => e.id !== id));
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    const result = await toggleManualEnrollmentDisplay(id, !current);
    setTogglingId(null);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to update." });
    } else {
      setEnrollments((prev) =>
        prev.map((e) => (e.id === id ? { ...e, show_on_completed_page: !current } : e)),
      );
    }
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />

      <PageHeader
        eyebrow="Manual Enrollments"
        title="Offline / Manual Students"
        description="Add students who have studied manually. Issue certificates and control their public visibility."
        action={
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="wc-primary-btn px-4 py-2 text-sm"
          >
            <Icon name="person_add" className="text-base" />
            Add Student
          </button>
        }
      />

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <ManualEnrollmentForm
                initial={editing ?? undefined}
                saving={saving}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            type="text"
            placeholder="Search by name, course or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="wc-input pl-10 w-full"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Students", value: enrollments.length, icon: "groups", color: "text-primary" },
          { label: "Certificates Issued", value: enrollments.filter((e) => e.certificate_issued).length, icon: "workspace_premium", color: "text-amber-500" },
          { label: "Publicly Visible", value: enrollments.filter((e) => e.show_on_completed_page).length, icon: "visibility", color: "text-emerald-500" },
          { label: "This Month", value: enrollments.filter((e) => new Date(e.created_at).getMonth() === new Date().getMonth()).length, icon: "calendar_today", color: "text-blue-500" },
        ].map((stat) => (
          <div key={stat.label} className="wc-card flex items-center gap-3 p-4">
            <Icon name={stat.icon} className={`text-2xl ${stat.color}`} />
            <div>
              <p className="text-2xl font-extrabold text-on-surface">{stat.value}</p>
              <p className="text-xs text-on-surface-variant">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="wc-card overflow-hidden">
        <div className="border-b border-outline-variant/70 p-4 flex items-center justify-between">
          <div>
            <p className="wc-label">Students</p>
            <h2 className="mt-1 text-base font-bold text-on-surface">
              {filtered.length} {filtered.length === 1 ? "record" : "records"}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-on-surface-variant">Loading enrollments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No enrollments found"
              description={search ? "Try a different search term." : "Click 'Add Student' to enroll your first manual student."}
              icon="school"
            />
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {filtered.map((enrollment, i) => (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                {/* Avatar + Info */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {enrollment.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-on-surface">{enrollment.full_name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {enrollment.course_name} {enrollment.internship_role ? `· ${enrollment.internship_role}` : ""}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDate(enrollment.joining_date)} → {formatDate(enrollment.completion_date)}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {enrollment.grade && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${gradeColor(enrollment.grade)}`}>
                      {enrollment.grade}
                    </span>
                  )}
                  {enrollment.certificate_issued && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <Icon name="workspace_premium" className="text-xs" />
                      Certificate
                    </span>
                  )}
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">Show on page</span>
                  <button
                    onClick={() => handleToggle(enrollment.id, enrollment.show_on_completed_page)}
                    disabled={togglingId === enrollment.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                      enrollment.show_on_completed_page ? "bg-primary" : "bg-outline"
                    } ${togglingId === enrollment.id ? "opacity-50" : ""}`}
                    title={enrollment.show_on_completed_page ? "Hide from completed page" : "Show on completed page"}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        enrollment.show_on_completed_page ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/manual-enrollments/${enrollment.id}`}
                    className="wc-secondary-btn px-3 py-1.5 text-xs"
                  >
                    <Icon name="visibility" className="text-xs" />
                    View
                  </Link>
                  <button
                    onClick={() => { setEditing(enrollment); setShowForm(true); }}
                    className="wc-secondary-btn px-3 py-1.5 text-xs"
                  >
                    <Icon name="edit" className="text-xs" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(enrollment.id)}
                    disabled={deletingId === enrollment.id}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <Icon name="delete" className="text-xs" />
                    {deletingId === enrollment.id ? "..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
