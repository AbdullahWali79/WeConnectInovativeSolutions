"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { courseInScope, filterCoursesByScope, loadTeacherCourseScope, type CourseScope } from "@/lib/admin-course-scope";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Application, Course, Profile } from "@/lib/supabase/types";
import { buildApprovedStudentWhatsappUrl, formatDateTime, type WhatsappMessageTemplate, whatsappMessageTemplateOptions } from "@/lib/utils";

export function ApplicationsManager({
  currentRole = "admin",
  permissions = [],
  approvedStudentMessageTemplate,
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
  approvedStudentMessageTemplate: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const canApprove = currentRole === "admin" || permissions.includes("applications.approve");
  const isAdmin = currentRole === "admin";
  const [applications, setApplications] = useState<Application[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseScope, setCourseScope] = useState<CourseScope>(null);
  const [status, setStatus] = useState("all");
  const [courseId, setCourseId] = useState("all");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedWhatsappTemplate, setSelectedWhatsappTemplate] = useState<WhatsappMessageTemplate>("default");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    let scope: CourseScope = null;
    try {
      scope = await loadTeacherCourseScope(supabase as never, currentRole);
      setCourseScope(scope);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to load course scope." });
      scope = [];
    }
    const [apps, courseResult] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
    ]);
    if (apps.error ?? courseResult.error) setToast({ type: "error", message: (apps.error ?? courseResult.error)?.message ?? "Failed to load data." });
    setApplications((apps.data ?? []).filter((application) => courseInScope(application.course_id, scope)));
    setCourses(filterCoursesByScope(courseResult.data ?? [], scope));
    setLoading(false);
  }, [currentRole, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const filtered = useMemo(() => applications.filter((application) => {
    const statusMatch = status === "all" || application.status === status;
    const courseMatch = (courseId === "all" || application.course_id === courseId) && courseInScope(application.course_id, courseScope);
    const text = `${application.full_name} ${application.email} ${application.phone}`.toLowerCase();
    const queryMatch = text.includes(query.trim().toLowerCase());
    const created = new Date(application.created_at);
    const fromMatch = !fromDate || created >= new Date(`${fromDate}T00:00:00`);
    const toMatch = !toDate || created <= new Date(`${toDate}T23:59:59`);
    return statusMatch && courseMatch && queryMatch && fromMatch && toMatch;
  }), [applications, status, courseId, query, fromDate, toDate, courseScope]);

  async function updateApplication(applicationId: string, action: "approve_application" | "reject_application") {
    if (!canApprove) {
      setToast({ type: "error", message: "You do not have permission to approve or reject applications." });
      return;
    }
    setBusyId(applicationId);
    
    // Use the new server action to ensure the profile is updated at the same time
    const { updateApplicationStatus } = await import("@/app/admin/actions");
    const result = await updateApplicationStatus(applicationId, action);
    
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error || "Failed to update application." });
      return;
    }

    setToast({ type: "success", message: action === "approve_application" ? "Application approved. Student can now log in." : "Application rejected." });
    await loadData();
  }

  async function deleteApplication(applicationId: string) {
    if (!isAdmin) {
      setToast({ type: "error", message: "Only the main admin can delete application records." });
      return;
    }
    if (!confirm("Delete this application record? Student auth account will remain unless you reject access first.")) return;
    
    setBusyId(applicationId);
    const { error } = await supabase.from("applications").delete().eq("id", applicationId);
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Application deleted." });
    await loadData();
  }

  function sendWhatsapp(application: Application) {
    const courseTitle = application.course_id ? courseById.get(application.course_id)?.title ?? null : null;
    const whatsappUrl = buildApprovedStudentWhatsappUrl(application, courseTitle, selectedWhatsappTemplate, approvedStudentMessageTemplate);

    if (!whatsappUrl) {
      setToast({ type: "error", message: "Valid WhatsApp phone number not found for this application." });
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) return <LoadingState label="Loading applications..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader eyebrow="Applications" title="Student applications" description="Review public course applications and approve or reject them. Approved students can then create their own password from the login page and sign in." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-4 flex flex-wrap gap-3">
          {["all", "pending", "approved", "rejected"].map((item) => (
            <button key={item} onClick={() => setStatus(item)} className={`rounded-full px-5 py-2.5 text-xs font-bold ${status === item ? "bg-primary text-white" : "border border-outline-variant bg-white text-on-surface-variant"}`}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-6">
          <input
            className="wc-input md:col-span-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name/email/phone"
          />
          <select className="wc-input" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <select className="wc-input" value={selectedWhatsappTemplate} onChange={(event) => setSelectedWhatsappTemplate(event.target.value as WhatsappMessageTemplate)}>
            {whatsappMessageTemplateOptions.map((template) => (
              <option key={template.value} value={template.value}>{template.label}</option>
            ))}
          </select>
          <input className="wc-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <input className="wc-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No applications found" description="Change the filter or submit a public application from the landing page." icon="pending_actions" />
        ) : (
          <div className="wc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {filtered.map((application) => (
                    <motion.tr key={application.id} whileHover={{ backgroundColor: "rgba(0, 33, 110, 0.02)" }}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-on-surface">{application.full_name}</p>
                        <p className="text-xs text-on-surface-variant">{application.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{application.course_id ? courseById.get(application.course_id)?.title ?? "Unknown" : "Not selected"}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{application.phone}</td>
                      <td className="max-w-sm px-4 py-3 text-xs text-on-surface-variant">{application.message || "No message"}</td>
                      <td className="px-4 py-3"><StatusPill value={application.status} /></td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDateTime(application.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canApprove ? <button title="Approve" disabled={application.status === "approved" || busyId === application.id} onClick={() => updateApplication(application.id, "approve_application")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-30 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"><Icon name="check" /></button> : null}
                          {canApprove ? <button title="Reject" disabled={application.status === "rejected" || busyId === application.id} onClick={() => updateApplication(application.id, "reject_application")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container text-error hover:bg-red-100 disabled:opacity-30 dark:hover:bg-red-900/30"><Icon name="close" /></button> : null}
                          <button title="Send WhatsApp" disabled={application.status !== "approved"} onClick={() => sendWhatsapp(application)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"><Icon name="forum" /></button>
                          {isAdmin ? <button title="Delete Record" disabled={busyId === application.id} onClick={() => deleteApplication(application.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-outline-variant hover:text-error disabled:opacity-30 dark:bg-slate-700 dark:hover:bg-slate-600"><Icon name="delete" /></button> : null}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
