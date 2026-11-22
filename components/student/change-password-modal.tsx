"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { updateStudentAccountCredentials } from "@/app/student/actions";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  userEmail?: string | null;
  onSuccess?: (updated: { fullName: string; email: string; phone?: string | null }) => void;
};

export function ChangePasswordModal({ isOpen, onClose, profile, userEmail, onSuccess }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wantChangePassword, setWantChangePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setSuccess(false);
      setSaving(false);
      setPassword("");
      setConfirmPassword("");
      setWantChangePassword(false);
      return;
    }

    setFullName(profile?.full_name || "");
    setEmail(profile?.email || userEmail || "");
    setPhone(profile?.phone || "");

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, profile, userEmail, saving]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError("Full name is required.");
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (wantChangePassword || password) {
      if (password.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("New passwords do not match. Please verify.");
        return;
      }
    }

    setSaving(true);
    const res = await updateStudentAccountCredentials({
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      newPassword: password.trim() ? password.trim() : undefined,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error || "Failed to update profile.");
      return;
    }

    setSuccess(true);
    if (onSuccess && res.data) {
      onSuccess(res.data);
    }
    router.refresh();

    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-account-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-outline-variant/60 bg-surface p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="manage_accounts" className="text-2xl" />
            </div>
            <div>
              <h2 id="student-account-modal-title" className="text-base sm:text-lg font-black text-on-surface">
                Account &amp; Security Settings
              </h2>
              <p className="text-xs text-on-surface-variant font-medium">
                Edit your login email, phone number, name &amp; password
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition disabled:opacity-40"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Icon name="check" className="text-3xl" />
            </div>
            <h3 className="text-base font-bold text-on-surface">Account Updated Successfully!</h3>
            <p className="text-xs text-on-surface-variant">
              Your new email, phone, and credentials have been saved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                disabled={saving}
                className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Email (Login ID)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  Used to sign in at <span className="font-semibold">/login</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03xx-xxxxxxx"
                  disabled={saving}
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  Contact / WhatsApp number
                </p>
              </div>
            </div>

            {/* Password Section */}
            <div className="pt-2 border-t border-outline-variant/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Icon name="lock" className="text-sm text-primary" />
                  Password
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWantChangePassword((v) => !v);
                    if (wantChangePassword) {
                      setPassword("");
                      setConfirmPassword("");
                    }
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {wantChangePassword ? "Cancel Password Change" : "Change Password"}
                </button>
              </div>

              {wantChangePassword ? (
                <div className="space-y-3 rounded-xl border border-outline-variant/60 bg-surface-lowest p-3.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        minLength={6}
                        disabled={saving}
                        className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pr-9 text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                      >
                        <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-sm" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        minLength={6}
                        disabled={saving}
                        className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pr-9 text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                      >
                        <Icon name={showConfirm ? "visibility_off" : "visibility"} className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-on-surface-variant">
                  Password remains unchanged. Click &quot;Change Password&quot; above if you want to set a new password.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-outline-variant px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Icon name="sync" className="animate-spin text-sm" /> Saving...
                  </>
                ) : (
                  <>
                    <Icon name="save" className="text-sm" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Re-export alias for backward compatibility
export { ChangePasswordModal as StudentAccountModal };
