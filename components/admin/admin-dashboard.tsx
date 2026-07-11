"use client";

import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Application, CompletedStudent, Course, Enrollment, Profile, Task } from "@/lib/supabase/types";
import { buildApprovedStudentWhatsappUrl, formatDate, type WhatsappMessageTemplate, whatsappMessageTemplateOptions } from "@/lib/utils";

type DashboardData = {
  courses: Course[];
  applications: Application[];
  profiles: Profile[];
  enrollments: Enrollment[];
  tasks: Task[];
  completed: CompletedStudent[];
};

export function AdminDashboard({
  currentRole,
  permissions = [],
  approvedStudentMessageTemplate,
}: {
  currentRole: Profile["role"];
  permissions?: PermissionKey[];
  approvedStudentMessageTemplate: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const [data, setData] = useState<DashboardData>({ courses: [], applications: [], profiles: [], enrollments: [], tasks: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedWhatsappTemplate, setSelectedWhatsappTemplate] = useState<WhatsappMessageTemplate>("default");
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const isAdmin = currentRole === "admin";
    const [courses, applications, profiles, enrollments, tasks, completed] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      isAdmin ? supabase.from("applications").select("*").order("created_at", { ascending: false }).limit(12) : Promise.resolve({ data: [], error: null }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      isAdmin ? supabase.from("completed_students").select("*").order("completed_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);

    const error = courses.error ?? applications.error ?? profiles.error ?? enrollments.error ?? tasks.error ?? completed.error;
    if (error) setToast({ type: "error", message: error.message });

    setData({
      courses: courses.data ?? [],
      applications: applications.data ?? [],
      profiles: profiles.data ?? [],
      enrollments: enrollments.data ?? [],
      tasks: tasks.data ?? [],
      completed: completed.data ?? [],
    });
    setLoading(false);
  }, [currentRole, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseById = useMemo(() => new Map(data.courses.map((course) => [course.id, course])), [data.courses]);
  const isAdmin = currentRole === "admin";
  const shortcuts = [
    canUse("courses.view") ? { href: "/admin/courses", icon: "school", title: "Courses", description: "Create, edit, and organize active course content." } : null,
    canUse("students.view") ? { href: "/admin/students", icon: "groups", title: "Students", description: "View approved student profiles and enrollment context." } : null,
    canUse("tasks.view") ? { href: "/admin/tasks", icon: "assignment_add", title: "Tasks", description: "Assign work with deadlines and learning resources." } : null,
    isAdmin ? { href: "/admin/client-hunting", icon: "manage_search", title: "Client Hunting", description: "Review daily lead submissions and scenario briefs." } : null,
    canUse("submissions.view") ? { href: "/admin/submissions", icon: "rate_review", title: "Reviews", description: "Score submissions and send feedback." } : null,
    canUse("announcements.view") ? { href: "/admin/announcements", icon: "campaign", title: "Announcements", description: "Read and publish student notices." } : null,
    canUse("progress.view") ? { href: "/admin/progress", icon: "monitoring", title: "Progress", description: "Monitor student progress and scores." } : null,
  ].filter((item): item is { href: string; icon: string; title: string; description: string } => Boolean(item));
  const pendingApplications = data.applications.filter((application) => application.status === "pending");
  const approvedStudents = data.profiles.filter((profile) => profile.role === "student" && profile.status === "approved");
  const activeTasks = data.tasks.filter((task) => task.status !== "reviewed" && task.status !== "rejected");

  async function updateApplication(applicationId: string, action: "approve_application" | "reject_application") {
    setBusyId(applicationId);
    const { error } =
      action === "approve_application"
        ? await supabase.rpc("approve_application", { application_id: applicationId })
        : await supabase.rpc("reject_application", { application_id: applicationId });
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: action === "approve_application" ? "Application approved." : "Application rejected." });
    await loadData();
  }

  async function deleteApplication(applicationId: string) {
    if (!confirm("Delete this application record? Student auth account will remain unless you reject access first.")) return;

    setBusyId(applicationId);
    const { error } = await supabase.from("applications").delete().eq("id", applicationId);
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Application record deleted." });
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

  if (loading) return <LoadingState label="Loading admin dashboard..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow={isAdmin ? "Admin Portal" : "Teacher Portal"}
        title="Operations dashboard"
        description={isAdmin ? "Live Supabase stats for courses, applications, enrollments, tasks, and completions." : "Live workspace for courses, students, tasks, submissions, announcements, and progress tracking."}
        action={canUse("tasks.view") ? <Link href="/admin/tasks" className="wc-primary-btn text-sm"><Icon name="assignment_add" /> Assign Task</Link> : undefined}
      />

      {/* Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="school" label="Total Courses" value={data.courses.length} />
        {isAdmin ? <StatCard icon="pending_actions" label="Pending Apps" value={pendingApplications.length} tone="secondary" /> : null}
        <StatCard icon="groups" label="Approved Students" value={approvedStudents.length} />
        <StatCard icon="assignment" label="Active Tasks" value={activeTasks.length} />
        {isAdmin ? <StatCard icon="workspace_premium" label="Completed" value={data.completed.length} dark /> : null}
      </div>

      {/* Main Grid */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px]">
        {/* Recent Applications Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="wc-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/50 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-on-surface">{isAdmin ? "Recent Applications" : "Training Operations"}</h2>
              <p className="text-xs text-on-surface-variant">{isAdmin ? "Approve or reject real application rows." : "Jump into the course, student, task, and review workspaces."}</p>
              {isAdmin ? (
                <div className="mt-3">
                  <select className="wc-input max-w-[320px]" value={selectedWhatsappTemplate} onChange={(event) => setSelectedWhatsappTemplate(event.target.value as WhatsappMessageTemplate)}>
                    {whatsappMessageTemplateOptions.map((template) => (
                      <option key={template.value} value={template.value}>{template.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            {isAdmin ? <Link href="/admin/applications" className="wc-secondary-btn px-3 py-1.5 text-xs">View all</Link> : null}
          </div>

          {!isAdmin ? (
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {shortcuts.length > 0 ? (
                shortcuts.map((shortcut) => <DashboardShortcut key={shortcut.href} {...shortcut} />)
              ) : (
                <EmptyState title="No modules enabled" description="Ask the main admin to enable at least one teacher module." icon="lock" />
              )}
            </div>
          ) : data.applications.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No applications yet" description="Public application submissions will appear here." icon="pending_actions" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {data.applications.slice(0, 6).map((application) => (
                    <motion.tr
                      key={application.id}
                      whileHover={{ backgroundColor: "rgba(0, 33, 110, 0.02)" }}
                      className="transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-on-surface">{application.full_name}</p>
                        <p className="text-[11px] text-on-surface-variant">{application.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{application.course_id ? courseById.get(application.course_id)?.title ?? "Unknown course" : "Not selected"}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{application.phone}</td>
                      <td className="px-4 py-3"><StatusPill value={application.status} /></td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(application.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={application.status === "approved" || busyId === application.id}
                            onClick={() => updateApplication(application.id, "approve_application")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700 transition hover:bg-green-100 hover:scale-105 disabled:opacity-40 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                          >
                            <Icon name="check" className="text-base" />
                          </button>
                          <button
                            disabled={application.status === "rejected" || busyId === application.id}
                            onClick={() => updateApplication(application.id, "reject_application")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container text-error transition hover:bg-red-100 hover:scale-105 disabled:opacity-40"
                          >
                            <Icon name="close" className="text-base" />
                          </button>
                          <button
                            title="Send WhatsApp"
                            disabled={application.status !== "approved"}
                            onClick={() => sendWhatsapp(application)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Icon name="forum" className="text-base" />
                          </button>
                          <button
                            title="Delete Record"
                            disabled={busyId === application.id}
                            onClick={() => deleteApplication(application.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition hover:bg-outline-variant hover:text-error hover:scale-105 disabled:opacity-40"
                          >
                            <Icon name="delete" className="text-base" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Right Sidebar */}
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl bg-primary p-4 text-white shadow-card"
          >
              <h3 className="text-sm font-bold">Quick Tasks</h3>
              <div className="mt-3 space-y-2 text-sm">
              {isAdmin ? <QuickLink href="/admin/applications" icon="pending_actions" label={`Review ${pendingApplications.length} pending`} /> : null}
              {canUse("courses.view") ? <QuickLink href="/admin/courses" icon="school" label="Manage course catalog" /> : null}
              {canUse("submissions.view") ? <QuickLink href="/admin/submissions" icon="rate_review" label="Score submissions" /> : null}
              {isAdmin ? <QuickLink href="/admin/client-hunting" icon="manage_search" label="Review client hunting leads" /> : null}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="wc-card p-4"
          >
            <h3 className="text-sm font-bold text-on-surface">Progress Snapshot</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Total Enrollments</span>
                <span className="font-bold text-primary">{data.enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Active</span>
                <span className="font-bold text-green-600">{data.enrollments.filter((e) => e.status === "active").length}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.enrollments.length > 0 ? (data.enrollments.filter((e) => e.status === "active").length / data.enrollments.length) * 100 : 0}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
            {canUse("progress.view") ? <Link href="/admin/progress" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              View Detailed Report <Icon name="arrow_forward" className="text-xs" />
            </Link> : null}
          </motion.div>
        </aside>
      </section>
    </>
  );
}

function DashboardShortcut({ href, icon, title, description }: { href: string; icon: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-4 transition hover:border-primary/30 hover:shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
        <Icon name={icon} className="text-xl" />
      </span>
      <span className="mt-4 block text-sm font-bold text-on-surface">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-on-surface-variant">{description}</span>
    </Link>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useSpring(0, { duration: 1500, bounce: 0 });
  const display = useTransform(motionValue, (v) => Math.floor(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [display]);

  return <span ref={ref}>{displayValue}</span>;
}

function StatCard({ icon, label, value, tone, dark }: { icon: string; label: string; value: number; tone?: "secondary"; dark?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={
        dark
          ? "relative overflow-hidden rounded-xl bg-primary p-3 text-white shadow-card transition-shadow hover:shadow-glow"
          : "relative overflow-hidden rounded-xl border border-outline-variant/40 bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover"
      }
    >
      <div
        className={
          dark
            ? "absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-white/20 via-white/40 to-white/20"
            : tone === "secondary"
              ? "absolute left-0 right-0 top-0 h-0.5 bg-secondary"
              : "absolute left-0 right-0 top-0 h-0.5 bg-primary/30"
        }
      />

      <div className="flex items-center gap-2">
        <div
          className={
            dark
              ? "flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white"
              : tone === "secondary"
                ? "flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed"
                : "flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container text-primary"
          }
        >
          <Icon name={icon} className="text-base" />
        </div>
        <p className={dark ? "text-[10px] font-bold uppercase tracking-wider text-blue-100" : "text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"}>
          {label}
        </p>
      </div>

      <p className={dark ? "mt-2 text-xl font-black text-white" : "mt-2 text-xl font-black text-primary"}>
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2 text-xs transition-all hover:bg-white/15 hover:translate-x-0.5">
      <Icon name={icon} className="text-base transition-transform group-hover:scale-110" />
      <span>{label}</span>
    </Link>
  );
}
