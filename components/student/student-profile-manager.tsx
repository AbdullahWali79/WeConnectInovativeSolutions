"use client";

import { useMemo, useState, useTransition } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { updateStudentProfileLinks } from "@/app/student/actions";
import { CLIENT_HUNTING_SPECIALIZATIONS, getClientHuntSpecializationLabel, type ClientHuntSpecialization } from "@/lib/client-hunting";
import { getMissingProfileLinks, isStudentProfileComplete, normalizeProfileLinkUrl, profileLinkFields } from "@/lib/profile-links";
import type { Profile } from "@/lib/supabase/types";

type ProfileLinksForm = {
  githubUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  indeedUrl: string;
  clientHuntingSpecialization: ClientHuntSpecialization;
  clientHuntingDailyTarget: string;
};

function toForm(profile: Profile): ProfileLinksForm {
  return {
    githubUrl: profile.github_url ?? "",
    linkedinUrl: profile.linkedin_url ?? "",
    facebookUrl: profile.facebook_url ?? "",
    indeedUrl: profile.indeed_url ?? "",
    clientHuntingSpecialization: profile.client_hunting_specialization ?? "web_development",
    clientHuntingDailyTarget: String(profile.client_hunting_daily_target ?? 3),
  };
}

export function StudentProfileManager({ profile }: { profile: Profile }) {
  const [form, setForm] = useState<ProfileLinksForm>(() => toForm(profile));
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const complete = useMemo(() => isStudentProfileComplete(profile), [profile]);
  const missingLinks = useMemo(() => getMissingProfileLinks(profile), [profile]);
  const completionCount = profileLinkFields.length - missingLinks.length;

  function patchForm(patch: Partial<ProfileLinksForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    startTransition(async () => {
      const result = await updateStudentProfileLinks({
        githubUrl: form.githubUrl,
        linkedinUrl: form.linkedinUrl,
        facebookUrl: form.facebookUrl,
        indeedUrl: form.indeedUrl,
        clientHuntingSpecialization: form.clientHuntingSpecialization,
      });

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setToast({ type: "success", message: "Profile links saved successfully." });
      setForm(toForm(result.data));
    });
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="My Profile"
        title="Profile links"
        description="Add the links admin needs to verify your work and count your internship score."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill value={complete ? "approved" : "pending"} />
            <a href="/student#assigned-tasks" className="wc-primary-btn text-sm py-2 px-4">
              <Icon name="assignment" />
              Task by Admin
            </a>
          </div>
        }
      />

      {!complete ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Profile incomplete</p>
          <p className="mt-1">
            Add your GitHub, LinkedIn, Facebook, and Indeed links to activate internship score calculations and make your profile ready for review.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">Profile complete</p>
          <p className="mt-1">All verification links are present. Your internship score can now be counted normally.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={handleSubmit} className="wc-card space-y-5 p-5 md:p-6">
          {profileLinkFields.map((field) => {
            const keyMap: Record<string, keyof ProfileLinksForm> = {
              github_url: "githubUrl",
              linkedin_url: "linkedinUrl",
              facebook_url: "facebookUrl",
              indeed_url: "indeedUrl",
            };
            const formKey = keyMap[field.key];
            const value = form[formKey];

            return (
              <label key={field.key} className="block">
                <span className="wc-label">{field.label} *</span>
                <input
                  className="wc-input mt-2"
                  type="text"
                  value={value}
                  onChange={(event) => patchForm({ [formKey]: event.target.value } as Partial<ProfileLinksForm>)}
                  placeholder={`Paste your ${field.label.toLowerCase()} link`}
                />
                <p className="mt-2 text-xs text-on-surface-variant">Paste the link as-is. `https://` is optional.</p>
              </label>
              );
          })}

          <label className="block">
            <span className="wc-label">Client hunting specialization *</span>
            <select
              className="wc-input mt-2"
              required
              value={form.clientHuntingSpecialization}
              onChange={(event) => patchForm({ clientHuntingSpecialization: event.target.value as ClientHuntSpecialization })}
            >
              {CLIENT_HUNTING_SPECIALIZATIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-on-surface-variant">
              Saved value: {getClientHuntSpecializationLabel(profile.client_hunting_specialization)}
            </p>
          </label>

          <label className="block">
            <span className="wc-label">Daily client target *</span>
            <input
              className="wc-input mt-2"
              type="number"
              min="1"
              value={form.clientHuntingDailyTarget}
              onChange={(event) => patchForm({ clientHuntingDailyTarget: event.target.value })}
            />
            <p className="mt-2 text-xs text-on-surface-variant">
              This is shown for guidance only. Admin can manage the official target from the client hunting panel.
            </p>
          </label>

          <div className="flex flex-col gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">
              Completed {completionCount}/{profileLinkFields.length} required links
            </p>
            <button disabled={isPending} className="wc-primary-btn">
              <Icon name="save" className="text-lg" />
              {isPending ? "Saving..." : "Save profile links"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="wc-card p-5">
            <h2 className="text-lg font-black text-on-surface">Profile status</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Keep these links updated so admin can verify your work and calculate your internship score without delays.
            </p>
          </div>

          <div className="wc-card p-5">
            <h3 className="text-base font-bold text-on-surface">Current links</h3>
            <div className="mt-4 space-y-3">
              {profileLinkFields.map((field) => {
                const value = profile[field.key];
                return (
                  <div key={field.key} className="rounded-xl bg-surface-container-low p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-on-surface">{field.label}</span>
                      {value ? <Icon name="check_circle" className="text-emerald-600" /> : <Icon name="error" className="text-amber-600" />}
                    </div>
                    {value ? (
                      <a href={normalizeProfileLinkUrl(value)} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-semibold text-primary underline underline-offset-4">
                        {value}
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-on-surface-variant">Not added yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <EmptyState
            title="Why this is required"
            description="Your profile links help the admin verify your work and keep your internship score active."
            icon="verified_user"
          />
        </aside>
      </div>
    </>
  );
}
