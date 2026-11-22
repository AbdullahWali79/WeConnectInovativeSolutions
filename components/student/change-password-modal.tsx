"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { changeStudentPassword } from "@/app/student/actions";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onSuccess?: () => void;
};

export function ChangePasswordModal({ isOpen, onClose, userEmail, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess(false);
      setSaving(false);
      return;
    }

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
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setSaving(true);
    const res = await changeStudentPassword(password);
    setSaving(false);

    if (!res.success) {
      setError(res.error || "Failed to update password.");
      return;
    }

    setSuccess(true);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="lock" className="text-xl" />
            </div>
            <div>
              <h2 id="change-password-title" className="text-lg font-black text-on-surface">
                Change Password
              </h2>
              {userEmail && (
                <p className="text-xs text-on-surface-variant font-medium truncate max-w-[220px]">
                  {userEmail}
                </p>
              )}
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
            <h3 className="text-base font-bold text-on-surface">Password updated!</h3>
            <p className="text-xs text-on-surface-variant">Your new password is now active.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  disabled={saving}
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 pr-10 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-base" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  disabled={saving}
                  className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 pr-10 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={showConfirm ? "visibility_off" : "visibility"} className="text-base" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
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
                    <Icon name="lock_reset" className="text-sm" /> Save Password
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
