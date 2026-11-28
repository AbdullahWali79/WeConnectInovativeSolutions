/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { updateCampaign, deleteCampaign } from "@/app/admin/social-media-campaigns/actions";

const FIELD_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-lowest p-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-surface-container";
const LABEL_CLASS = "mb-1 block text-xs font-bold text-on-surface-variant";

export interface EditCampaignData {
  id: string;
  client_name: string;
  campaign_name?: string | null;
  status: string;
  period_start?: string | null;
  period_end?: string | null;
  goal?: string | null;
  teacher_id?: string | null;
  drive_folder_url?: string | null;
  [key: string]: any;
}

export function EditCampaignModal({
  campaign,
  teachers = [],
  role = "admin",
  canDelete,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  campaign: EditCampaignData;
  teachers?: any[];
  role?: string;
  canDelete?: boolean;
  onClose: () => void;
  onSaved: (updatedCampaign: EditCampaignData) => void;
  onDeleted?: (campaignId: string) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    client_name: campaign.client_name || "",
    campaign_name: campaign.campaign_name || "",
    status: campaign.status || "active",
    period_start: campaign.period_start ? campaign.period_start.slice(0, 10) : "",
    period_end: campaign.period_end ? campaign.period_end.slice(0, 10) : "",
    goal: campaign.goal || "",
    teacher_id: campaign.teacher_id || "",
    drive_folder_url: campaign.drive_folder_url || "",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allowDelete = canDelete ?? (role === "admin");

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteCampaign(campaign.id);
    setDeleting(false);

    if (!res.success) {
      onError(res.error || "Could not delete this campaign.");
      return;
    }

    if (onDeleted) {
      onDeleted(campaign.id);
    } else {
      onClose();
    }
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.client_name.trim()) {
      onError("Client name is required.");
      return;
    }

    if (form.period_start && form.period_end && form.period_end < form.period_start) {
      onError("The end date cannot be earlier than the start date.");
      return;
    }

    setSaving(true);
    const patch = {
      client_name: form.client_name.trim(),
      campaign_name: form.campaign_name.trim(),
      status: form.status,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      goal: form.goal.trim(),
      teacher_id: form.teacher_id || null,
      drive_folder_url: form.drive_folder_url.trim(),
    };

    const res = await updateCampaign(campaign.id, patch);
    setSaving(false);

    if (!res.success) {
      onError(res.error || "Could not update campaign.");
      return;
    }

    const teacher = teachers.find((t) => t.id === form.teacher_id);
    onSaved({
      ...campaign,
      ...patch,
      teacher: teacher ? { full_name: teacher.full_name, email: teacher.email } : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-low px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="edit" className="text-lg" />
            </span>
            <div>
              <h2 className="text-base font-black text-on-surface">Edit Campaign Details</h2>
              <p className="text-xs text-on-surface-variant">Update client name, campaign title, dates, and settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Client Name *</label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                className={FIELD_CLASS}
                placeholder="e.g. Loan Funders or HajjUmraTour"
                autoFocus
                required
              />
              <span className="text-[11px] text-on-surface-variant/70 mt-1 block">
                Primary client title displayed on cards and student sheets
              </span>
            </div>

            <div>
              <label className={LABEL_CLASS}>Campaign Subtitle / Name</label>
              <input
                type="text"
                value={form.campaign_name}
                onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
                className={FIELD_CLASS}
                placeholder="e.g. 30-Day Video Marketing Campaign"
              />
              <span className="text-[11px] text-on-surface-variant/70 mt-1 block">
                Secondary campaign title / description
              </span>
            </div>

            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={FIELD_CLASS}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Assigned Teacher</label>
              <select
                value={form.teacher_id}
                onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                className={FIELD_CLASS}
              >
                <option value="">— Unassigned —</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Start Date</label>
              <input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL_CLASS}>End Date</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, period_end: "" })}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Clear (Ongoing)
                </button>
              </div>
              <input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Google Drive Assets / Deliverables Folder URL</label>
            <input
              type="url"
              value={form.drive_folder_url}
              onChange={(e) => setForm({ ...form, drive_folder_url: e.target.value })}
              className={FIELD_CLASS}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Campaign Goal &amp; Notes (optional)</label>
            <textarea
              rows={2}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Key campaign targets, audience notes, branding guidelines..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-outline-variant/60">
            <div>
              {allowDelete && (
                !confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving || deleting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50 shadow-2xs"
                    title="Permanently delete this campaign"
                  >
                    <Icon name="delete" className="text-[15px]" />
                    <span>Delete Campaign</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-1.5 shadow-2xs animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-red-700 px-1">Delete campaign?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 shadow-xs"
                    >
                      <Icon name={deleting ? "sync" : "delete_forever"} className={`text-[13px] ${deleting ? "animate-spin" : ""}`} />
                      <span>{deleting ? "Deleting…" : "Yes, Delete"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-lg border border-outline-variant/80 bg-surface-lowest px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-low transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="rounded-xl border border-outline-variant px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-low transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:bg-primary-container shadow-sm transition-colors disabled:opacity-50"
              >
                <Icon name={saving ? "sync" : "save"} className={`text-[16px] ${saving ? "animate-spin" : ""}`} />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
