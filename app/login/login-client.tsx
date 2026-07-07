"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/supabase/types";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const message = searchParams.get("message");
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(
    message ? { type: "info", message: statusMessage(message) } : null,
  );
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const clearToast = useCallback(() => setToast(null), []);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function routeAfterAuth(userId: string) {
    const { data } = await supabase.from("profiles").select("role,status").eq("id", userId).single();
    const profile = data as Pick<Profile, "role" | "status"> | null;

    if (!profile) {
      setToast({ type: "info", message: "Profile is being created. Try again after a moment." });
      return;
    }

    if (profile.status !== "approved") {
      setToast({ type: "info", message: statusMessage(profile.status) });
      return;
    }

    router.push(next ?? (profile.role === "admin" || profile.role === "teacher" ? "/admin" : "/student"));
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setToast({ type: "error", message: "Use a valid email address. Make sure it matches the email you applied with." });
      return;
    }

    if (form.password.length < 6) {
      setToast({ type: "error", message: "Password must be at least 6 characters long." });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: form.password });
    setLoading(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    if (data.user) await routeAfterAuth(data.user.id);
  }

  return (
    <main className="min-h-screen bg-[#030B1C] text-white px-5 py-8 md:px-margin-page relative overflow-hidden flex items-center justify-center">
      <style>{`body { background-color: #030B1C !important; }`}</style>
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></div>

      <Toast toast={toast} onClear={clearToast} />
      
      <div className="relative z-10 w-full max-w-6xl grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="p-8 md:p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-[#91A3C7] hover:text-[#FFD24A] transition-colors">
            <Icon name="arrow_back" className="text-lg" /> Back to landing page
          </Link>
          <div className="mt-16 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD24A] to-[#062B7F] p-[2px] shadow-[0_0_30px_rgba(255,210,74,0.3)]">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#030B1C]">
              <Icon name="lock_open" className="text-3xl text-[#FFD24A]" />
            </div>
          </div>
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.3em] text-[#FFD24A]">WeConnect-Innovation Access</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight text-white">Role-based login for admins and students.</h1>
          <p className="mt-5 text-lg leading-relaxed text-[#91A3C7]">Admins sign in with password. Students can log in instantly with the password they set during their application, once approved.</p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#061A3D]/60 p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-10">
          <form onSubmit={submit} className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-black text-[#FFD24A]">Student Login Process</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#91A3C7]">
                <li>Apply on the landing page and choose a password.</li>
                <li>Wait for admin to approve your application.</li>
                <li>Log in right here using your email and password.</li>
              </ol>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Email</span>
              <input value={form.email} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all" type="email" autoComplete="email" placeholder="you@example.com" required />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#91A3C7]">Password</span>
              <div className="relative">
                <input
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] transition-all pr-12"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#91A3C7] hover:text-[#FFD24A] transition-colors"
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-xl" />
                </button>
              </div>
            </label>

            <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] py-4 text-sm font-black text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,210,74,0.5)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100">
              {loading ? "WORKING..." : "SIGN IN"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function statusMessage(status: string) {
  if (status === "pending" || status === "profile_pending") return "Your profile is pending admin approval.";
  if (status === "rejected") return "Your application was rejected. Contact admin for clarification.";
  return "Continue after your account status is approved.";
}
