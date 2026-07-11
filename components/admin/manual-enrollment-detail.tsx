"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ManualEnrollment, ManualEnrollmentComment } from "@/lib/supabase/types";

function formatDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${val.slice(0, 10)}T00:00:00`),
  );
}

export function ManualEnrollmentDetail({ enrollmentId }: { enrollmentId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [enrollment, setEnrollment] = useState<ManualEnrollment | null>(null);
  const [comments, setComments] = useState<ManualEnrollmentComment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("manual_enrollments").select("*").eq("id", enrollmentId).single(),
      supabase
        .from("manual_enrollment_comments")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .order("created_at", { ascending: false }),
    ]);
    setEnrollment(e as ManualEnrollment | null);
    setComments((c as ManualEnrollmentComment[]) ?? []);
    setLoading(false);
  }, [supabase, enrollmentId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="py-20 text-center text-on-surface-variant">
        Enrollment not found.
      </div>
    );
  }

  const publicLink = `${typeof window !== "undefined" ? window.location.origin : ""}/certificate/${enrollment.id}`;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="wc-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-on-primary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black">
                {enrollment.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black">{enrollment.full_name}</h1>
                {enrollment.father_name && (
                  <p className="text-sm text-blue-100">S/O · D/O {enrollment.father_name}</p>
                )}
                <p className="text-sm text-blue-100">{enrollment.course_name}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {enrollment.certificate_issued && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200">
                  <Icon name="workspace_premium" className="text-xs" /> Certificate Issued
                </span>
              )}
              {enrollment.show_on_completed_page && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-200">
                  <Icon name="visibility" className="text-xs" /> Public
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Public link */}
        <div className="border-b border-outline-variant/70 bg-surface-container/50 px-6 py-3">
          <p className="mb-1 text-xs font-bold text-on-surface-variant">Public Certificate Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-surface-container px-3 py-1.5 text-xs text-on-surface">
              {publicLink}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(publicLink)}
              className="wc-secondary-btn px-3 py-1.5 text-xs"
            >
              <Icon name="content_copy" className="text-xs" />
              Copy
            </button>
            <a href={publicLink} target="_blank" rel="noreferrer" className="wc-primary-btn px-3 py-1.5 text-xs">
              <Icon name="open_in_new" className="text-xs" />
              Open
            </a>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Info */}
        <div className="wc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
            <Icon name="person" className="text-primary" /> Personal Details
          </h2>
          <dl className="space-y-3">
            {[
              { label: "Full Name", value: enrollment.full_name },
              { label: "Father's Name", value: enrollment.father_name },
              { label: "Email", value: enrollment.email },
              { label: "Phone", value: enrollment.phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2 border-b border-outline-variant/30 pb-2">
                <dt className="text-xs font-bold text-on-surface-variant">{label}</dt>
                <dd className="text-xs text-on-surface text-right">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Course Info */}
        <div className="wc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
            <Icon name="school" className="text-primary" /> Course Details
          </h2>
          <dl className="space-y-3">
            {[
              { label: "Course", value: enrollment.course_name },
              { label: "Role", value: enrollment.internship_role },
              { label: "Joining Date", value: formatDate(enrollment.joining_date) },
              { label: "Completion Date", value: formatDate(enrollment.completion_date) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2 border-b border-outline-variant/30 pb-2">
                <dt className="text-xs font-bold text-on-surface-variant">{label}</dt>
                <dd className="text-xs text-on-surface text-right">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Marks */}
        <div className="wc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
            <Icon name="grade" className="text-primary" /> Marks & Performance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Attendance", value: `${enrollment.attendance_marks}/5` },
              { label: "Technical", value: `${enrollment.technical_marks}/20` },
              { label: "Total Marks", value: `${enrollment.total_marks}/25` },
              { label: "Grade", value: enrollment.grade ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-surface-container p-3 text-center">
                <p className="text-lg font-black text-primary">{value}</p>
                <p className="text-xs text-on-surface-variant">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="wc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
            <Icon name="notes" className="text-primary" /> Notes
          </h2>
          <p className="text-sm text-on-surface-variant">
            {enrollment.notes ?? "No notes added for this student."}
          </p>
        </div>
      </div>

      {/* Comments Section */}
      <div className="wc-card overflow-hidden">
        <div className="border-b border-outline-variant/70 p-4 flex items-center justify-between">
          <div>
            <p className="wc-label">Student Feedback</p>
            <h2 className="mt-1 text-base font-bold text-on-surface">
              Comments ({comments.length})
            </h2>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="p-6 text-center text-sm text-on-surface-variant">
            No comments yet from this student.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {comments.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {c.commenter_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-on-surface">{c.commenter_name}</p>
                      <p className="text-xs text-on-surface-variant">{c.commenter_email}</p>
                      <p className="text-xs text-on-surface-variant ml-auto">
                        {new Intl.DateTimeFormat("en", {
                          day: "numeric", month: "short", year: "numeric",
                        }).format(new Date(c.created_at))}
                      </p>
                    </div>
                    <p className="mt-1.5 text-sm text-on-surface leading-relaxed">{c.comment}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
