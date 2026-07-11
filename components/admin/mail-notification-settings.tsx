"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import type { AdminMailSettings } from "@/lib/supabase/types";
import { supportedNotificationTimezones } from "@/lib/mail/timezones";
import { saveMailNotificationSettings, sendMailNotificationTestEmail } from "@/app/admin/settings/notifications/actions";

type MailSettingsView = Omit<AdminMailSettings, "id"> & {
  id: string | null;
};

type SettingsForm = {
  adminEmail: string;
  sendRegistrationAlerts: boolean;
  sendDailyPendingSummary: boolean;
  dailySummaryTime: string;
  timezone: string;
};

function toInputTime(value: string) {
  return value.slice(0, 5);
}

function toForm(settings: MailSettingsView): SettingsForm {
  return {
    adminEmail: settings.admin_email,
    sendRegistrationAlerts: settings.send_registration_alerts,
    sendDailyPendingSummary: settings.send_daily_pending_summary,
    dailySummaryTime: toInputTime(settings.daily_summary_time),
    timezone: settings.timezone,
  };
}

export function MailNotificationSettings({ initialSettings, setupError }: { initialSettings: MailSettingsView; setupError?: string | null }) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SettingsForm>(() => toForm(initialSettings));
  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const clearToast = useCallback(() => setToast(null), []);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(toForm(settings)), [form, settings]);

  function patchForm(patch: Partial<SettingsForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await saveMailNotificationSettings(form);

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setSettings(result.data);
      setForm(toForm(result.data));
      setToast({ type: "success", message: "Email notification settings saved." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to save email notification settings." });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    setTesting(true);

    try {
      const result = await sendMailNotificationTestEmail();

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setToast({
        type: "success",
        message: `Test email sent with ${result.data.totalPending} pending item${result.data.totalPending === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to send test email." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Settings"
        title="Email notifications"
        description="Control when WeConnect sends admin email alerts for registrations and pending work."
        action={
          <button type="button" onClick={sendTestEmail} disabled={testing} className="wc-secondary-btn">
            <Icon name="outgoing_mail" className="text-lg" />
            {testing ? "Sending..." : "Send test email"}
          </button>
        }
      />

      {setupError ? (
        <div className="mb-5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
          Apply the admin mail notification migration before saving settings. Database response: {setupError}
        </div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={saveSettings} className="wc-card space-y-6 p-5 md:p-6">
            <label className="block">
              <span className="wc-label">Admin notification email</span>
              <input
                className="wc-input mt-2"
                type="email"
                value={form.adminEmail}
                onChange={(event) => patchForm({ adminEmail: event.target.value })}
                placeholder="atifayyoub582@gmail.com"
                required
              />
            </label>

            <ToggleField
              icon="how_to_reg"
              title="Student Registration Alerts"
              description="Send an instant email whenever a new student submits an application or registration form."
              checked={form.sendRegistrationAlerts}
              onChange={(checked) => patchForm({ sendRegistrationAlerts: checked })}
            />

            <ToggleField
              icon="pending_actions"
              title="Daily Pending Summary"
              description="Receive one email every day with the total number of pending applications and submissions."
              checked={form.sendDailyPendingSummary}
              onChange={(checked) => patchForm({ sendDailyPendingSummary: checked })}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="wc-label">Daily summary time</span>
                <input
                  className="wc-input mt-2"
                  type="time"
                  step={900}
                  value={form.dailySummaryTime}
                  disabled={!form.sendDailyPendingSummary}
                  onChange={(event) => patchForm({ dailySummaryTime: event.target.value })}
                  required
                />
              </label>

              <label className="block">
                <span className="wc-label">Timezone</span>
                <select
                  className="wc-input mt-2"
                  value={form.timezone}
                  disabled={!form.sendDailyPendingSummary}
                  onChange={(event) => patchForm({ timezone: event.target.value })}
                >
                  {supportedNotificationTimezones.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-on-surface-variant">
                Current daily time: <span className="font-bold text-on-surface">{toInputTime(settings.daily_summary_time)}</span> {settings.timezone}
              </p>
              <button disabled={saving || !hasChanges} className="wc-primary-btn">
                <Icon name="save" className="text-lg" />
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="wc-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <Icon name="mark_email_unread" className="text-xl" />
                </span>
                <div>
                  <p className="text-sm font-bold text-on-surface">Mail endpoint</p>
                  <p className="text-xs text-on-surface-variant">Google Apps Script via Gmail</p>
                </div>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">Registration alerts</dt>
                  <dd className="font-bold text-on-surface">{settings.send_registration_alerts ? "On" : "Off"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">Daily summary</dt>
                  <dd className="font-bold text-on-surface">{settings.send_daily_pending_summary ? "On" : "Off"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">Last sent</dt>
                  <dd className="text-right font-bold text-on-surface">
                    {settings.last_daily_summary_sent_at ? new Date(settings.last_daily_summary_sent_at).toLocaleString() : "Not sent yet"}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </motion.div>
    </>
  );
}

function ToggleField({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-t border-outline-variant pt-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
            <Icon name={icon} className="text-xl" />
          </span>
          <div>
            <h2 className="text-base font-bold text-on-surface">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition ${checked ? "bg-primary" : "bg-outline-variant"}`}
        >
          <span className={`h-7 w-7 rounded-full bg-white shadow transition ${checked ? "translate-x-7" : "translate-x-0"}`} />
          <span className="sr-only">{checked ? "On" : "Off"}</span>
        </button>
      </div>
    </div>
  );
}
