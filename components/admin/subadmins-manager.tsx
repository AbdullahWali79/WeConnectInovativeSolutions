"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { CreateSubadminForm, buildTeacherLoginMessage, type CreatedTeacherPayload } from "@/components/admin/create-subadmin-form";
import { ProductContributorAssignment } from "@/components/admin/product-contributor-assignment";
import { SubadminMessageDialog } from "@/components/admin/subadmin-message-dialog";
import { SubadminPermissionsSelector } from "@/components/admin/subadmin-permissions-selector";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Profile, ProfileStatus } from "@/lib/supabase/types";
import {
  getPermissionLabels,
  isTeacherSelectablePermissionKey,
  TEACHER_PERMISSION_GROUPS,
  type TeacherSelectablePermissionKey,
} from "@/lib/admin-permissions";
import { formatDate } from "@/lib/utils";
import { resetTeacherPassword, updateTeacherCourseAssignments, updateTeacherPermissions, updateTeacherProfile, updateTeacherStatus } from "@/app/admin/actions";

type TeacherProfile = Profile & { role: "teacher"; permissions: TeacherSelectablePermissionKey[]; assignedCourseIds: string[] };
type TeacherFormState = { fullName: string; email: string; phone: string };
type MessageState = {
  teacherName: string;
  email: string;
  phone: string | null;
  message: string;
  hasPassword: boolean;
  featureLabels: string[];
} | null;

const emptyEditForm: TeacherFormState = { fullName: "", email: "", phone: "" };

