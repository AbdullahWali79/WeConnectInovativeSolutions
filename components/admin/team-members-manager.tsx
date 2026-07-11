"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { uploadFileToGithubCdn } from "@/lib/media/client-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Profile, TeamMember } from "@/lib/supabase/types";

const defaultForm = {
  name: "",
  role: "",
  department: "",
  image_url: "",
  image_github_path: "",
  image_github_url: "",
  image_cdn_url: "",
  portfolio_url: "",
  email: "",
  phone: "",
  skills: "",
  bio: "",
  reports_to: "",
  status: "active",
  display_order: "0",
};

export function TeamMembersManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const canCreate = canUse("team_members.create");
  const canEdit = canUse("team_members.edit");
  const canDelete = canUse("team_members.delete");
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadFilter, setLeadFilter] = useState("all");
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("team_members").select("*").order("display_order", { ascending: true });
    if (error) setToast({ type: "error", message: error.message });
    setRows(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const roles = useMemo(() => Array.from(new Set(rows.map((row) => row.role))).sort((a, b) => a.localeCompare(b)), [rows]);
  const departments = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.department).filter((department): department is string => Boolean(department)))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [rows],
  );
  const leads = useMemo(() => Array.from(new Set(rows.map((row) => row.name))).sort((a, b) => a.localeCompare(b)), [rows]);
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    const text = `${row.name} ${row.email ?? ""}`.toLowerCase();
    const queryMatch = text.includes(query.trim().toLowerCase());
    const roleMatch = roleFilter === "all" || row.role === roleFilter;
    const deptMatch = deptFilter === "all" || (row.department ?? "") === deptFilter;
    const statusMatch = statusFilter === "all" || row.status === statusFilter;
    const leadName = row.reports_to ? byId.get(row.reports_to)?.name ?? "" : "";
    const leadMatch = leadFilter === "all" || leadName === leadFilter;
    return queryMatch && roleMatch && deptMatch && statusMatch && leadMatch;
  }), [rows, query, roleFilter, deptFilter, statusFilter, leadFilter, byId]);

  function startEdit(row: TeamMember) {
    if (!canEdit) {
      setToast({ type: "error", message: "You do not have permission to edit team members." });
      return;
    }
    setEditingId(row.id);
    setForm({
      name: row.name,
      role: row.role,
      department: row.department ?? "",
      image_url: row.image_url ?? "",
      image_github_path: row.image_github_path ?? "",
      image_github_url: row.image_github_url ?? "",
      image_cdn_url: row.image_cdn_url ?? "",
      portfolio_url: row.portfolio_url ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      skills: (row.skills ?? []).join(", "),
      bio: row.bio ?? "",
      reports_to: row.reports_to ?? "",
      status: row.status,
      display_order: String(row.display_order ?? 0),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }


  async function saveImageToEditingMember(upload: { githubCdnUrl: string; githubPath: string; githubUrl: string }) {
    if (!editingId) return false;

    const metadataPayload = {
      image_url: upload.githubCdnUrl,
      image_github_path: upload.githubPath,
      image_github_url: upload.githubUrl,
      image_cdn_url: upload.githubCdnUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("team_members").update(metadataPayload).eq("id", editingId);

    if (error) {
      const migrationMissing = /image_github_path|image_github_url|image_cdn_url|column/i.test(error.message);
      if (!migrationMissing) throw new Error(error.message);

      const fallback = await supabase
        .from("team_members")
        .update({ image_url: upload.githubCdnUrl, updated_at: new Date().toISOString() })
        .eq("id", editingId);

      if (fallback.error) throw new Error(fallback.error.message);
    }

    setRows((current) => current.map((row) => row.id === editingId ? { ...row, ...metadataPayload } : row));
    return true;
  }
  async function onPickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const upload = await uploadFileToGithubCdn(file, "team");
      setForm((current) => ({ ...current, image_url: upload.githubCdnUrl, image_github_path: upload.githubPath, image_github_url: upload.githubUrl, image_cdn_url: upload.githubCdnUrl }));
      const savedExistingMember = await saveImageToEditingMember(upload);
      setToast({
        type: "success",
        message: savedExistingMember
          ? "Team image uploaded and saved to this member."
          : "Team image uploaded. Fill the member form and click Create to save it.",
      });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Team image upload failed." });
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  async function saveRow(event: { preventDefault: () => void }) {
    event.preventDefault();
    const canSave = editingId ? canEdit : canCreate;

    if (!canSave) {
      setToast({ type: "error", message: "You do not have permission to save team members." });
      return;
    }
    if (!form.name.trim() || !form.role.trim()) {
      setToast({ type: "error", message: "Name and role are required." });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      department: form.department.trim() || null,
      image_url: form.image_url.trim() || null,
      image_github_path: form.image_github_path || null,
      image_github_url: form.image_github_url || null,
      image_cdn_url: form.image_cdn_url || null,
      portfolio_url: form.portfolio_url.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      skills: form.skills.trim() ? form.skills.split(",").map((item) => item.trim()).filter(Boolean) : [],
      bio: form.bio.trim() || null,
      reports_to: form.reports_to || null,
      status: form.status,
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    const request = editingId ? supabase.from("team_members").update(payload).eq("id", editingId) : supabase.from("team_members").insert(payload);
    const { error } = await request;
    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: editingId ? "Member updated." : "Member created." });
    resetForm();
    await loadRows();
  }

  async function deleteRow(id: string) {
    if (!canDelete) {
      setToast({ type: "error", message: "You do not have permission to delete team members." });
      return;
    }
    if (!globalThis.confirm("Delete this member?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Member deleted." });
    await loadRows();
  }

  if (loading) return <LoadingState label="Loading team members..." />;

  const teamAccessMessage = canEdit || canDelete
    ? "Use the action buttons in the table to manage team members enabled for this account."
    : "You can view team members, but create, edit, and delete actions are not enabled for this account.";

  let saveButtonLabel = "Create";
  if (saving) {
    saveButtonLabel = "Saving...";
  } else if (editingId) {
    saveButtonLabel = "Update";
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Team Members"
        title="Manage team members"
        description="Add, edit, and manage team profile cards shown on the public Team page."
        action={<Link href="/team" className="wc-secondary-btn text-sm"><Icon name="preview" /> View Team Page</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {(canCreate || editingId) ? <form onSubmit={saveRow} className="wc-card space-y-3 p-4">
          <h2 className="text-base font-bold text-on-surface">{editingId ? "Edit Member" : "Add Member"}</h2>
          <input className="wc-input" placeholder="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <input className="wc-input" placeholder="Role / designation" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} required />
          <input className="wc-input" placeholder="Department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="wc-input" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <input className="wc-input" placeholder="Phone (optional)" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </div>
          <input className="wc-input" placeholder="Image URL" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} />
          <input className="wc-input" placeholder="Portfolio URL" value={form.portfolio_url} onChange={(event) => setForm((current) => ({ ...current, portfolio_url: event.target.value }))} />
          <input className="wc-input" type="file" accept="image/*" onChange={onPickImage} />
          <input className="wc-input" placeholder="Skills (comma separated)" value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} />
          <textarea className="wc-input min-h-24" placeholder="Short bio" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />

          <div className="grid gap-2 sm:grid-cols-3">
            <select className="wc-input" value={form.reports_to} onChange={(event) => setForm((current) => ({ ...current, reports_to: event.target.value }))}>
              <option value="">Reports To</option>
              {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <select className="wc-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input className="wc-input" type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} placeholder="Display order" />
          </div>

          <div className="flex gap-2">
            <button disabled={saving} className="wc-primary-btn flex-1">{saveButtonLabel}</button>
            {editingId ? <button type="button" onClick={resetForm} className="wc-secondary-btn">Cancel</button> : null}
          </div>
        </form> : (
          <section className="wc-card p-4">
            <h2 className="text-base font-bold text-on-surface">{canEdit || canDelete ? "Team actions" : "Read-only team access"}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{teamAccessMessage}</p>
          </section>
        )}

        <section className="wc-card overflow-hidden">
          <div className="grid gap-2 border-b border-outline-variant/50 bg-surface-container-low p-3 md:grid-cols-5">
            <input className="wc-input md:col-span-2" placeholder="Search name/email" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="wc-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All Roles</option>{roles.map((item) => <option key={item}>{item}</option>)}</select>
            <select className="wc-input" value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)}><option value="all">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">
              <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
              <select className="wc-input" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}><option value="all">All Leads</option>{leads.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
          </div>

          {filtered.length === 0 ? <div className="p-4"><EmptyState title="No members found" description="Try changing filters." icon="person_search" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Picture</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-surface-container">
                          {(row.image_cdn_url ?? row.image_url) ? <Image src={row.image_cdn_url ?? row.image_url ?? ""} alt={row.name} width={40} height={40} unoptimized className="h-full w-full object-cover" /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-sm font-bold text-on-surface">{row.name}</p><p className="text-xs text-on-surface-variant">{row.email ?? "-"}</p></td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.role}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.department ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.reports_to ? byId.get(row.reports_to)?.name ?? "-" : "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}>{row.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link className="rounded-lg bg-surface-container p-2 text-primary" href="/team" title="View"><Icon name="visibility" /></Link>
                          {canEdit ? <button className="rounded-lg bg-surface-container p-2 text-primary" onClick={() => startEdit(row)} title="Edit"><Icon name="edit" /></button> : null}
                          {canDelete ? <button className="rounded-lg bg-error-container p-2 text-error" onClick={() => deleteRow(row.id)} title="Delete"><Icon name="delete" /></button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
