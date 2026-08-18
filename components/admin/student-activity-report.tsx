"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { getStudentActivityReport, type ActivityEventRow, type ActivityReportRow } from "@/app/admin/student-activity/actions";

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(date);
}

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });
}

function pageName(path: string) {
  const names: Record<string, string> = {
    "/student": "Dashboard", "/student/tasks": "Tasks", "/student/courses": "Courses",
    "/student/syllabus": "Syllabus", "/student/progress": "Progress", "/student/projects": "Projects",
    "/student/assigned-projects": "Assigned Projects", "/student/client-hunting": "Client Hunting",
    "/student/social-media": "Social Media", "/student/profile": "Profile", "/student/videos": "Videos",
    "/student/helping-videos": "Helping Videos", "/student/seat-reservation": "Seat Reservation",
  };
  return names[path] || path.replace(/^\/student\/?/, "").replaceAll("-", " ") || "Dashboard";
}

export function StudentActivityReport() {
  const [from, setFrom] = useState(localDate(-6));
  const [to, setTo] = useState(localDate());
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [rows, setRows] = useState<ActivityReportRow[]>([]);
  const [events, setEvents] = useState<ActivityEventRow[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      try {
        const result = await getStudentActivityReport({ from, to, studentId: studentId || undefined });
        setRows(result.rows); setEvents(result.events); setProfiles(result.profiles);
      } catch (error) {
        setToast({ type: "error", message: error instanceof Error ? error.message : "Activity report could not be loaded." });
      }
    });
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedSearch = studentSearch.trim().toLowerCase();
  const visibleRows = useMemo(() => normalizedSearch
    ? rows.filter((row) => `${row.studentName} ${row.email}`.toLowerCase().includes(normalizedSearch))
    : rows, [rows, normalizedSearch]);
  const visibleStudentIds = useMemo(() => new Set(visibleRows.map((row) => row.studentId)), [visibleRows]);
  const visibleEvents = useMemo(() => normalizedSearch
    ? events.filter((event) => visibleStudentIds.has(event.studentId))
    : events, [events, normalizedSearch, visibleStudentIds]);
  const filteredProfiles = useMemo(() => normalizedSearch
    ? profiles.filter((profile) => `${profile.name} ${profile.email}`.toLowerCase().includes(normalizedSearch))
    : profiles, [profiles, normalizedSearch]);

  const totals = useMemo(() => visibleRows.reduce((sum, row) => ({
    seconds: sum.seconds + row.activeSeconds, views: sum.views + row.pageViews, submits: sum.submits + row.submitActions,
  }), { seconds: 0, views: 0, submits: 0 }), [visibleRows]);

  function downloadExcel() {
    const workbook = XLSX.utils.book_new();
    const summary = visibleRows.map((row) => ({
      Date: row.date, Student: row.studentName, Email: row.email, "Active Time": duration(row.activeSeconds),
      "Active Seconds": row.activeSeconds, "First Seen": dateTime(row.firstSeenAt), "Last Seen": dateTime(row.lastSeenAt),
      "Page Views": row.pageViews, "Submit Actions": row.submitActions,
    }));
    const details = visibleEvents.map((event) => ({
      Time: dateTime(event.occurredAt), Student: event.studentName,
      Action: event.eventType === "submit" ? "Submit" : "Viewed", Page: pageName(event.path), Path: event.path, Detail: event.label || "",
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.length ? summary : [{ Date: "No records" }]), "Daily Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(details.length ? details : [{ Time: "No events" }]), "Activity Detail");
    XLSX.writeFile(workbook, `student-activity-${from}-to-${to}.xlsx`);
  }

  return <>
    <PageHeader eyebrow="Student monitoring" title="Student activity logs" description="See what each student opened or submitted and how long they actively used the portal, grouped day by day." action={
      <button className="wc-primary-btn w-full md:w-auto" onClick={downloadExcel} disabled={!visibleRows.length}><Icon name="download" /> Download Excel</button>
    } />

    <section className="wc-card mb-5 grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.3fr_auto] xl:items-end">
      <label className="text-sm font-bold">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2" /></label>
      <label className="text-sm font-bold">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2" /></label>
      <label className="text-sm font-bold">Search student<div className="relative mt-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-10 pr-3" placeholder="Search name or email..." /></div></label>
      <label className="text-sm font-bold">Student<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2"><option value="">All students</option>{filteredProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} {profile.email ? `(${profile.email})` : ""}</option>)}</select></label>
      <button className="wc-secondary-btn justify-center" onClick={load} disabled={pending}><Icon name="filter_alt" /> {pending ? "Loading..." : "Apply"}</button>
    </section>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Stat icon="schedule" label="Active usage" value={duration(totals.seconds)} />
      <Stat icon="visibility" label="Pages viewed" value={String(totals.views)} />
      <Stat icon="send" label="Submit actions" value={String(totals.submits)} />
    </div>

    {pending && !rows.length ? <LoadingState label="Loading student activity..." /> : <section className="wc-card overflow-hidden">
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-surface-container text-xs uppercase text-on-surface-variant"><tr><th className="px-4 py-3">Date / Student</th><th className="px-4 py-3">Active time</th><th className="px-4 py-3">First – last seen</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Submits</th><th className="px-4 py-3">Detail</th></tr></thead>
      <tbody className="divide-y divide-outline-variant">{visibleRows.map((row) => {
        const key = `${row.studentId}:${row.date}`;
        const dayEvents = visibleEvents.filter((event) => event.studentId === row.studentId && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(event.occurredAt)) === row.date);
        return <tr key={key} className="align-top"><td className="px-4 py-3"><p className="font-black">{row.studentName}</p><p className="text-xs text-on-surface-variant">{row.date} · {row.email}</p>{expandedKey === key && <div className="mt-3 min-w-[300px] space-y-2">{dayEvents.map((event) => <div key={event.id} className="rounded-lg bg-surface-container p-2 text-xs"><span className="font-black">{event.eventType === "submit" ? "Submitted" : "Viewed"}</span> {pageName(event.path)} <span className="text-on-surface-variant">· {dateTime(event.occurredAt)}</span>{event.label && <p className="mt-1 text-on-surface-variant">{event.label}</p>}</div>)}{!dayEvents.length && <p className="text-xs text-on-surface-variant">No event details for this day.</p>}</div>}</td><td className="px-4 py-3 font-black text-primary">{duration(row.activeSeconds)}</td><td className="px-4 py-3 text-xs">{dateTime(row.firstSeenAt)}<br />{dateTime(row.lastSeenAt)}</td><td className="px-4 py-3">{row.pageViews}</td><td className="px-4 py-3">{row.submitActions}</td><td className="px-4 py-3"><button className="font-bold text-primary" onClick={() => setExpandedKey(expandedKey === key ? null : key)}>{expandedKey === key ? "Hide" : "View log"}</button></td></tr>;
      })}{!visibleRows.length && <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">{studentSearch ? "No student activity matches your search." : "No student activity found for this date range."}</td></tr>}</tbody></table></div>
    </section>}
    <Toast toast={toast} onClear={() => setToast(null)} />
  </>;
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="wc-card flex items-center gap-3 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><Icon name={icon} /></span><div><p className="text-xs font-bold uppercase text-on-surface-variant">{label}</p><p className="text-xl font-black">{value}</p></div></div>;
}
