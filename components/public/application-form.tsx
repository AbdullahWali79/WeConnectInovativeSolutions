"use client";
import { CmsElement } from "@/components/cms/cms-element";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  const studentCourses = useMemo(() => {
    return courses.filter((c) => c.id !== FREELANCER_COURSE_ID);
  }, [courses]);

  const filteredStudentCourses = useMemo(() => {
    if (!courseSearch.trim()) return studentCourses;
    const q = courseSearch.toLowerCase();
    return studentCourses.filter((c) => c.title.toLowerCase().includes(q));
  }, [studentCourses, courseSearch]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function changeMode(mode: "student" | "freelancer") {
    if (mode === applyMode) return;
    if (applyMode === "student") setStudentCourseId(form.course_id);
    setApplyMode(mode);
    setIsCourseDropdownOpen(false);
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
    } else {
      values.course_id = form.course_id;
    }
    
    setResultMessage(null);

    const showResult = (result: NonNullable<ToastState>, field?: string) => {
      setToast(result);
      setResultMessage(result);
      if (field) {
        if (field === "course_id" && applyMode === "student") {
          setIsCourseDropdownOpen(true);
          const btn = document.getElementById("application-course");
          btn?.focus({ preventScroll: true });
          btn?.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
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
      showResult({ type: "error", message: missingField === "course_id" ? "Please choose a course to continue." : "Full name, email, phone, and course are required." }, missingField);
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
      }} className="min-w-0 space-y-4 sm:space-y-5">
        <fieldset disabled={loading} className="min-w-0 space-y-4 sm:space-y-5">
          {/* Top Quick Note */}
          <CmsElement cmsId="b947b8d4-0" as="div" className="rounded-xl border border-[var(--wc-outline-variant)]/70 bg-[var(--wc-surface-low)]/80 px-3.5 py-2.5 text-xs text-[var(--wc-on-surface-variant)] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Icon name="help_outline" className="text-sm text-[var(--wc-secondary)] shrink-0" />
              Need help applying?
            </span>
            <CmsElement cmsId="b947b8d4-1" as="a" href={CONTACT_EMAIL_HREF} className="font-bold text-[var(--wc-secondary)] hover:underline truncate">
              {CONTACT_EMAIL}
            </CmsElement>
          </CmsElement>

          {/* Toggle Mode */}
          <CmsElement cmsId="b947b8d4-2" as="div" role="group" aria-label="Application type" className="grid grid-cols-2 gap-1.5 bg-[var(--wc-surface-low)] rounded-xl p-1 border border-[var(--wc-outline-variant)] shadow-inner">
            <CmsElement cmsId="b947b8d4-3" as="button"
              type="button" 
              aria-pressed={applyMode === "student"}
              onClick={() => changeMode("student")}
              className={`h-11 sm:h-12 min-w-0 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wc-secondary)] cursor-pointer ${applyMode === "student" ? "bg-[var(--wc-secondary)] text-white shadow-md" : "text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10"}`}
            >
              Apply as Student
            </CmsElement>
            <CmsElement cmsId="b947b8d4-4" as="button"
              type="button" 
              aria-pressed={applyMode === "freelancer"}
              onClick={() => changeMode("freelancer")}
              className={`h-11 sm:h-12 min-w-0 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wc-secondary)] cursor-pointer ${applyMode === "freelancer" ? "bg-[var(--wc-secondary)] text-white shadow-md" : "text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10"}`}
            >
              Apply as Freelancer
            </CmsElement>
          </CmsElement>

          {/* Course Selector for Student Mode */}
          {applyMode === "student" ? (
            <CmsElement cmsId="b947b8d4-5" as="div" className="relative" ref={courseDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <CmsElement cmsId="b947b8d4-6" as="label" htmlFor="application-course" className="block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">
                  Selected Course <span className="text-red-500">*</span>
                </CmsElement>
                {selectedCourse && (
                  <button
                    type="button"
                    onClick={() => {
                      updateField("course_id", "");
                      setCourseSearch("");
                      setIsCourseDropdownOpen(true);
                    }}
                    className="text-[11px] text-[var(--wc-secondary)] hover:underline font-semibold cursor-pointer"
                  >
                    Change Course
                  </button>
                )}
              </div>

              {/* Course Selection Trigger Button */}
              <button
                type="button"
                id="application-course"
                onClick={() => setIsCourseDropdownOpen((prev) => !prev)}
                className={`w-full h-11 sm:h-12 rounded-xl border px-3.5 sm:px-4 text-[16px] sm:text-sm text-left flex items-center justify-between transition-all bg-[var(--wc-surface-lowest)] cursor-pointer ${
                  isCourseDropdownOpen
                    ? "border-[var(--wc-secondary)] ring-2 ring-[var(--wc-secondary)]/20"
                    : "border-[var(--wc-outline-variant)] hover:border-[var(--wc-secondary)]/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <Icon name="school" className={`text-base shrink-0 ${selectedCourse ? "text-[var(--wc-secondary)]" : "text-gray-400"}`} />
                  <span className={`truncate ${selectedCourse ? "font-bold text-on-surface" : "text-[#5B6B88] font-normal"}`}>
                    {selectedCourse ? selectedCourse.title : "Choose a course (Click to browse 24 courses)..."}
                  </span>
                </div>
                <Icon name={isCourseDropdownOpen ? "expand_less" : "expand_more"} className="text-gray-400 shrink-0 text-xl" />
              </button>

              <input type="hidden" name="course_id" value={form.course_id} required />

              {/* Dropdown Menu Popup */}
              {isCourseDropdownOpen && (
                <div className="absolute left-0 right-0 z-40 mt-1.5 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] shadow-2xl p-2.5 animate-in fade-in duration-150">
                  {/* Search box inside dropdown */}
                  <div className="relative mb-2">
                    <Icon name="search" className="absolute left-2.5 top-2 text-gray-400 text-[18px]" />
                    <input
                      type="text"
                      autoFocus
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Type to filter 24 courses..."
                      className="w-full h-9 rounded-lg border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] py-1.5 pl-8 pr-7 text-xs text-on-surface outline-none focus:border-[var(--wc-secondary)] focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
                    />
                    {courseSearch && (
                      <button
                        type="button"
                        onClick={() => setCourseSearch("")}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                      >
                        <Icon name="close" className="text-sm" />
                      </button>
                    )}
                  </div>

                  {/* Course items list */}
                  <div className="max-h-56 sm:max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin">
                    {filteredStudentCourses.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        No courses found matching &ldquo;{courseSearch}&rdquo;
                      </div>
                    ) : (
                      filteredStudentCourses.map((c) => {
                        const isSelected = form.course_id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              updateField("course_id", c.id);
                              setIsCourseDropdownOpen(false);
                              setCourseSearch("");
                            }}
                            className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[var(--wc-secondary)] text-white font-bold"
                                : "text-on-surface hover:bg-[var(--wc-secondary)]/10 hover:text-[var(--wc-secondary)]"
                            }`}
                          >
                            <span className="truncate pr-2">{c.title}</span>
                            {isSelected && <Icon name="check" className="text-white text-base shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {selectedCourse?.description ? (
                <CmsElement cmsId="b947b8d4-7" as="p" className="mt-1.5 break-words text-xs text-[var(--wc-on-surface-variant)] line-clamp-2">
                  {selectedCourse.description}
                </CmsElement>
              ) : null}
            </CmsElement>
          ) : (
            <CmsElement cmsId="b947b8d4-8" as="div" className="rounded-xl border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 p-3.5 text-center">
              <Icon name="workspace_premium" className="text-2xl text-[var(--wc-secondary)] mb-1" />
              <CmsElement cmsId="b947b8d4-9" as="h3" className="text-sm font-bold text-on-surface">Freelancer Registration</CmsElement>
              <CmsElement cmsId="b947b8d4-10" as="p" className="text-xs text-[var(--wc-on-surface-variant)] mt-0.5">Apply to offer your professional skills and services on WeConnect.</CmsElement>
              <input type="hidden" name="course_id" value={FREELANCER_COURSE_ID} />
            </CmsElement>
          )}

          {/* Form Inputs Grid */}
          <CmsElement cmsId="b947b8d4-11" as="div" className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
            <CmsElement cmsId="b947b8d4-12" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-13" as="span" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">
                Full Name <span className="text-red-500">*</span>
              </CmsElement>
              <input 
                name="full_name" 
                autoComplete="name" 
                value={form.full_name} 
                onChange={(event) => updateField("full_name", event.target.value)} 
                className="w-full h-11 sm:h-12 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3.5 sm:px-4 text-[16px] sm:text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" 
                placeholder="Your full name" 
                required 
              />
            </CmsElement>
            <CmsElement cmsId="b947b8d4-14" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-15" as="span" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">
                Email Address <span className="text-red-500">*</span>
              </CmsElement>
              <input 
                name="email" 
                autoComplete="email" 
                inputMode="email" 
                autoCapitalize="none" 
                spellCheck={false} 
                value={form.email} 
                onChange={(event) => updateField("email", event.target.value)} 
                className="w-full h-11 sm:h-12 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3.5 sm:px-4 text-[16px] sm:text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" 
                placeholder="you@example.com" 
                type="email" 
                required 
              />
            </CmsElement>
            <CmsElement cmsId="b947b8d4-16" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-17" as="span" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">
                Phone / WhatsApp <span className="text-red-500">*</span>
              </CmsElement>
              <input 
                name="phone" 
                type="tel" 
                inputMode="tel" 
                autoComplete="tel" 
                value={form.phone} 
                onChange={(event) => updateField("phone", event.target.value)} 
                className="w-full h-11 sm:h-12 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3.5 sm:px-4 text-[16px] sm:text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" 
                placeholder="+92 300 0000000" 
                required 
              />
            </CmsElement>
            <CmsElement cmsId="b947b8d4-18" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-19" as="span" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Message (optional)</CmsElement>
              <input 
                name="message" 
                value={form.message} 
                onChange={(event) => updateField("message", event.target.value)} 
                className="w-full h-11 sm:h-12 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-3.5 sm:px-4 text-[16px] sm:text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" 
                placeholder="Tell us your goal" 
              />
            </CmsElement>
          </CmsElement>

          {/* Password Box */}
          <CmsElement cmsId="b947b8d4-20" as="div" className="rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)]/50 p-3 sm:p-4 grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2">
            <CmsElement cmsId="b947b8d4-21" as="div" className="md:col-span-2 flex items-center justify-between gap-2">
              <CmsElement cmsId="b947b8d4-22" as="p" className="text-xs font-bold uppercase tracking-wider text-[var(--wc-secondary)]">Create Account Password</CmsElement>
              <CmsElement cmsId="b947b8d4-23" as="span" className="text-[11px] text-[var(--wc-on-surface-variant)]">Min. 6 characters</CmsElement>
            </CmsElement>
            <CmsElement cmsId="b947b8d4-25" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-26" as="span" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Password <span className="text-red-500">*</span></CmsElement>
              <CmsElement cmsId="b947b8d4-27" as="span" className="relative block min-w-0">
                <input 
                  name="password" 
                  autoCapitalize="none" 
                  spellCheck={false} 
                  value={form.password} 
                  onChange={(event) => updateField("password", event.target.value)} 
                  className="w-full h-11 sm:h-12 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] pl-3.5 sm:pl-4 pr-11 text-[16px] sm:text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" 
                  type={showPassword ? "text" : "password"} 
                  minLength={6} 
                  autoComplete="new-password" 
                  placeholder="••••••••" 
                  required 
                />
                <CmsElement cmsId="b947b8d4-28" as="button" type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)] cursor-pointer" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-lg" />
                </CmsElement>
              </CmsElement>
            </CmsElement>
            <CmsElement cmsId="b947b8d4-29" as="label" className="block min-w-0">
              <CmsElement cmsId="b947b8d4-30" as="span" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Confirm Password <span className="text-red-500">*</span></CmsElement>
              <CmsElement cmsId="b947b8d4-31" as="span" className="relative block min-w-0">
                <input 
                  name="confirm_password" 
                  autoCapitalize="none" 
                  spellCheck={false} 
                  value={form.confirm_password} 
                  onChange={(event) => updateField("confirm_password", event.target.value)} 
                  className="w-full h-11 sm:h-12 rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] pl-3.5 sm:pl-4 pr-11 text-[16px] sm:text-sm text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all" 
                  type={showPassword ? "text" : "password"} 
                  minLength={6} 
                  autoComplete="new-password" 
                  placeholder="••••••••" 
                  required 
                />
                <CmsElement cmsId="b947b8d4-32" as="button" type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--wc-on-surface-variant)] hover:text-[var(--wc-secondary)] cursor-pointer" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-lg" />
                </CmsElement>
              </CmsElement>
            </CmsElement>
          </CmsElement>

        </fieldset>

        {resultMessage ? (
          <CmsElement cmsId="b947b8d4-33" as="div" ref={resultRef} tabIndex={-1} role="alert" aria-live="polite" className={`scroll-mt-24 break-words rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold ${resultMessage.type === "error" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"}`}>
            {resultMessage.message}
          </CmsElement>
        ) : null}

        <CmsElement cmsId="b947b8d4-34" as="button" type="submit" disabled={loading || courses.length === 0} className="h-11 sm:h-12 w-full rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] text-xs sm:text-sm font-black text-on-primary shadow-glow transition-all hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer">
          {loading ? "SUBMITTING..." : applyMode === "student" ? "SUBMIT STUDENT APPLICATION" : "SUBMIT FREELANCER APPLICATION"}
        </CmsElement>
        {loading ? <CmsElement cmsId="b947b8d4-35" as="p" role="status" className="text-center text-xs text-[var(--wc-on-surface-variant)]">Please keep this page open while we submit your application.</CmsElement> : null}
      </form>
    </>
  );
}
