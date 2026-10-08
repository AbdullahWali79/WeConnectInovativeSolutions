"use client";
import { CmsElement } from "@/components/cms/cms-element";

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

const FREELANCER_COURSE_ID = "501c4f6d-c3db-4ca4-985e-518d5fb6ff29";

export function ApplicationForm({ courses, selectedCourseId }: { courses: Course[]; selectedCourseId?: string }) {
  const initialCourseId = selectedCourseId && courses.some((course) => course.id === selectedCourseId) ? selectedCourseId : "";
  
  const [applyMode, setApplyMode] = useState<"student" | "freelancer">(
    initialCourseId === FREELANCER_COURSE_ID ? "freelancer" : "student"
  );
  
  const [form, setForm] = useState({ 
    ...initialForm, 
    course_id: initialCourseId || (applyMode === "freelancer" ? FREELANCER_COURSE_ID : "") 
  });
  
  const [studentCourseId, setStudentCourseId] = useState(initialCourseId === FREELANCER_COURSE_ID ? "" : initialCourseId);

  function changeMode(mode: "student" | "freelancer") {
    if (mode === applyMode) return;
    if (applyMode === "student") setStudentCourseId(form.course_id);
    setApplyMode(mode);
    updateField("course_id", mode === "freelancer" ? FREELANCER_COURSE_ID : studentCourseId);
    setToast(null);
    setResultMessage(null);
  }

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
    // Read what the browser actually displays, including mobile autofill values.
    const data = new FormData(formElement);
    const values = Object.fromEntries(
      Object.keys(initialForm).map((name) => [name, String(data.get(name) ?? "")]),
    ) as typeof initialForm;
    
    // Ensure hidden field overrides if in freelancer mode
    if (applyMode === "freelancer") {
      values.course_id = FREELANCER_COURSE_ID;
    }
    
    setResultMessage(null);

    const showResult = (result: NonNullable<ToastState>, field?: string) => {
      setToast(result);
      setResultMessage(result);
      if (field) {
        const input = formElement.elements.namedItem(field);
        if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
          input.setCustomValidity(result.message);
          input.focus({ preventScroll: true });
          input.scrollIntoView({ block: "center", behavior: "auto" });
          input.reportValidity();
        }
      } else {
        requestAnimationFrame(() => {
          resultRef.current?.focus({ preventScroll: true });
          resultRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
        });
      }
    };

    const missingField = (["full_name", "email", "phone", "course_id"] as const).find((name) => !values[name].trim());
    if (missingField) {
      showResult({ type: "error", message: "Full name, email, phone, and course are required." }, missingField);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      showResult({ type: "error", message: "Enter a valid email address." }, "email");
      return;
    }

    if (values.password.length < 6) {
      showResult({ type: "error", message: "Password must be at least 6 characters long." }, "password");
      return;
    }

    if (values.password !== values.confirm_password) {
      showResult({ type: "error", message: "Passwords do not match." }, "confirm_password");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await submitStudentApplication({
        full_name: values.full_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        password: values.password,
        course_id: values.course_id,
        message: values.message.trim() || undefined,
      });

      if (!result.success) {
        showResult({ type: "error", message: result.error });
        return;
      }

      setForm({ ...initialForm, course_id: applyMode === "freelancer" ? FREELANCER_COURSE_ID : "" });
      setStudentCourseId("");
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
          <CmsElement cmsId="b947b8d4-0" as="div" className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-4 text-sm text-[var(--wc-on-surface-variant)]">
            Need help? Email us at <CmsElement cmsId="b947b8d4-1" as="a" href={CONTACT_EMAIL_HREF} className="break-words [overflow-wrap:anywhere] font-bold text-on-surface underline underline-offset-2">{CONTACT_EMAIL}</CmsElement>
          </CmsElement>

          {/* Toggle Mode */}
          <CmsElement cmsId="b947b8d4-2" as="div" role="group" aria-label="Application type" className="grid grid-cols-2 gap-1.5 bg-[var(--wc-surface-low)] rounded-xl p-1.5 border border-[var(--wc-outline-variant)] shadow-inner">
            <CmsElement cmsId="b947b8d4-3" as="button"
              type="button" 
              aria-pressed={applyMode === "student"}
              onClick={() => changeMode("student")}
              className={`min-h-14 min-w-0 px-2 py-3 text-sm leading-snug font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wc-secondary)] ${applyMode === "student" ? "bg-[var(--wc-secondary)] text-white shadow-md" : "text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10"}`}
            >
              Apply as Student
            </CmsElement>
            <CmsElement cmsId="b947b8d4-4" as="button"
              type="button" 
              aria-pressed={applyMode === "freelancer"}
              onClick={() => changeMode("freelancer")}
              className={`min-h-14 min-w-0 px-2 py-3 text-sm leading-snug font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wc-secondary)] ${applyMode === "freelancer" ? "bg-[var(--wc-secondary)] text-white shadow-md" : "text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10"}`}
            >
              Apply as Freelancer
            </CmsElement>
          </CmsElement>

          {applyMode === "student" ? (
            <CmsElement cmsId="b947b8d4-5" as="div">
              <CmsElement cmsId="b947b8d4-6" as="label" htmlFor="application-course" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Selected Course</CmsElement>
              <select id="application-course" name="course_id" value={form.course_id} onChange={(event) => updateField("course_id", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3 sm:px-5 py-3 sm:py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" required>
                <option value="" disabled className="text-gray-500">
                  Choose a course
                </option>
                {courses.filter(c => c.id !== FREELANCER_COURSE_ID).map((course) => (
                  <option key={course.id} value={course.id} className="text-black">
                    {course.title}
                  </option>
                ))}
              </select>
              {selectedCourse?.description ? <CmsElement cmsId="b947b8d4-7" as="p" className="mt-2 break-words text-sm text-[var(--wc-on-surface-variant)]">{selectedCourse.description}</CmsElement> : null}
            </CmsElement>
          ) : (
            <CmsElement cmsId="b947b8d4-8" as="div" className="rounded-xl border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 p-5 text-center">
              <Icon name="workspace_premium" className="text-3xl text-[var(--wc-secondary)] mb-2" />
              <CmsElement cmsId="b947b8d4-9" as="h3" className="text-lg font-bold text-on-surface">Freelancer Application</CmsElement>
              <CmsElement cmsId="b947b8d4-10" as="p" className="text-sm text-[var(--wc-on-surface-variant)] mt-1">You are applying to build a talent portfolio and offer your services on WeConnect.</CmsElement>
              <input type="hidden" name="course_id" value={FREELANCER_COURSE_ID} />
            </CmsElement>
          )}

          <CmsElement cmsId="b947b8d4-11" as="div" className="grid gap-5 md:grid-cols-2">
            <CmsElement cmsId="b947b8d4-12" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-13" as="span" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Full Name</CmsElement>
              <input name="full_name" autoComplete="name" value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3 sm:px-5 py-3 sm:py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="Your full name" required />
            </CmsElement>
            <CmsElement cmsId="b947b8d4-14" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-15" as="span" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Email</CmsElement>
              <input name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={(event) => updateField("email", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3 sm:px-5 py-3 sm:py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="you@example.com" type="email" required />
            </CmsElement>
            <CmsElement cmsId="b947b8d4-16" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-17" as="span" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Phone / WhatsApp</CmsElement>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3 sm:px-5 py-3 sm:py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="+92 300 0000000" required />
            </CmsElement>
            <CmsElement cmsId="b947b8d4-18" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-19" as="span" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Message (optional)</CmsElement>
              <input name="message" value={form.message} onChange={(event) => updateField("message", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3 sm:px-5 py-3 sm:py-4 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" placeholder="Tell us your goal" />
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="b947b8d4-20" as="div" className="grid min-w-0 gap-5 md:grid-cols-2 rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-3 sm:p-5">
            <CmsElement cmsId="b947b8d4-21" as="div" className="md:col-span-2">
              <CmsElement cmsId="b947b8d4-22" as="p" className="text-sm font-bold text-[var(--wc-secondary)]">Set up your login password</CmsElement>
              <CmsElement cmsId="b947b8d4-23" as="p" id="application-password-help" className="mt-1 text-sm text-[var(--wc-on-surface-variant)]">Use at least 6 characters. Enter the same password in both fields.</CmsElement>
              <CmsElement cmsId="b947b8d4-24" as="p" className="mt-1 text-xs text-[var(--wc-on-surface-variant)]">You will use this password to log in after admin approves your application.</CmsElement>
            </CmsElement>
            <CmsElement cmsId="b947b8d4-25" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-26" as="span" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Password</CmsElement>
              <CmsElement cmsId="b947b8d4-27" as="span" className="relative block min-w-0">
                <input name="password" autoCapitalize="none" spellCheck={false} aria-describedby="application-password-help" value={form.password} onChange={(event) => updateField("password", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] py-3 sm:py-4 pl-3 sm:pl-5 pr-14 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" placeholder="••••••••" required />
                <CmsElement cmsId="b947b8d4-28" as="button" type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)]" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </CmsElement>
              </CmsElement>
            </CmsElement>
            <CmsElement cmsId="b947b8d4-29" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-30" as="span" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Confirm Password</CmsElement>
              <CmsElement cmsId="b947b8d4-31" as="span" className="relative block min-w-0">
                <input name="confirm_password" autoCapitalize="none" spellCheck={false} value={form.confirm_password} onChange={(event) => updateField("confirm_password", event.target.value)} className="min-w-0 max-w-full w-full scroll-mt-24 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] py-3 sm:py-4 pl-3 sm:pl-5 pr-14 text-base text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" placeholder="••••••••" required />
                <CmsElement cmsId="b947b8d4-32" as="button" type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)]" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </CmsElement>
              </CmsElement>
            </CmsElement>
          </CmsElement>

        </fieldset>
        {resultMessage ? (
          <CmsElement cmsId="b947b8d4-33" as="div" ref={resultRef} tabIndex={-1} role="alert" aria-live="polite" className={`scroll-mt-24 break-words rounded-xl border px-4 py-3 text-sm font-semibold ${resultMessage.type === "error" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"}`}>
            {resultMessage.message}
          </CmsElement>
        ) : null}

        <CmsElement cmsId="b947b8d4-34" as="button" type="submit" disabled={loading || courses.length === 0} className="min-h-14 w-full rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] py-4 text-sm font-black text-on-primary shadow-glow transition-all hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100">
          {loading ? "SUBMITTING..." : applyMode === "student" ? "SUBMIT STUDENT APPLICATION" : "SUBMIT FREELANCER APPLICATION"}
        </CmsElement>
        {loading ? <CmsElement cmsId="b947b8d4-35" as="p" role="status" className="text-center text-sm text-[var(--wc-on-surface-variant)]">Please keep this page open while we submit your application.</CmsElement> : null}
      </form>
    </>
  );
}
