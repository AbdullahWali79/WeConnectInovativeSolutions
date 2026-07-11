"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import type { AdminNotificationSettings } from "@/lib/supabase/types";
import { supportedWhatsAppTimezones } from "@/lib/whatsapp/settings";
import { sendWhatsAppPendingSummaryTest, updateWhatsAppAlertSettings } from "@/app/admin/notification-settings/actions";
import {
  defaultApprovedStudentWhatsappTemplate,
  defaultPendingSummaryWhatsAppTemplate,
  defaultRegistrationWhatsAppTemplate,
  buildApprovedStudentWhatsAppPreview,
  buildPendingSummaryWhatsAppPreview,
  buildRegistrationWhatsAppPreview,
} from "@/lib/whatsapp/message-templates";

type SettingsView = Omit<AdminNotificationSettings, "id"> & {
  id: string | null;
};

type SettingsForm = {
  whatsappNumber: string;
  registrationAlertEnabled: boolean;
  pendingTaskAlertEnabled: boolean;
  pendingTaskAlertTime: string;
  pendingTaskAlertTimezone: string;
  pendingTaskAlertFrequency: "daily";
  registrationMessageTemplate: string;
  pendingSummaryMessageTemplate: string;
  approvedStudentMessageTemplate: string;
};

function toInputTime(value: string) {
  return value.slice(0, 5);
}

function toForm(settings: SettingsView): SettingsForm {
  return {
    whatsappNumber: settings.whatsapp_number,
    registrationAlertEnabled: settings.registration_alert_enabled,
    pendingTaskAlertEnabled: settings.pending_task_alert_enabled,
    pendingTaskAlertTime: toInputTime(settings.pending_task_alert_time),
    pendingTaskAlertTimezone: settings.pending_task_alert_timezone,
    pendingTaskAlertFrequency: settings.pending_task_alert_frequency,
    registrationMessageTemplate: settings.registration_message_template,
    pendingSummaryMessageTemplate: settings.pending_summary_message_template,
    approvedStudentMessageTemplate: settings.approved_student_message_template,
  };
}