export function SubadminsManager() {
  const supabase = createSupabaseBrowserClient();
  const createPanelRef = useRef<HTMLDivElement>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProfileStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailsTeacher, setDetailsTeacher] = useState<TeacherProfile | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [editForm, setEditForm] = useState<TeacherFormState>(emptyEditForm);
  const [permissionsTeacher, setPermissionsTeacher] = useState<TeacherProfile | null>(null);
  const [permissionSelection, setPermissionSelection] = useState<TeacherSelectablePermissionKey[]>([]);
  const [courseTeacher, setCourseTeacher] = useState<TeacherProfile | null>(null);
  const [courseSelection, setCourseSelection] = useState<string[]>([]);
  const [resetTeacher, setResetTeacher] = useState<TeacherProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [messageDialog, setMessageDialog] = useState<MessageState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, courseResult] = await Promise.all([
      supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
    ]);

    if (error ?? courseResult.error) {
      setToast({ type: "error", message: (error ?? courseResult.error)?.message ?? "Failed to load teacher data." });
    }

    setCourses(courseResult.data ?? []);
    const teacherRows = (data ?? []) as Array<Profile & { role: "teacher" }>;
    const teacherIds = teacherRows.map((teacher) => teacher.id);
    let permissionMap = new Map<string, TeacherSelectablePermissionKey[]>();
    let courseMap = new Map<string, string[]>();

    if (teacherIds.length > 0) {
      const [permissionsResult, assignmentsResult] = await Promise.all([
        supabase
        .from("user_permissions")
        .select("user_id, permission_key")
        .in("user_id", teacherIds)
        .eq("enabled", true),
        supabase
          .from("teacher_course_assignments")
          .select("teacher_id, course_id")
          .in("teacher_id", teacherIds),
      ]);

      if (permissionsResult.error ?? assignmentsResult.error) {
        setToast({ type: "error", message: (permissionsResult.error ?? assignmentsResult.error)?.message ?? "Failed to load teacher access." });
      }

      permissionMap = (permissionsResult.data ?? []).reduce((map, row) => {
        if (isTeacherSelectablePermissionKey(row.permission_key)) {
          const current = map.get(row.user_id) ?? [];
          map.set(row.user_id, [...current, row.permission_key]);
        }
        return map;
      }, new Map<string, TeacherSelectablePermissionKey[]>());

      courseMap = (assignmentsResult.data ?? []).reduce((map, row) => {
        const current = map.get(row.teacher_id) ?? [];
        map.set(row.teacher_id, [...current, row.course_id]);
        return map;
      }, new Map<string, string[]>());
    }

    setTeachers(teacherRows.map((teacher) => ({
      ...teacher,
      permissions: permissionMap.get(teacher.id) ?? [],
      assignedCourseIds: courseMap.get(teacher.id) ?? [],
    })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const text = `${teacher.full_name ?? ""} ${teacher.email ?? ""} ${teacher.phone ?? ""}`.toLowerCase();
      const matchesSearch = !search || text.includes(search);
      const matchesStatus = statusFilter === "all" || teacher.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [query, statusFilter, teachers]);

  const activeCount = teachers.filter((teacher) => teacher.status === "approved").length;
  const inactiveCount = teachers.filter((teacher) => teacher.status === "rejected").length;
  const pendingCount = teachers.filter((teacher) => teacher.status === "pending").length;

  function scrollToCreate() {
    createPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function teacherName(teacher: TeacherProfile) {
    return teacher.full_name ?? "Unnamed teacher";
  }

  function teacherEmail(teacher: TeacherProfile) {
    return teacher.email ?? "";
  }

  function teacherPhone(teacher: TeacherProfile) {
    return teacher.phone ?? "";
  }

  function statusLabel(status: ProfileStatus) {
    if (status === "approved") return "active";
    if (status === "rejected") return "inactive";
    return "pending";
  }

  function loginUrl() {
    return `${window.location.origin}/login`;
  }

  function openLoginMessage(teacher: TeacherProfile, password?: string) {
    const featureLabels = getPermissionLabels(teacher.permissions);
    const message = buildTeacherLoginMessage({
      fullName: teacherName(teacher),
      email: teacherEmail(teacher),
      password,
      loginUrl: loginUrl(),
      permissionLabels: featureLabels,
    });

    setMessageDialog({
      teacherName: teacherName(teacher),
      email: teacherEmail(teacher),
      phone: teacher.phone,
      message,
      hasPassword: Boolean(password),
      featureLabels,
    });
  }

  function handleCreated(payload: CreatedTeacherPayload) {
    setToast({ type: "success", message: "Teacher account created successfully." });
    setMessageDialog({
      teacherName: payload.teacher.fullName,
      email: payload.teacher.email,
      phone: payload.teacher.phone,
      message: payload.loginMessage,
      hasPassword: true,
      featureLabels: payload.permissionLabels,
    });
    void loadTeachers();
  }

  function startEdit(teacher: TeacherProfile) {
    setEditingTeacher(teacher);
    setEditForm({
      fullName: teacherName(teacher),
      email: teacherEmail(teacher),
      phone: teacherPhone(teacher),
    });
  }

  function startPermissionEdit(teacher: TeacherProfile) {
    setPermissionsTeacher(teacher);
    setPermissionSelection(teacher.permissions);
  }

  function startCourseEdit(teacher: TeacherProfile) {
    setCourseTeacher(teacher);
    setCourseSelection(teacher.assignedCourseIds);
  }

  function toggleCourseSelection(courseId: string) {
    setCourseSelection((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId],
    );
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTeacher) return;

    setBusyId(editingTeacher.id);
    const result = await updateTeacherProfile(editingTeacher.id, editForm);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Teacher profile could not be updated." });
      return;
    }

    setToast({ type: "success", message: "Teacher profile updated." });
    setEditingTeacher(null);
    setEditForm(emptyEditForm);
    await loadTeachers();
  }

  async function toggleTeacherStatus(teacher: TeacherProfile) {
    const nextStatus = teacher.status === "approved" ? "rejected" : "approved";
    setBusyId(teacher.id);
    const result = await updateTeacherStatus(teacher.id, nextStatus);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Teacher status could not be updated." });
      return;
    }

    setToast({ type: "success", message: nextStatus === "approved" ? "Teacher account activated." : "Teacher account deactivated." });
    await loadTeachers();
  }

  async function savePermissions() {
    if (!permissionsTeacher) return;

    if (permissionSelection.length === 0) {
      setToast({ type: "error", message: "Select at least one permission for this teacher." });
      return;
    }

    setBusyId(permissionsTeacher.id);
    const result = await updateTeacherPermissions(permissionsTeacher.id, permissionSelection);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Teacher permissions could not be updated." });
      return;
    }

    setToast({ type: "success", message: "Teacher permissions updated." });
    setPermissionsTeacher(null);
    setPermissionSelection([]);
    await loadTeachers();
  }

  async function saveCourseAssignments() {
    if (!courseTeacher) return;
    setBusyId(courseTeacher.id);
    const result = await updateTeacherCourseAssignments(courseTeacher.id, courseSelection);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Course assignments could not be updated." });
      return;
    }

    setToast({ type: "success", message: "Teacher course access updated." });
    setCourseTeacher(null);
    setCourseSelection([]);
    await loadTeachers();
  }

  async function saveResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTeacher) return;

    if (newPassword.length < 8) {
      setToast({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    setBusyId(resetTeacher.id);
    const result = await resetTeacherPassword(resetTeacher.id, newPassword);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Teacher password could not be reset." });
      return;
    }

    setToast({ type: "success", message: "Teacher password reset successfully." });
    openLoginMessage(resetTeacher, newPassword);
    setResetTeacher(null);
    setNewPassword("");
  }

  if (loading) return <LoadingState label="Loading teacher accounts..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Teachers / Sub-Admins"
        title="Teacher account management"
        description="Create and manage teacher accounts that can handle courses, students, tasks, submissions, announcements, and progress."
        action={
          <button type="button" onClick={scrollToCreate} className="wc-primary-btn w-full sm:w-auto">
            <Icon name="person_add" className="text-lg" />
            Create Teacher Account
          </button>
        }
      />

      <ProductContributorAssignment />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherStat icon="manage_accounts" label="Total teachers" value={teachers.length} />
        <TeacherStat icon="verified_user" label="Active" value={activeCount} tone="success" />
        <TeacherStat icon="person_off" label="Inactive" value={inactiveCount} tone="muted" />
        <TeacherStat icon="schedule" label="Pending" value={pendingCount} tone="gold" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="space-y-6">
          <section className="min-w-0 space-y-4">
            <div className="wc-card p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
                  <input
                    className="wc-input pl-12"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search teacher name, email, or phone"
                  />
                </div>
                <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="approved">Active</option>
                  <option value="rejected">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <EmptyState title="No teacher accounts found" description="Create a teacher account or adjust your filters." icon="manage_accounts" />
            ) : (
              <>
                <div className="hidden overflow-hidden lg:block">
                  <div className="wc-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left">
                        <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                          <tr>
                            <th className="px-4 py-3">Teacher</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/70">
                          {filteredTeachers.map((teacher) => (
                            <motion.tr key={teacher.id} whileHover={{ backgroundColor: "rgba(0, 33, 110, 0.02)" }}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <TeacherAvatar name={teacherName(teacher)} />
                                  <div>
                                    <p className="font-bold text-on-surface">{teacherName(teacher)}</p>
                                    <p className="text-xs text-on-surface-variant">{teacherEmail(teacher)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">{teacherPhone(teacher) || "Not set"}</td>
                              <td className="px-4 py-3"><span className="wc-section-label px-3 py-1 text-[10px]">Teacher</span></td>
                              <td className="px-4 py-3"><StatusPill value={statusLabel(teacher.status)} /></td>
                              <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(teacher.created_at)}</td>
                              <td className="px-4 py-3">
                                <TeacherActions
                                  teacher={teacher}
                                  busy={busyId === teacher.id}
                                  onDetails={() => setDetailsTeacher(teacher)}
                                  onEdit={() => startEdit(teacher)}
                                  onPermissions={() => startPermissionEdit(teacher)}
                                  onCourses={() => startCourseEdit(teacher)}
                                  onReset={() => setResetTeacher(teacher)}
                                  onToggleStatus={() => toggleTeacherStatus(teacher)}
                                  onMessage={() => openLoginMessage(teacher)}
                                />
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:hidden">
                  {filteredTeachers.map((teacher) => (
                    <TeacherMobileCard
                      key={teacher.id}
                      teacher={teacher}
                      busy={busyId === teacher.id}
                      onDetails={() => setDetailsTeacher(teacher)}
                      onEdit={() => startEdit(teacher)}
                      onPermissions={() => startPermissionEdit(teacher)}
                      onCourses={() => startCourseEdit(teacher)}
                      onReset={() => setResetTeacher(teacher)}
                      onToggleStatus={() => toggleTeacherStatus(teacher)}
                      onMessage={() => openLoginMessage(teacher)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          <aside ref={createPanelRef} id="create-teacher" className="scroll-mt-20">
            <CreateSubadminForm onCreated={handleCreated} />
            <div className="mt-4 rounded-xl border border-primary/15 bg-surface-container-low p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed">
                  <Icon name="security" className="text-xl" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Permission rule</h3>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    Teachers can manage training operations, while completion certification cards stay restricted to the main admin.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>

      <SubadminMessageDialog
        open={Boolean(messageDialog)}
        teacherName={messageDialog?.teacherName ?? ""}
        email={messageDialog?.email ?? ""}
        phone={messageDialog?.phone ?? null}
        message={messageDialog?.message ?? ""}
        hasPassword={messageDialog?.hasPassword}
        featureLabels={messageDialog?.featureLabels ?? []}
        onClose={() => setMessageDialog(null)}
      />

      <TeacherDetailsModal teacher={detailsTeacher} onClose={() => setDetailsTeacher(null)} />

      {editingTeacher ? (
        <Modal title="Edit teacher profile" icon="edit" onClose={() => setEditingTeacher(null)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <label className="block">
              <span className="wc-label">Full Name</span>
              <input className="wc-input mt-2" value={editForm.fullName} onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="wc-label">Email</span>
              <input className="wc-input mt-2" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="wc-label">Phone</span>
              <input className="wc-input mt-2" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button disabled={busyId === editingTeacher.id} className="wc-primary-btn w-full">{busyId === editingTeacher.id ? "Saving..." : "Save Changes"}</button>
              <button type="button" onClick={() => setEditingTeacher(null)} className="wc-secondary-btn w-full">Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {permissionsTeacher ? (
        <Modal title="Edit permissions" icon="admin_panel_settings" wide onClose={() => { setPermissionsTeacher(null); setPermissionSelection([]); }}>
          <div className="space-y-5">
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-sm font-bold text-on-surface">{teacherName(permissionsTeacher)}</p>
              <p className="mt-1 break-words text-xs text-on-surface-variant">{teacherEmail(permissionsTeacher)}</p>
            </div>
            <SubadminPermissionsSelector
              selectedPermissions={permissionSelection}
              onChange={setPermissionSelection}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busyId === permissionsTeacher.id}
                onClick={savePermissions}
                className="wc-primary-btn w-full"
              >
                {busyId === permissionsTeacher.id ? "Saving..." : "Save Permissions"}
              </button>
              <button
                type="button"
                onClick={() => { setPermissionsTeacher(null); setPermissionSelection([]); }}
                className="wc-secondary-btn w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {courseTeacher ? (
        <Modal title="Assign courses" icon="school" wide onClose={() => { setCourseTeacher(null); setCourseSelection([]); }}>
          <div className="space-y-5">
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-sm font-bold text-on-surface">{teacherName(courseTeacher)}</p>
              <p className="mt-1 break-words text-xs text-on-surface-variant">{teacherEmail(courseTeacher)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <label key={course.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={courseSelection.includes(course.id)}
                    onChange={() => toggleCourseSelection(course.id)}
                  />
                  <span>
                    <span className="block text-sm font-bold text-on-surface">{course.title}</span>
                    <span className="mt-1 block text-xs text-on-surface-variant">{course.level ?? "Course"} · {course.status}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busyId === courseTeacher.id}
                onClick={saveCourseAssignments}
                className="wc-primary-btn w-full"
              >
                {busyId === courseTeacher.id ? "Saving..." : "Save Course Access"}
              </button>
              <button
                type="button"
                onClick={() => { setCourseTeacher(null); setCourseSelection([]); }}
                className="wc-secondary-btn w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {resetTeacher ? (
        <Modal title="Reset teacher password" icon="lock_reset" onClose={() => { setResetTeacher(null); setNewPassword(""); }}>
          <form onSubmit={saveResetPassword} className="space-y-4">
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-sm font-bold text-on-surface">{teacherName(resetTeacher)}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{teacherEmail(resetTeacher)}</p>
            </div>
            <label className="block">
              <span className="wc-label">New Password</span>
              <input
                className="wc-input mt-2"
                type="text"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button disabled={busyId === resetTeacher.id} className="wc-primary-btn w-full">{busyId === resetTeacher.id ? "Resetting..." : "Reset Password"}</button>
              <button type="button" onClick={() => { setResetTeacher(null); setNewPassword(""); }} className="wc-secondary-btn w-full">Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function TeacherStat({ icon, label, value, tone }: { icon: string; label: string; value: number; tone?: "success" | "muted" | "gold" }) {
  const toneClass =
    tone === "success"
      ? "bg-green-50 text-green-700"
      : tone === "muted"
        ? "bg-slate-100 text-slate-600"
        : tone === "gold"
          ? "bg-secondary-container text-on-secondary-fixed"
          : "bg-surface-container text-primary";

  return (
    <div className="wc-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
          <p className="mt-2 text-2xl font-black text-primary">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon name={icon} className="text-2xl" />
        </span>
      </div>
    </div>
  );
}

function TeacherAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black uppercase text-white">
      {name.trim().slice(0, 1) || "T"}
    </span>
  );
}

function TeacherActions({
  teacher,
  busy,
  onDetails,
  onEdit,
  onPermissions,
  onCourses,
  onReset,
  onToggleStatus,
  onMessage,
}: {
  teacher: TeacherProfile;
  busy: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onPermissions: () => void;
  onCourses: () => void;
  onReset: () => void;
  onToggleStatus: () => void;
  onMessage: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <IconButton icon="info" label="View details" onClick={onDetails} />
      <IconButton icon="edit" label="Edit profile" onClick={onEdit} />
      <IconButton icon="admin_panel_settings" label="Edit permissions" onClick={onPermissions} />
      <IconButton icon="school" label="Assign courses" onClick={onCourses} />
      <IconButton icon="lock_reset" label="Reset password" onClick={onReset} />
      <IconButton icon={teacher.status === "approved" ? "person_off" : "verified_user"} label={teacher.status === "approved" ? "Deactivate" : "Activate"} onClick={onToggleStatus} disabled={busy} />
      <IconButton icon="content_copy" label="Login message" onClick={onMessage} />
    </div>
  );
}

function TeacherMobileCard({
  teacher,
  busy,
  onDetails,
  onEdit,
  onPermissions,
  onCourses,
  onReset,
  onToggleStatus,
  onMessage,
}: {
  teacher: TeacherProfile;
  busy: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onPermissions: () => void;
  onCourses: () => void;
  onReset: () => void;
  onToggleStatus: () => void;
  onMessage: () => void;
}) {
  const name = teacher.full_name ?? "Unnamed teacher";
  const statusValue = teacher.status === "approved" ? "active" : teacher.status === "rejected" ? "inactive" : "pending";

  return (
    <article className="wc-card p-4">
      <div className="flex items-start gap-3">
        <TeacherAvatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-base font-bold text-on-surface">{name}</h3>
            <StatusPill value={statusValue} />
          </div>
          <p className="mt-1 break-words text-sm text-on-surface-variant">{teacher.email}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{teacher.phone ?? "Phone not set"}</p>
          <p className="mt-2 text-xs text-on-surface-variant">Created {formatDate(teacher.created_at)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ActionButton icon="info" label="Details" onClick={onDetails} />
        <ActionButton icon="edit" label="Edit" onClick={onEdit} />
        <ActionButton icon="admin_panel_settings" label="Access" onClick={onPermissions} />
        <ActionButton icon="school" label="Courses" onClick={onCourses} />
        <ActionButton icon="lock_reset" label="Reset" onClick={onReset} />
        <ActionButton icon={teacher.status === "approved" ? "person_off" : "verified_user"} label={teacher.status === "approved" ? "Deactivate" : "Activate"} onClick={onToggleStatus} disabled={busy} />
        <ActionButton icon="content_copy" label="Message" onClick={onMessage} className="col-span-2 sm:col-span-1" />
      </div>
    </article>
  );
}

function IconButton({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-primary transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
      title={label}
    >
      <Icon name={icon} className="text-lg" />
    </button>
  );
}

function ActionButton({ icon, label, onClick, disabled, className = "" }: { icon: string; label: string; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Icon name={icon} className="text-base" />
      {label}
    </button>
  );
}

function Modal({
  title,
  icon,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5">
      <div className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-5xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between gap-4 border-b border-outline-variant/70 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Icon name={icon} className="text-xl" />
            </span>
            <h2 className="text-title-lg text-on-surface">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-primary" title="Close">
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function TeacherDetailsModal({ teacher, onClose }: { teacher: TeacherProfile | null; onClose: () => void }) {
  if (!teacher) return null;
  const name = teacher.full_name ?? "Unnamed teacher";
  const statusValue = teacher.status === "approved" ? "active" : teacher.status === "rejected" ? "inactive" : "pending";
  const allowedLabels = getPermissionLabels(teacher.permissions);
  const selectedSet = new Set(teacher.permissions);
  const allTeacherPermissions = TEACHER_PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => ({ key: permission.key, label: permission.label })),
  );
  const restrictedLabels = allTeacherPermissions
    .filter((permission) => !selectedSet.has(permission.key))
    .map((permission) => permission.label);

  return (
    <Modal title="Teacher details" icon="badge" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
          <TeacherAvatar name={name} />
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold text-on-surface">{name}</h3>
            <p className="break-words text-sm text-on-surface-variant">{teacher.email}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{teacher.phone ?? "Phone not set"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="wc-section-label px-3 py-1 text-[10px]">Teacher</span>
              <StatusPill value={statusValue} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-on-surface">Allowed modules</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedLabels.length > 0 ? (
              allowedLabels.map((item) => (
                <span key={item} className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-primary">{item}</span>
              ))
            ) : (
              <span className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-error">No permissions selected</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-on-surface">Assigned courses</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {teacher.assignedCourseIds.length > 0 ? (
              teacher.assignedCourseIds.map((courseId) => (
                <span key={courseId} className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-primary">{courseId}</span>
              ))
            ) : (
              <span className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-error">No course assigned</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-on-surface">Restricted modules</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Completion certificates", "Teacher accounts", "Main admin role", ...restrictedLabels].map((item) => (
              <span key={item} className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-error">{item}</span>
            ))}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">Created {formatDate(teacher.created_at)}</p>
      </div>
    </Modal>
  );
}
