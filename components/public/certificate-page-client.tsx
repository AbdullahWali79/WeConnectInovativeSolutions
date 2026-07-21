"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icon";
import { submitManualEnrollmentComment } from "@/app/admin/actions";
import type {
  AdminSignatureSettings,
  BrandingSettingsSnapshot,
  ManualEnrollment,
  ManualEnrollmentComment,
} from "@/lib/supabase/types";
import { internshipLetterCompany } from "@/lib/internship-letter-template";

function formatDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${val.slice(0, 10)}T00:00:00`),
  );
}

function getParentRelation() {
  return "S/O · D/O";
}

export function CertificatePageClient({
  enrollment,
  comments: initialComments,
  signatureSettings,
  branding,
}: {
  enrollment: ManualEnrollment;
  comments: ManualEnrollmentComment[];
  signatureSettings: AdminSignatureSettings | null;
  branding: BrandingSettingsSnapshot;
}) {
  const [comments, setComments] = useState(initialComments);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pageUrl]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    const result = await submitManualEnrollmentComment({
      enrollment_id: enrollment.id,
      commenter_name: commentName,
      commenter_email: commentEmail,
      comment: commentText,
    });

    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? "Failed to submit comment.");
      return;
    }

    setComments((prev) => [...prev, result.data]);
    setSubmitted(true);
    setCommentName("");
    setCommentEmail("");
    setCommentText("");
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${branding.background_color} 92%, white), color-mix(in srgb, ${branding.surface_color} 78%, white))`,
        color: "var(--wc-on-bg)",
      }}
    >
      <div
        className="border-b backdrop-blur-sm"
        style={{
          borderColor: `color-mix(in srgb, ${branding.primary_color} 12%, transparent)`,
          backgroundColor: "color-mix(in srgb, white 80%, transparent)",
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-16 overflow-hidden rounded">
              <Image src={branding.logo_url ?? "/logo.jpeg"} alt="WeConnect" fill className="object-contain" unoptimized />
            </div>
            <span className="text-sm font-bold text-slate-700">{internshipLetterCompany.name}</span>
          </Link>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-50"
            style={{
              borderColor: `color-mix(in srgb, ${branding.secondary_color} 26%, transparent)`,
              color: "var(--wc-on-surface)",
            }}
          >
            <span style={{ color: branding.primary_color }}>
              <Icon name={copied ? "check" : "share"} className="text-sm" />
            </span>
            {copied ? "Copied!" : "Share Certificate"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-2xl border bg-white shadow-2xl"
          style={{ borderColor: `color-mix(in srgb, ${branding.primary_color} 12%, transparent)` }}
        >
          <div
            className="p-1"
            style={{
              background: `linear-gradient(to right, ${branding.primary_color}, ${branding.secondary_color}, ${branding.accent_color})`,
            }}
          />

          <div className="p-8 font-serif">
            <div className="mb-6 border-b-2 pb-4 text-center" style={{ borderColor: branding.primary_color }}>
              <div className="mx-auto mb-2 flex h-12 w-24 items-center justify-center">
                <Image src={branding.logo_url ?? "/logo.jpeg"} alt="WeConnect" width={96} height={48} className="object-contain" unoptimized />
              </div>
              <h1 className="text-3xl font-black" style={{ color: branding.primary_color }}>
                {internshipLetterCompany.name}
              </h1>
              <p className="text-sm text-slate-600">{internshipLetterCompany.tagline}</p>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm font-bold" style={{ color: "var(--wc-on-surface)" }}>
              <p>Employee ID #: WC-{enrollment.id.slice(0, 8).toUpperCase()}</p>
              <p>Date: {formatDate(enrollment.completion_date)}</p>
            </div>

            <h2 className="my-4 text-center text-base font-bold underline" style={{ color: "var(--wc-on-surface)" }}>
              TO WHOM IT MAY CONCERN
            </h2>

            <div className="space-y-3 text-justify text-[13px] leading-relaxed text-slate-800">
              <p>
                This letter is to certify that <strong>{enrollment.full_name}</strong>
                {enrollment.father_name ? ` ${getParentRelation()} ${enrollment.father_name}` : ""} successfully completed{" "}
                {enrollment.internship_role ? `${enrollment.internship_role} internship` : "internship"} at{" "}
                <strong>{internshipLetterCompany.name}</strong>
                {enrollment.joining_date ? ` from ${formatDate(enrollment.joining_date)}` : ""}{" "}
                {enrollment.completion_date ? `to ${formatDate(enrollment.completion_date)}` : ""}.
              </p>
              <p>
                During the internship tenure, {enrollment.full_name.split(" ")[0]} demonstrated strong technical abilities,
                creativity, and a professional attitude toward responsibilities.
              </p>
              <p>
                {enrollment.full_name.split(" ")[0]} consistently displayed sincerity, punctuality, teamwork, and a willingness to
                learn.
              </p>
              <p>We wish them continued success and a bright future in all future endeavors.</p>
            </div>

            <div className="mt-5">
              <p className="mb-2 font-bold" style={{ color: "var(--wc-on-surface)" }}>
                Internship Evaluation Summary
              </p>
              <table className="w-full border text-left text-[12px]" style={{ borderColor: branding.primary_color }}>
                <thead>
                  <tr className="border-b" style={{ borderColor: branding.primary_color }}>
                    <th className="w-[14%] border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      Sr. No.
                    </th>
                    <th className="w-[58%] border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      Component
                    </th>
                    <th className="w-[28%] px-2 py-1.5">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" style={{ borderColor: branding.primary_color }}>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      1.
                    </td>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      Joining Date
                    </td>
                    <td className="px-2 py-1.5">{formatDate(enrollment.joining_date)}</td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: branding.primary_color }}>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      2.
                    </td>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      Attendance, Behavior and Interest
                    </td>
                    <td className="px-2 py-1.5">{enrollment.attendance_marks}/5</td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: branding.primary_color }}>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      3.
                    </td>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }}>
                      Practical Evaluation and Technical Performance
                    </td>
                    <td className="px-2 py-1.5">{enrollment.technical_marks}/20</td>
                  </tr>
                  <tr>
                    <td className="border-r px-2 py-1.5" style={{ borderColor: branding.primary_color }} />
                    <td className="border-r px-2 py-1.5 font-bold" style={{ borderColor: branding.primary_color }}>
                      Total Marks
                    </td>
                    <td className="px-2 py-1.5 font-bold">{enrollment.total_marks}/25</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {enrollment.grade && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">Grade:</span>
                <span
                  className="rounded-full px-3 py-0.5 text-sm font-black"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${branding.secondary_color} 18%, white)`,
                    color: branding.primary_color,
                  }}
                >
                  {enrollment.grade}
                </span>
              </div>
            )}

            <div className="mt-8 grid grid-cols-3 items-end gap-8 text-center text-[11px] text-slate-900">
              <div>
                {signatureSettings?.hr_signature_url ? (
                  <div className="relative mx-auto mb-1 h-16 w-32">
                    <Image src={signatureSettings.hr_signature_url} alt="HR Signature" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="mb-1 h-12" />
                )}
                <p className="border-b pb-1 font-bold" style={{ borderColor: branding.primary_color }}>
                  HR Manager
                </p>
                <p className="mt-1">HR Manager Signature</p>
              </div>

              <div className="mx-auto flex h-16 w-20 items-center justify-center">
                {signatureSettings?.stamp_url ? (
                  <div className="relative h-16 w-20">
                    <Image src={signatureSettings.stamp_url} alt="Company Stamp" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-14 w-16 items-center justify-center border border-dashed text-[10px]" style={{ borderColor: branding.primary_color }}>
                    Company Stamp
                  </div>
                )}
              </div>

              <div>
                {signatureSettings?.signature_url ? (
                  <div className="relative mx-auto mb-1 h-16 w-32">
                    <Image src={signatureSettings.signature_url} alt="CEO Signature" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="mb-1 h-12" />
                )}
                <p className="border-b pb-1 font-bold" style={{ borderColor: branding.primary_color }}>
                  CEO
                </p>
                <p className="mt-1">CEO Signature</p>
              </div>
            </div>

            <div className="mt-4 border-t pt-2 text-center text-[10px] leading-4 text-slate-700" style={{ borderColor: branding.primary_color }}>
              <p>
                {internshipLetterCompany.phone} | {internshipLetterCompany.email}
              </p>
              <p>{internshipLetterCompany.address}</p>
            </div>
          </div>

          <div
            className="p-1"
            style={{
              background: `linear-gradient(to right, ${branding.primary_color}, ${branding.secondary_color}, ${branding.accent_color})`,
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          {[
            { label: "Course", value: enrollment.course_name, icon: "school" },
            { label: "Duration", value: `${formatDate(enrollment.joining_date)} - ${formatDate(enrollment.completion_date)}`, icon: "date_range" },
            { label: "Grade / Score", value: `${enrollment.grade ?? "—"} · ${enrollment.total_marks}/25`, icon: "grade" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${branding.primary_color} 10%, white)`, color: branding.primary_color }}
              >
                <Icon name={item.icon} className="text-xl" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Icon name="chat_bubble" className="text-blue-500" />
              Student Testimonials
            </h2>
            <p className="mt-1 text-sm text-slate-500">{enrollment.full_name.split(" ")[0]} can leave a personal comment about their experience.</p>
          </div>

          {comments.length > 0 && (
            <div className="divide-y divide-slate-100 px-6">
              {comments.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 py-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-on-surface">
                    {c.commenter_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-bold text-slate-900">{c.commenter_name}</p>
                      <span className="text-xs text-slate-400">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(c.created_at))}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{c.comment}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="bg-slate-50/60 p-6">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-6 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <Icon name="check_circle" className="text-3xl text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-900">Thank you for your comment!</p>
                  <p className="text-sm text-slate-500">Your feedback has been saved and is now visible on this page.</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmitComment}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-slate-800">Leave Your Comment</h3>
                  <p className="text-xs text-slate-500">You can submit only one comment. Once submitted, it cannot be deleted.</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Your Name *</label>
                      <input
                        required
                        value={commentName}
                        onChange={(e) => setCommentName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Your Email *</label>
                      <input
                        required
                        type="email"
                        value={commentEmail}
                        onChange={(e) => setCommentEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Your Comment *</label>
                    <textarea
                      required
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your experience and feedback..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                      <Icon name="error" className="shrink-0 text-base" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                      <Icon name="lock" className="mr-1 inline-block text-xs" />
                      One comment per email address
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-on-surface shadow-sm transition disabled:opacity-60"
                      style={{ backgroundColor: branding.primary_color }}
                    >
                      <Icon name={submitting ? "hourglass_empty" : "send"} className="text-base" />
                      {submitting ? "Submitting..." : "Submit Comment"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="pb-4 text-center text-xs text-slate-400">
          <p>This certificate is issued by {internshipLetterCompany.name}</p>
          <p>
            {internshipLetterCompany.phone} | {internshipLetterCompany.email}
          </p>
        </div>
      </div>
    </main>
  );
}