export function WhatsAppAlertSettings({
  initialSettings,
  setupError,
}: {
  initialSettings: SettingsView;
  setupError?: string | null;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SettingsForm>(() => toForm(initialSettings));
  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const clearToast = useCallback(() => setToast(null), []);
  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(toForm(settings)), [form, settings]);
  const approvedStudentPreview = useMemo(() => buildApprovedStudentWhatsAppPreview(form.approvedStudentMessageTemplate), [form.approvedStudentMessageTemplate]);
  const registrationPreview = useMemo(() => buildRegistrationWhatsAppPreview(form.registrationMessageTemplate), [form.registrationMessageTemplate]);
  const pendingPreview = useMemo(() => buildPendingSummaryWhatsAppPreview(form.pendingSummaryMessageTemplate), [form.pendingSummaryMessageTemplate]);

  function patchForm(patch: Partial<SettingsForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await updateWhatsAppAlertSettings(form);

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setSettings(result.data);
      setForm(toForm(result.data));
      setToast({ type: "success", message: "WhatsApp alert settings saved successfully." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to save WhatsApp alert settings." });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMessage() {
    setTesting(true);

    try {
      const result = await sendWhatsAppPendingSummaryTest();

      if (!result.success) {
        setToast({ type: "error", message: result.error });
        return;
      }

      setToast({ type: "success", message: `WhatsApp test sent with ${result.data.totalPendingTasks} pending task${result.data.totalPendingTasks === 1 ? "" : "s"}.` });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to send WhatsApp test message." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Settings"
        title="WhatsApp alert settings"
        description="Control which admin alerts are sent through WhatsApp Business API. Pending task summaries are sent only when enabled by an admin."
        action={
          <button type="button" onClick={sendTestMessage} disabled={testing} className="wc-secondary-btn">
            <Icon name="send" className="text-lg" />
            {testing ? "Sending..." : "Send test WhatsApp"}
          </button>
        }
      />

      {setupError ? (
        <div className="mb-5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
          Apply the WhatsApp notification migration before saving settings. Database response: {setupError}
        </div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={saveSettings} className="wc-card space-y-6 p-5 md:p-6">
            <label className="block">
              <span className="wc-label">WhatsApp number</span>
              <input
                className="wc-input mt-2"
                value={form.whatsappNumber}
                onChange={(event) => patchForm({ whatsappNumber: event.target.value })}
                placeholder="923270728950"
                inputMode="tel"
                required
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className="wc-label">Approved student message</span>
                <button
                  type="button"
                  onClick={() => patchForm({ approvedStudentMessageTemplate: defaultApprovedStudentWhatsappTemplate })}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                className="wc-input mt-2 min-h-40 font-mono text-sm leading-6"
                value={form.approvedStudentMessageTemplate}
                onChange={(event) => patchForm({ approvedStudentMessageTemplate: event.target.value })}
                placeholder="Type the WhatsApp message that is sent when an application is approved."
              />
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                Available placeholders: <span className="font-semibold text-on-surface">{`{{student_name}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{course_name}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{email}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{phone}}`}</span>.
              </p>
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className="wc-label">Student registration message</span>
                <button
                  type="button"
                  onClick={() => patchForm({ registrationMessageTemplate: defaultRegistrationWhatsAppTemplate })}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                className="wc-input mt-2 min-h-40 font-mono text-sm leading-6"
                value={form.registrationMessageTemplate}
                onChange={(event) => patchForm({ registrationMessageTemplate: event.target.value })}
                placeholder="Type the WhatsApp message that is sent when a new registration is received."
              />
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                Available placeholders: <span className="font-semibold text-on-surface">{`{{student_name}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{course_name}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{phone}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{status}}`}</span>.
              </p>
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className="wc-label">Pending summary message</span>
                <button
                  type="button"
                  onClick={() => patchForm({ pendingSummaryMessageTemplate: defaultPendingSummaryWhatsAppTemplate })}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                className="wc-input mt-2 min-h-40 font-mono text-sm leading-6"
                value={form.pendingSummaryMessageTemplate}
                onChange={(event) => patchForm({ pendingSummaryMessageTemplate: event.target.value })}
                placeholder="Type the WhatsApp message that is sent in the daily pending summary."
              />
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                Available placeholders: <span className="font-semibold text-on-surface">{`{{total_pending_tasks}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{overdue_tasks}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{submitted_but_ungraded}}`}</span>,{" "}
                <span className="font-semibold text-on-surface">{`{{date_label}}`}</span>.
              </p>
            </label>

            <ToggleField
              icon="how_to_reg"
              title="Student Registration Alerts"
              description="Send a WhatsApp message whenever a new student submits an application or creates an approved student account."
              checked={form.registrationAlertEnabled}
              onChange={(checked) => patchForm({ registrationAlertEnabled: checked })}
            />

            <ToggleField
              icon="pending_actions"
              title="Send daily pending task summary on WhatsApp"
              description="Choose the time when you want to receive the pending task summary each day."
              checked={form.pendingTaskAlertEnabled}
              onChange={(checked) => patchForm({ pendingTaskAlertEnabled: checked })}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="wc-label">Alert time</span>
                <input
                  className="wc-input mt-2"
                  type="time"
                  step={300}
                  value={form.pendingTaskAlertTime}
                  disabled={!form.pendingTaskAlertEnabled}
                  onChange={(event) => patchForm({ pendingTaskAlertTime: event.target.value })}
                  required
                />
              </label>

              <label className="block md:col-span-2">
                <span className="wc-label">Timezone</span>
                <select
                  className="wc-input mt-2"
                  value={form.pendingTaskAlertTimezone}
                  disabled={!form.pendingTaskAlertEnabled}
                  onChange={(event) => patchForm({ pendingTaskAlertTimezone: event.target.value })}
                >
                  {supportedWhatsAppTimezones.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="wc-label">Alert frequency</span>
              <select className="wc-input mt-2" value={form.pendingTaskAlertFrequency} disabled>
                <option value="daily">Daily</option>
              </select>
            </label>

            <div className="flex flex-col gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-on-surface-variant">
                Current daily time: <span className="font-bold text-on-surface">{toInputTime(settings.pending_task_alert_time)}</span> {settings.pending_task_alert_timezone}
              </p>
              <button disabled={saving || !hasChanges} className="wc-primary-btn">
                <Icon name="save" className="text-lg" />
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <PreviewCard title="Approved Student Preview" body={approvedStudentPreview} />
            <PreviewCard title="Registration Preview" body={registrationPreview} />
            <PreviewCard title="Pending Summary Preview" body={pendingPreview} />
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

function PreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="wc-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="preview" className="text-lg text-primary" />
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg bg-surface-container-low p-4 text-xs leading-6 text-on-surface-variant">{body}</pre>
    </div>
  );
}
