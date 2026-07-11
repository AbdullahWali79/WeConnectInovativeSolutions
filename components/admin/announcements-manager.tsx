"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Announcement, Profile } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

const initialForm = { title: "", message: "", priority: "normal" as Announcement["priority"] };

const priorityColors: Record<string, string> = {
  low: "bg-surface-container text-on-surface-variant",
  normal: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-error-container text-error",
};

export function AnnouncementsManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canCreate = currentRole === "admin" || permissions.includes("announcements.create");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) setToast({ type: "error", message: error.message });
    setAnnouncements(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to publish announcements." });
      return;
    }
    if (!form.title.trim() || !form.message.trim()) {
      setToast({ type: "error", message: "Title and message are required." });
      return;
    }
    setSaving(true);
    const payload = { title: form.title.trim(), message: form.message.trim(), priority: form.priority };
    const result = editingId
      ? await supabase.from("announcements").update(payload).eq("id", editingId)
      : await supabase.from("announcements").insert(payload);
    setSaving(false);
    if (result.error) {
      setToast({ type: "error", message: result.error.message });
      return;
    }
    setToast({ type: "success", message: editingId ? "Announcement updated." : "Announcement published." });
    setForm(initialForm);
    setEditingId(null);
    await loadData();
  }

  async function toggleActive(id: string, current: boolean) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to update announcements." });
      return;
    }
    const { error } = await supabase.from("announcements").update({ is_active: !current }).eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: !current ? "Announcement activated." : "Announcement deactivated." });
    await loadData();
  }

  async function deleteAnnouncement(id: string) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to delete announcements." });
      return;
    }
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Announcement deleted." });
    await loadData();
  }

  function editAnnouncement(announcement: Announcement) {
    setEditingId(announcement.id);
    setForm({ title: announcement.title, message: announcement.message, priority: announcement.priority });
  }

  if (loading) return <LoadingState label="Loading announcements..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Announcements"
        title="Manage announcements"
        description="Publish announcements to all students. Active announcements appear on the student dashboard."
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          {/* Form */}
          {canCreate ? <form onSubmit={saveAnnouncement} className="wc-card space-y-3 p-4">
            <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit announcement" : "New announcement"}</h2>
            <label className="block">
              <span className="wc-label">Title</span>
              <input className="wc-input mt-2" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. New batch starts Monday" required />
            </label>
            <label className="block">
              <span className="wc-label">Message</span>
              <textarea className="wc-input mt-2 min-h-24" value={form.message} onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))} placeholder="Announcement details..." required />
            </label>
            <label className="block">
              <span className="wc-label">Priority</span>
              <select className="wc-input mt-2" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value as Announcement["priority"] }))}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <div className="flex gap-3">
              <button disabled={saving} className="wc-primary-btn flex-1">{saving ? "Saving..." : editingId ? "Update" : "Publish"}</button>
              {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }} className="wc-secondary-btn">Cancel</button> : null}
            </div>
          </form> : (
            <section className="wc-card p-4">
              <h2 className="text-base font-bold text-on-surface">Read-only announcements</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">You can view announcements, but publishing or editing is not enabled for this account.</p>
            </section>
          )}

          {/* List */}
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <EmptyState title="No announcements yet" description="Create your first announcement to notify students." icon="campaign" />
            ) : (
              announcements.map((announcement) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="wc-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-on-surface">{announcement.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priorityColors[announcement.priority]}`}>
                          {announcement.priority}
                        </span>
                        {announcement.is_active ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">{announcement.message}</p>
                      <p className="mt-2 text-[10px] text-on-surface-variant">{formatDateTime(announcement.created_at)}</p>
                    </div>
                    {canCreate ? <div className="flex gap-1.5">
                      <button onClick={() => toggleActive(announcement.id, announcement.is_active)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary hover:bg-surface-container-high" title={announcement.is_active ? "Deactivate" : "Activate"}>
                        <Icon name={announcement.is_active ? "visibility" : "visibility_off"} className="text-base" />
                      </button>
                      <button onClick={() => editAnnouncement(announcement)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container p-2 text-primary hover:bg-surface-container-high" title="Edit">
                        <Icon name="edit" className="text-base" />
                      </button>
                      <button onClick={() => deleteAnnouncement(announcement.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container p-2 text-error hover:bg-red-100" title="Delete">
                        <Icon name="delete" className="text-base" />
                      </button>
                    </div> : null}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
