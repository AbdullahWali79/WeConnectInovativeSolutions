"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import type { ManualEnrollment } from "@/lib/supabase/types";
import type { ManualEnrollmentInput } from "@/app/admin/actions";

function dateInputValue(val?: string | null) {
  if (!val) return new Date().toISOString().slice(0, 10);
  return val.slice(0, 10);
}

function buildDefault(): ManualEnrollmentInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    course_name: "",
    internship_role: "",
    joining_date: today,
    completion_date: today,
    final_score: 0,
    grade: "A",
    attendance_marks: 5,
    technical_marks: 20,
    total_marks: 25,
    certificate_issued: false,
    show_on_completed_page: false,
    notes: "",
  };
}

function fromEnrollment(e: ManualEnrollment): ManualEnrollmentInput {
  return {
    full_name: e.full_name,
    father_name: e.father_name ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    course_name: e.course_name,
    internship_role: e.internship_role ?? "",
    joining_date: dateInputValue(e.joining_date),
    completion_date: dateInputValue(e.completion_date),
    final_score: e.final_score,
    grade: e.grade ?? "A",
    attendance_marks: e.attendance_marks,
    technical_marks: e.technical_marks,
    total_marks: e.total_marks,
    certificate_issued: e.certificate_issued,
    show_on_completed_page: e.show_on_completed_page,
    notes: e.notes ?? "",
  };
}

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "Distinction", "Merit", "Pass"];

export function ManualEnrollmentForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: ManualEnrollment;
  saving: boolean;
  onSave: (input: ManualEnrollmentInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ManualEnrollmentInput>(() =>
    initial ? fromEnrollment(initial) : buildDefault(),
  );

  useEffect(() => {
    setForm(initial ? fromEnrollment(initial) : buildDefault());
  }, [initial]);

  function update<K extends keyof ManualEnrollmentInput>(k: K, v: ManualEnrollmentInput[K]) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "attendance_marks" || k === "technical_marks") {
        const att = Number(k === "attendance_marks" ? v : prev.attendance_marks);
        const tech = Number(k === "technical_marks" ? v : prev.technical_marks);
        next.total_marks = Math.min(25, Math.max(0, att + tech));
        next.final_score = Math.round((next.total_marks / 25) * 100);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="wc-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/70 bg-primary/5 p-4">
        <div>
          <p className="wc-label">Manual Enrollment</p>
          <h2 className="mt-0.5 text-base font-bold text-on-surface">
            {initial ? "Edit Student Record" : "Add Offline Student"}
          </h2>
        </div>
        <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-container">
          <Icon name="close" className="text-on-surface-variant" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        {/* Personal Info */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <Icon name="person" className="text-base" /> Personal Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="wc-label mb-1">Full Name *</label>
              <input className="wc-input w-full" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Student full name" required />
            </div>
            <div>
              <label className="wc-label mb-1">Father&apos;s Name</label>
              <input className="wc-input w-full" value={form.father_name} onChange={(e) => update("father_name", e.target.value)} placeholder="Father's name" />
            </div>
            <div>
              <label className="wc-label mb-1">Email</label>
              <input className="wc-input w-full" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="student@email.com" />
            </div>
            <div>
              <label className="wc-label mb-1">Phone</label>
              <input className="wc-input w-full" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="03xx-xxxxxxx" />
            </div>
          </div>
        </section>

        {/* Course Info */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <Icon name="school" className="text-base" /> Course Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="wc-label mb-1">Course Name *</label>
              <input className="wc-input w-full" value={form.course_name} onChange={(e) => update("course_name", e.target.value)} placeholder="e.g. Web Development" required />
            </div>
            <div>
              <label className="wc-label mb-1">Internship Role</label>
              <input className="wc-input w-full" value={form.internship_role} onChange={(e) => update("internship_role", e.target.value)} placeholder="e.g. Frontend Developer" />
            </div>
            <div>
              <label className="wc-label mb-1">Joining Date</label>
              <input className="wc-input w-full" type="date" value={form.joining_date} onChange={(e) => update("joining_date", e.target.value)} />
            </div>
            <div>
              <label className="wc-label mb-1">Completion Date</label>
              <input className="wc-input w-full" type="date" value={form.completion_date} onChange={(e) => update("completion_date", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Marks */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <Icon name="grade" className="text-base" /> Marks & Grade
          </h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="wc-label mb-1">Attendance (0–5)</label>
              <input
                className="wc-input w-full"
                type="number"
                min={0}
                max={5}
                value={form.attendance_marks}
                onChange={(e) => update("attendance_marks", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="wc-label mb-1">Technical (0–20)</label>
              <input
                className="wc-input w-full"
                type="number"
                min={0}
                max={20}
                value={form.technical_marks}
                onChange={(e) => update("technical_marks", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="wc-label mb-1">Total Marks</label>
              <input className="wc-input w-full bg-surface-container" value={`${form.total_marks}/25`} readOnly />
            </div>
            <div>
              <label className="wc-label mb-1">Grade</label>
              <select className="wc-input w-full" value={form.grade} onChange={(e) => update("grade", e.target.value)}>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Options */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <Icon name="settings" className="text-base" /> Options
          </h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant/70 p-3 flex-1 hover:bg-surface-container transition">
              <input
                type="checkbox"
                checked={form.certificate_issued}
                onChange={(e) => update("certificate_issued", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-bold text-on-surface">Certificate Issued</p>
                <p className="text-xs text-on-surface-variant">Mark that a certificate was given</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant/70 p-3 flex-1 hover:bg-surface-container transition">
              <input
                type="checkbox"
                checked={form.show_on_completed_page}
                onChange={(e) => update("show_on_completed_page", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-bold text-on-surface">Show on Completed Page</p>
                <p className="text-xs text-on-surface-variant">Display publicly in completed students</p>
              </div>
            </label>
          </div>
        </section>

        {/* Notes */}
        <div>
          <label className="wc-label mb-1">Notes (optional)</label>
          <textarea
            className="wc-input w-full"
            rows={2}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Any additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-outline-variant/70 pt-4">
          <button type="button" onClick={onCancel} className="wc-secondary-btn px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="wc-primary-btn px-6 py-2 text-sm">
            <Icon name={saving ? "hourglass_empty" : "save"} className="text-base" />
            {saving ? "Saving..." : initial ? "Update Record" : "Enroll Student"}
          </button>
        </div>
      </div>
    </form>
  );
}
