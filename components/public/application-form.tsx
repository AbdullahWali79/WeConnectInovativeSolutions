"use client";

import { useCallback, useMemo, useState } from "react";
import type { Course } from "@/lib/supabase/types";
import { Toast, type ToastState } from "@/components/toast";
import { submitStudentApplication } from "@/app/apply/actions";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

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

  const selectedCourse = useMemo(() => courses.find((course) => course.id === form.course_id), [courses, form.course_id]);
  const clearToast = useCallback(() => setToast(null), []);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.course_id) {
      setToast({ type: "error", message: "Full name, email, phone, and course are required." });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setToast({ type: "error", message: "Enter a valid email address." });
      return;
    }

    if (form.password.length < 6) {
      setToast({ type: "error", message: "Password must be at least 6 characters long." });
      return;
    }

    if (form.password !== form.confirm_password) {
      setToast({ type: "error", message: "Passwords do not match." });
      return;
    }

    setLoading(true);
    const result = await submitStudentApplication({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
      course_id: form.course_id,
      message: form.message.trim() || null,
    });
    setLoading(false);

    if (!result.success) {
      setToast({ type: "error", message: result.error });
      return;
    }

    setForm({ ...initialForm, course_id: initialCourseId });
    setToast({
      type: result.warning ? "info" : "success",
      message: result.warning ?? "Application submitted. Admin will review it from the dashboard.",
    });
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#91A3C7]">
          Need help? Email us at <a href={CONTACT_EMAIL_HREF} className="font-bold text-white underline underline-offset-2">{CONTACT_EMAIL}</a>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Selected Course</label>
          <select value={form.course_id} onChange={(event) => updateField("course_id", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" required>
            <option value="" disabled className="text-gray-500">
              Choose a course
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id} className="text-black">
                {course.title}
              </option>
            ))}
          </select>
          {selectedCourse?.description ? <p className="mt-2 text-sm text-[#91A3C7]">{selectedCourse.description}</p> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Full Name</span>
            <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" placeholder="Your full name" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Email</span>
            <input value={form.email} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" placeholder="you@example.com" type="email" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Phone / WhatsApp</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" placeholder="+92 300 0000000" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Message</span>
            <input value={form.message} onChange={(event) => updateField("message", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" placeholder="Tell us your goal" />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2 rounded-2xl border border-white/5 bg-white/5 p-5">
          <div className="md:col-span-2">
            <p className="text-sm font-bold text-[#FFD24A]">Set up your login password</p>
            <p className="mt-1 text-xs text-[#91A3C7]">You will use this password to log in after admin approves your application.</p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Password</span>
            <input value={form.password} onChange={(event) => updateField("password", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" type="password" minLength={6} placeholder="••••••••" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Confirm Password</span>
            <input value={form.confirm_password} onChange={(event) => updateField("confirm_password", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" type="password" minLength={6} placeholder="••••••••" required />
          </label>
        </div>

        <button disabled={loading || courses.length === 0} className="w-full rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] py-4 text-sm font-black text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,210,74,0.5)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100">
          {loading ? "SUBMITTING..." : "SEND APPLICATION INTEREST"}
        </button>
      </form>
    </>
  );
}
