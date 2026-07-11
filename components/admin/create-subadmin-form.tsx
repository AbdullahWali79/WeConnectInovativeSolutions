"use client";

import { useState } from "react";
import { createTeacherAccount } from "@/app/admin/actions";
import { Icon } from "@/components/icon";
import { SubadminPermissionsSelector } from "@/components/admin/subadmin-permissions-selector";
import {
  getPermissionLabels,
  type TeacherSelectablePermissionKey,
} from "@/lib/admin-permissions";
import type { TeacherAccount } from "@/app/admin/actions";

export type CreatedTeacherPayload = {
  teacher: TeacherAccount;
  password: string;
  loginMessage: string;
  permissionLabels: string[];
};

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export function buildTeacherLoginMessage(input: {
  fullName: string;
  email: string;
  password?: string;
  loginUrl: string;
  permissionLabels?: string[];
}) {
  const passwordLine = input.password ? `Password: ${input.password}` : "Password: Use the password shared by the admin, or request a reset if needed.";
  const featureList =
    input.permissionLabels && input.permissionLabels.length > 0
      ? input.permissionLabels.map((label) => `- ${label}`).join("\n")
      : "- No teacher modules selected yet";

  return `Assalam-o-Alaikum ${input.fullName},

Aap ka WeConnect teacher account successfully create ho gaya hai.

Login Details:
Email: ${input.email}
${passwordLine}
Login Page: ${input.loginUrl}

Allowed Features:
${featureList}

Aap admin panel mein login kar ke sirf selected features use kar sakte hain.

Security ke liye pehli login ke baad password change kar lena recommended hai.

Regards,
WeConnect Admin Team`;
}

export function CreateSubadminForm({
  onCreated,
  onCancel,
}: {
  onCreated: (payload: CreatedTeacherPayload) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<TeacherSelectablePermissionKey[]>(["dashboard.view"]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.fullName.trim()) {
      setError("Teacher name is required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Use a valid email address.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (selectedPermissions.length === 0) {
      setError("Select at least one permission for this teacher.");
      return;
    }

    setIsLoading(true);
    const result = await createTeacherAccount({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      permissions: selectedPermissions,
    });
    setIsLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create teacher account.");
      return;
    }

    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const loginMessage = buildTeacherLoginMessage({
      fullName: result.data.fullName,
      email: result.data.email,
      password: form.password,
      loginUrl: `${origin}/login`,
      permissionLabels: result.data.permissionLabels,
    });

    onCreated({ teacher: result.data, password: form.password, loginMessage, permissionLabels: result.data.permissionLabels });
    setForm(initialForm);
    setSelectedPermissions(["dashboard.view"]);
  }

  return (
    <form onSubmit={handleSubmit} className="wc-card overflow-hidden">
      <div className="border-b border-outline-variant/70 bg-surface-container-low px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name="person_add" className="text-xl" />
          </span>
          <div>
            <h2 className="text-base font-bold text-on-surface">Create teacher account</h2>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">The password is shown only once in the generated login message.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <label className="block">
          <span className="wc-label">Full Name</span>
          <input
            className="wc-input mt-2"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Enter teacher name"
            autoComplete="name"
            required
          />
        </label>

        <label className="block">
          <span className="wc-label">Email Address</span>
          <input
            className="wc-input mt-2"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="teacher@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="wc-label">Phone Number</span>
          <input
            className="wc-input mt-2"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="03xx-xxxxxxx"
            autoComplete="tel"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <label className="block">
            <span className="wc-label">Password</span>
            <div className="relative mt-2">
              <input
                className="wc-input pr-12"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary"
                title={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-xl" />
              </button>
            </div>
          </label>

          <label className="block">
            <span className="wc-label">Confirm Password</span>
            <input
              className="wc-input mt-2"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </div>

        <SubadminPermissionsSelector
          selectedPermissions={selectedPermissions}
          onChange={setSelectedPermissions}
        />

        <div className="rounded-xl bg-surface-container-low p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Selected features</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {getPermissionLabels(selectedPermissions).map((label) => (
              <span key={label} className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-bold text-on-secondary-fixed">
                {label}
              </span>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
          <button disabled={isLoading} className="wc-primary-btn w-full" type="submit">
            <Icon name="verified_user" className="text-lg" />
            {isLoading ? "Creating..." : "Create Teacher Account"}
          </button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="wc-secondary-btn w-full sm:w-auto xl:w-full 2xl:w-auto">
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
