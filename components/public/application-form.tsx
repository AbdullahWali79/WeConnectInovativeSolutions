"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Course } from "@/lib/supabase/types";
import { Toast, type ToastState } from "@/components/toast";
import { submitStudentApplication } from "@/app/apply/actions";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { Icon } from "@/components/icon";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
  course_id: "",
  message: "",
};

export function ApplicationForm({ courses, selectedCourseId }: { courses: Course[]; selectedCourseId?: string }) {
  const initialCourseId = selectedCourseId && courses.some((course) => course.id === selectedCourseId) ? selectedCourseId : "";
  const [form, setForm] = useState({ ...initialForm, course_id: initialCourseId });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [resultMessage, setResultMessage] = useState<ToastState>(null);
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === form.course_id), [courses, form.course_id]);
  const clearToast = useCallback(() => setToast(null), []);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const formElement = event.currentTarget;
    setResultMessage(null);

    const showResult = (result: NonNullable<ToastState>, field?: string) => {
      setToast(result);
      setResultMessage(result);
      if (field) {
        const input = formElement.elements.namedItem(field);
        if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
          input.setCustomValidity(result.message);
          input.reportValidity();
        }
      } else {
        requestAnimationFrame(() => {
          resultRef.current?.focus({ preventScroll: true });
          resultRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
        });
      }
    };

    const missingField = (["course_id", "full_name", "email", "phone"] as const).find((name) => !form[name].trim());
    if (missingField) {
      showResult({ type: "error", message: "Full name, email, phone, and course are required." }, missingField);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      showResult({ type: "error", message: "Enter a valid email address." }, "email");
      return;
    }

    if (form.password.length < 6) {
      showResult({ type: "error", message: "Password must be at least 6 characters long." }, "password");
      return;
    }

    if (form.password !== form.confirm_password) {
      showResult({ type: "error", message: "Passwords do not match." }, "confirm_password");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await submitStudentApplication({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        course_id: form.course_id,
        message: form.message.trim() || null,
      });

      if (!result.success) {
        showResult({ type: "error", message: result.error });
        return;
      }

      setForm({ ...initialForm, course_id: initialCourseId });
      setShowPassword(false);
      showResult({
        type: result.warning ? "info" : "success",
        message: result.warning ?? "Application submitted successfully. A confirmation email has been sent to you, and admin will review your application soon.",
      });
    } catch (error) {
      console.error("Application submission failed", error);
      showResult({ type: "error", message: "Application could not be submitted. Please check your connection and try again." });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <form onSubmit={submit} aria-busy={loading} onInputCapture={(event) => {
        // Clear cross-field errors when either password is corrected.
        for (const input of Array.from(event.currentTarget.elements)) {
          if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) input.setCustomValidity("");
        }
      }} className="min-w-0 space-y-5 sm:space-y-6">
        <fieldset disabled={loading} className="min-w-0 space-y-5 sm:space-y-6">
          <div className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-4 text-sm text-[var(--wc-on-surface-variant)]">
            Need help? Email us at <a href={CONTACT_EMAIL_HREF} className="break-words [overflow-wrap:anywhere] font-bold text-on-surface underline underline-offset-2">{CONTACT_EMAIL}</a>
          </div>
          <div>
            <label htmlFor="application-course" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Selected Course</label>
            <select id="application-course" name="course_id" value={form.course_id} onChange={(event) => updateField("course_id", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" required>
              <option value="" disabled className="text-gray-500">
                Choose a course
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id} className="text-black">
                  {course.title}
                </option>
              ))}
            </select>
            {selectedCourse?.description ? <p className="mt-2 break-words text-sm text-[var(--wc-on-surface-variant)]">{selectedCourse.description}</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Full Name</span>
              <input name="full_name" autoComplete="name" value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="Your full name" required />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Email</span>
              <input name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={(event) => updateField("email", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="you@example.com" type="email" required />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Phone / WhatsApp</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="+92 300 0000000" required />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Message (optional)</span>
              <input name="message" value={form.message} onChange={(event) => updateField("message", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="Tell us your goal" />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2 rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-3 sm:p-5">
            <div className="md:col-span-2">
              <p className="text-sm font-bold text-[var(--wc-secondary)]">Set up your login password</p>
              <p id="application-password-help" className="mt-1 text-sm text-[var(--wc-on-surface-variant)]">Use at least 6 characters. Enter the same password in both fields.</p>
              <p className="mt-1 text-xs text-[var(--wc-on-surface-variant)]">You will use this password to log in after admin approves your application.</p>
            </div>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Password</span>
              <span className="relative block min-w-0">
                <input name="password" autoCapitalize="none" spellCheck={false} aria-describedby="application-password-help" value={form.password} onChange={(event) => updateField("password", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] py-4 pl-5 pr-14 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)]" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </button>
              </span>
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Confirm Password</span>
              <span className="relative block min-w-0">
                <input name="confirm_password" autoCapitalize="none" spellCheck={false} value={form.confirm_password} onChange={(event) => updateField("confirm_password", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] py-4 pl-5 pr-14 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)]" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </button>
              </span>
            </label>
          </div>

        </fieldset>
        {resultMessage ? (
          <div ref={resultRef} tabIndex={-1} role="alert" aria-live="polite" className={`scroll-mt-24 break-words rounded-xl border px-4 py-3 text-sm font-semibold ${resultMessage.type === "error" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"}`}>
            {resultMessage.message}
          </div>
        ) : null}

        <button type="submit" disabled={loading || courses.length === 0} className="w-full rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] py-4 text-sm font-black text-on-primary shadow-glow transition-all hover:scale-[1.02] hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100">
          {loading ? "SUBMITTING..." : "SUBMIT APPLICATION"}
        </button>
        {loading ? <p role="status" className="text-center text-sm text-[var(--wc-on-surface-variant)]">Please keep this page open while we submit your application.</p> : null}
      </form>
    </>
  );
}
