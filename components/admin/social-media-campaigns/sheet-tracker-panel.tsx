/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { type ToastState } from "@/components/toast";
import { toPng } from "html-to-image";
import {
  setDayPublished,
  toggleWinnerSubmission,
  deleteSubmissionByAdmin,
} from "@/app/admin/social-media-campaigns/actions";
import { extractSubmissionLinks } from "@/lib/proof-links";

type Row = any;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

export function SheetTrackerPanel({
  campaign,
  days,
  members,
  submissions,
  onReload,
  onAddDay,
  onEditDay,
  setToast,
}: {
  campaign: Row;
  days: Row[];
  members: Row[];
  submissions: Row[];
  onReload: () => Promise<void>;
  onAddDay?: () => void;
  onEditDay?: (day: Row) => void;
  setToast: (toast: ToastState) => void;
}) {
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");
  const [activeDayDetail, setActiveDayDetail] = useState<Row | null>(null);
  const [busySubId, setBusySubId] = useState<string | null>(null);
  const [editingPublishDayId, setEditingPublishDayId] = useState<string | null>(null);
  const [publishedUrlInput, setPublishedUrlInput] = useState("");
  const [savingPublish, setSavingPublish] = useState(false);
  const [showAttendanceCards, setShowAttendanceCards] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isExportingAttendancePng, setIsExportingAttendancePng] = useState(false);
  const attendanceCardRef = useRef<HTMLDivElement>(null);

  async function handleExportAttendancePng() {
    setIsExportingAttendancePng(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
      if (!attendanceCardRef.current) throw new Error("Tracker element not ready.");

      const dataUrl = await toPng(attendanceCardRef.current, {
        cacheBust: true,
        backgroundColor: "#0B1329",
        pixelRatio: 2,
      });

      const campName = (campaign?.client_name || campaign?.campaign_name || "campaign")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      const link = document.createElement("a");
      link.download = `weconnect-attendance-${campName}-${todayIso()}.png`;
      link.href = dataUrl;
      link.click();

      setToast({ type: "success", message: "📸 Attendance card image downloaded!" });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Could not generate attendance image." });
    } finally {
      setIsExportingAttendancePng(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isMaximized) {
        setIsMaximized(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

  // Group days into weeks (Days 1-7 = Week 1, 8-14 = Week 2, etc.)
  const weeks = useMemo(() => {
    const map: Record<number, Row[]> = {};
    for (const day of days) {
      const w = Math.ceil(day.day_number / 7) || 1;
      if (!map[w]) map[w] = [];
      map[w].push(day);
    }
    return map;
  }, [days]);

  const weekNumbers = useMemo(() => {
    return Object.keys(weeks)
      .map(Number)
      .sort((a, b) => a - b);
  }, [weeks]);

  // Submissions map: key = `${day_id}_${student_id}`
  const submissionsMap = useMemo(() => {
    const map: Record<string, Row> = {};
    for (const sub of submissions) {
      const key = `${sub.day_id}_${sub.student_id}`;
      map[key] = sub;
    }
    return map;
  }, [submissions]);

  // Overall attendance & submission stats per assigned student
  const studentStats = useMemo(() => {
    const today = todayIso();
    const pastOrTodayDays = days.filter((d) => !d.post_date || d.post_date <= today);
    const targetCount = pastOrTodayDays.length || days.length || 1;

    return members.map((member) => {
      const studentId = member.student_id;
      const studentSubmissions = submissions.filter((s) => s.student_id === studentId);
      const totalSubmitted = studentSubmissions.length;
      const winnerCount = studentSubmissions.filter((s) => s.is_selected).length;

      let missedCount = 0;
      for (const day of pastOrTodayDays) {
        if (!submissionsMap[`${day.id}_${studentId}`]) {
          missedCount += 1;
        }
      }

      const percent = Math.min(100, Math.round((totalSubmitted / targetCount) * 100));

      return {
        memberId: member.id,
        studentId,
        student: member.student,
        totalSubmitted,
        winnerCount,
        missedCount,
        percent,
      };
    });
  }, [days, members, submissions, submissionsMap]);

  // Visible days based on selected week
  const displayedDays = useMemo(() => {
    if (selectedWeek === "all") return days;
    return weeks[selectedWeek] ?? [];
  }, [days, selectedWeek, weeks]);

  // Winner selection / ranking toggle
  async function handleToggleWinner(submission: Row, day: Row) {
    setBusySubId(submission.id);
    const res = await toggleWinnerSubmission(submission.id, day.id);
    setBusySubId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not update winner status." });
      return;
    }
    setToast({
      type: "success",
      message: res.is_selected
        ? `🏆 Marked as Winning Best Pick for Day #${day.day_number}!`
        : `Unmarked winning status for Day #${day.day_number}.`,
    });
    void onReload();
  }

  // Admin deletion of invalid submission
  async function handleDeleteSubmission(submissionId: string) {
    if (!confirm("Are you sure you want to remove this submission?")) return;
    setBusySubId(submissionId);
    const res = await deleteSubmissionByAdmin(submissionId);
    setBusySubId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not delete submission." });
      return;
    }
    setToast({ type: "success", message: "Submission removed." });
    void onReload();
  }

  // Save published Facebook link
  async function handleSavePublish(dayId: string) {
    setSavingPublish(true);
    const res = await setDayPublished(dayId, publishedUrlInput.trim());
    setSavingPublish(false);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not save published link." });
      return;
    }
    setEditingPublishDayId(null);
    setPublishedUrlInput("");
    setToast({ type: "success", message: "Published Facebook link saved!" });
    void onReload();
  }

  return (
    <div
      className={
        isMaximized
          ? "fixed inset-0 z-50 bg-[#f8f9fa] dark:bg-zinc-950 p-3 sm:p-5 overflow-auto space-y-3"
          : "space-y-3"
      }
    >
      {/* 1. Single Jhalak: Student Attendance & Performance Summary (Collapsible) */}
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowAttendanceCards(!showAttendanceCards)}
            className="flex items-center gap-2 text-left group min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition shadow-2xs">
              <Icon name="fact_check" className="text-sm" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-on-surface group-hover:text-primary transition">
                  Daily Attendance &amp; Work Tracker
                </h3>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-low border border-outline-variant/60 px-2 py-0.2 text-[10px] font-bold text-on-surface-variant">
                  {members.length} {members.length === 1 ? "Student" : "Students"}
                </span>
                <span className="text-[11px] text-primary font-bold inline-flex items-center gap-0.5">
                  <Icon name={showAttendanceCards ? "expand_less" : "expand_more"} className="text-xs" />
                  <span>{showAttendanceCards ? "Hide Cards" : "Show Cards"}</span>
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant line-clamp-1">
                {showAttendanceCards
                  ? "Single-glance view of all students assigned to this campaign."
                  : "Click to view individual consistency, done and missed counts for each student."}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick summary stats in collapsed view */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-on-surface-variant bg-surface-low px-2.5 py-1 rounded-lg border border-outline-variant/40">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                ✅ {studentStats.reduce((sum, s) => sum + s.totalSubmitted, 0)} Done
              </span>
              <span>·</span>
              <span className="text-red-600 dark:text-red-400 font-bold">
                ❌ {studentStats.reduce((sum, s) => sum + s.missedCount, 0)} Missed
              </span>
            </div>

            <button
              type="button"
              disabled={isExportingAttendancePng}
              onClick={handleExportAttendancePng}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs transition"
              title="Download compact WhatsApp attendance image for this campaign"
            >
              <Icon name="photo_camera" className="text-sm text-emerald-600 dark:text-emerald-400" />
              <span>{isExportingAttendancePng ? "Saving..." : "WhatsApp Image"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAttendanceCards(!showAttendanceCards)}
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-low px-2.5 py-1 text-xs font-bold text-on-surface hover:text-primary hover:border-primary/50 shadow-2xs transition"
            >
              <Icon name={showAttendanceCards ? "expand_less" : "expand_more"} className="text-sm" />
              <span>{showAttendanceCards ? "Collapse" : "Expand"}</span>
            </button>
          </div>
        </div>

        {/* The 10 Student Cards Grid (Only visible when expanded) */}
        {showAttendanceCards && (
          <div className="mt-3 pt-3 border-t border-outline-variant/60 animate-in fade-in duration-150">
            {members.length === 0 ? (
              <div className="py-3 text-center text-xs text-on-surface-variant">
                No students allotted yet. Go to the <span className="font-bold text-primary">Team &amp; Students</span> tab to assign students to this page.
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {studentStats.map((stat) => (
                  <div
                    key={stat.studentId}
                    className="flex flex-col justify-between rounded-xl border border-outline-variant/80 bg-surface-low/50 p-2.5 transition hover:border-primary/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-xs text-on-surface">
                            {stat.student?.full_name || "Student"}
                          </p>
                          <p className="truncate text-[10px] text-on-surface-variant">
                            {stat.student?.email || "No email"}
                          </p>
                        </div>
                        {stat.winnerCount > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⭐ {stat.winnerCount} won
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-on-surface-variant">Consistency:</span>
                        <span className="font-black text-on-surface">{stat.percent}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`h-full transition-all duration-300 ${
                            stat.percent >= 80 ? "bg-emerald-500" : stat.percent >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${stat.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-outline-variant/40 pt-1.5 text-[10px]">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        ✅ {stat.totalSubmitted} Done
                      </span>
                      {stat.missedCount > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          ❌ {stat.missedCount} Missed
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          0 Missed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Week-Wise Selector Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedWeek("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedWeek === "all"
                ? "bg-primary text-on-primary shadow-xs"
                : "border border-outline-variant bg-surface-lowest text-on-surface-variant hover:text-primary hover:bg-surface-low"
            }`}
          >
            All Weeks ({days.length} Days)
          </button>

          {weekNumbers.map((wNum) => {
            const count = (weeks[wNum] ?? []).length;
            const startDay = (wNum - 1) * 7 + 1;
            const endDay = startDay + count - 1;
            return (
              <button
                key={wNum}
                type="button"
                onClick={() => setSelectedWeek(wNum)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedWeek === wNum
                    ? "bg-primary text-on-primary shadow-xs"
                    : "border border-outline-variant bg-surface-lowest text-on-surface-variant hover:text-primary hover:bg-surface-low"
                }`}
              >
                Week {String(wNum).padStart(2, "0")} (Days {startDay}-{endDay})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Maximize Workspace Button */}
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Exit Fullscreen (Esc)" : "Maximize Sheet Workspace"}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition shadow-xs ${
              isMaximized
                ? "bg-primary text-on-primary"
                : "border border-outline-variant bg-surface-lowest text-on-surface hover:text-primary hover:border-primary/50"
            }`}
          >
            <Icon name={isMaximized ? "fullscreen_exit" : "fullscreen"} className="text-base" />
            <span className="hidden sm:inline">{isMaximized ? "Exit Fullscreen" : "Maximize Sheet"}</span>
          </button>

          {onAddDay && (
            <button
              type="button"
              onClick={onAddDay}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary-container shadow-sm transition-all"
            >
              <Icon name="add" className="text-base" /> + Add Day / Topic
            </button>
          )}
          <span className="text-xs text-on-surface-variant">
            Total <span className="font-bold text-on-surface">{displayedDays.length}</span> days
          </span>
        </div>
      </div>

      {/* 3. Google Sheet Interactive Grid */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-low text-on-surface-variant">
                <th className="w-24 p-3 font-bold sticky left-0 bg-surface-low z-10 border-r border-outline-variant/60">
                  Day # / Date
                </th>
                <th className="min-w-[220px] max-w-[280px] p-3 font-bold border-r border-outline-variant/60">
                  Topic & Content Guideline
                </th>
                {members.map((member) => (
                  <th
                    key={member.student_id}
                    className="min-w-[200px] max-w-[240px] p-3 font-bold border-r border-outline-variant/60 bg-surface-low/80"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon name="person" className="text-sm text-primary" />
                      <span className="truncate">{member.student?.full_name || "Student"}</span>
                    </div>
                  </th>
                ))}
                <th className="min-w-[180px] p-3 font-bold border-r border-outline-variant/60">
                  Winning Best Pick ⭐
                </th>
                <th className="min-w-[200px] p-3 font-bold">
                  Published FB Post Link
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {displayedDays.length === 0 ? (
                <tr>
                  <td colSpan={3 + members.length} className="p-8 text-center text-on-surface-variant">
                    No days planned in this week yet.
                  </td>
                </tr>
              ) : (
                displayedDays.map((day) => {
                  const today = todayIso();
                  const isToday = day.post_date === today;
                  const isPast = day.post_date && day.post_date < today;

                  // Find winning submission if any
                  const winningSub = submissions.find(
                    (s) => s.day_id === day.id && (s.is_selected || s.status === "selected")
                  );

                  return (
                    <tr
                      key={day.id}
                      className={`transition-colors hover:bg-surface-low/40 ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Day # and Date */}
                      <td className="p-3 align-top font-bold text-on-surface sticky left-0 bg-surface-lowest z-10 border-r border-outline-variant/60">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1">
                            Day #{day.day_number}
                            {isToday && (
                              <span className="rounded-full bg-primary px-1.5 py-0.2 text-[9px] font-black text-on-primary uppercase">
                                Today
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-normal text-on-surface-variant mt-0.5">
                            {formatDate(day.post_date)}
                          </span>
                        </div>
                      </td>

                      {/* Topic & Content Idea */}
                      <td className="p-3 align-top border-r border-outline-variant/60">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-bold text-on-surface leading-snug">
                              {day.theme || "Topic not specified"}
                            </p>
                            {onEditDay && (
                              <button
                                type="button"
                                onClick={() => onEditDay(day)}
                                title="Edit day content & links"
                                className="rounded p-1 text-on-surface-variant hover:text-primary hover:bg-surface-low"
                              >
                                <Icon name="edit" className="text-xs" />
                              </button>
                            )}
                          </div>

                          {day.caption && (
                            <p className="line-clamp-2 text-[11px] text-on-surface-variant">
                              {day.caption}
                            </p>
                          )}

                          {/* Quick clickable links shared by Admin */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {day.source_link && (
                              <a
                                href={day.source_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:underline dark:bg-blue-950 dark:text-blue-300"
                                title="Open Google Docs Brief"
                              >
                                <Icon name="description" className="text-xs" /> Docs Brief ↗
                              </a>
                            )}
                            {day.research_note && day.research_note.startsWith("http") && (
                              <a
                                href={day.research_note}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:underline dark:bg-emerald-950 dark:text-emerald-300"
                                title="Open ChatGPT Script / Chat"
                              >
                                <Icon name="smart_toy" className="text-xs" /> ChatGPT ↗
                              </a>
                            )}
                            {day.image_headline && day.image_headline.startsWith("http") && (
                              <a
                                href={day.image_headline}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 hover:underline dark:bg-amber-950 dark:text-amber-300"
                                title="Open Drive Assets"
                              >
                                <Icon name="folder_open" className="text-xs" /> Assets ↗
                              </a>
                            )}
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => setActiveDayDetail(day)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-0.5"
                            >
                              <Icon name="visibility" className="text-xs" /> View Full Brief & Details
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Allotted Student Columns */}
                      {members.map((member) => {
                        const sub = submissionsMap[`${day.id}_${member.student_id}`];
                        const isWinner = sub && (sub.is_selected || sub.status === "selected");
                        const subLinks = extractSubmissionLinks(sub);

                        return (
                          <td
                            key={member.student_id}
                            className={`p-3 align-top border-r border-outline-variant/60 transition-colors ${
                              isWinner ? "bg-amber-50/70 dark:bg-amber-950/20" : ""
                            }`}
                          >
                            {sub ? (
                              <div className="space-y-1.5 min-w-[170px]">
                                {/* Submission badge & delete */}
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      isWinner
                                        ? "bg-amber-500 text-white"
                                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    }`}
                                  >
                                    {isWinner ? "🏆 Winner ⭐" : "✅ Submitted"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubmission(sub.id)}
                                    title="Delete this submission"
                                    className="text-on-surface-variant hover:text-red-600 p-0.5"
                                  >
                                    <Icon name="delete" className="text-xs" />
                                  </button>
                                </div>

                                {/* Multi-links: Drive, Docs, Post */}
                                <div className="flex flex-col gap-1">
                                  {subLinks.driveUrl && (
                                    <a
                                      href={subLinks.driveUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 max-w-[200px] truncate text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1"
                                      title={subLinks.driveUrl}
                                    >
                                      <Icon name="folder_shared" className="text-xs shrink-0 text-emerald-600" />
                                      <span className="truncate">Google Drive Video</span>
                                      <Icon name="open_in_new" className="text-[10px] shrink-0 ml-auto opacity-70" />
                                    </a>
                                  )}

                                  {subLinks.docUrl && (
                                    <a
                                      href={subLinks.docUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 max-w-[200px] truncate text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 px-2 py-1"
                                      title={subLinks.docUrl}
                                    >
                                      <Icon name="description" className="text-xs shrink-0 text-blue-600" />
                                      <span className="truncate">Google Docs Brief</span>
                                      <Icon name="open_in_new" className="text-[10px] shrink-0 ml-auto opacity-70" />
                                    </a>
                                  )}

                                  {subLinks.postUrl && (
                                    <a
                                      href={subLinks.postUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 max-w-[200px] truncate text-[11px] font-bold text-purple-700 dark:text-purple-400 hover:underline rounded bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 px-2 py-1"
                                      title={subLinks.postUrl}
                                    >
                                      <Icon name="public" className="text-xs shrink-0 text-purple-600" />
                                      <span className="truncate">Live Post</span>
                                      <Icon name="open_in_new" className="text-[10px] shrink-0 ml-auto opacity-70" />
                                    </a>
                                  )}
                                </div>

                                {sub.note && (
                                  <p className="line-clamp-2 text-[10px] text-on-surface-variant italic">
                                    &ldquo;{sub.note}&rdquo;
                                  </p>
                                )}

                                {/* Admin Rank/Winner Toggle */}
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    disabled={busySubId === sub.id}
                                    onClick={() => handleToggleWinner(sub, day)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-colors ${
                                      isWinner
                                        ? "border border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100"
                                        : "border border-outline-variant bg-surface-lowest text-on-surface-variant hover:border-amber-400 hover:text-amber-600"
                                    }`}
                                  >
                                    <Icon name="star" className="text-xs text-amber-500" />
                                    {isWinner ? "Selected Winner" : "Pick as Winner ⭐"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-2">
                                {isPast ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                                    ❌ Missed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                                    ⏳ Pending
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Winner Column */}
                      <td className="p-3 align-top border-r border-outline-variant/60">
                        {winningSub ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-900/60 dark:bg-amber-950/30">
                            <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Icon name="emoji_events" className="text-xs" /> Best Pick
                            </p>
                            <p className="mt-0.5 font-bold text-xs text-on-surface truncate">
                              {winningSub.student?.full_name || "Assigned Student"}
                            </p>
                            {(winningSub.video_url || winningSub.post_url) && (
                              <a
                                href={winningSub.post_url || winningSub.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                              >
                                View Final Content ↗
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/70 italic">
                            No winner chosen yet
                          </span>
                        )}
                      </td>

                      {/* Live Published Facebook Post Column */}
                      <td className="p-3 align-top">
                        {editingPublishDayId === day.id ? (
                          <div className="space-y-1.5">
                            <input
                              type="url"
                              value={publishedUrlInput}
                              onChange={(e) => setPublishedUrlInput(e.target.value)}
                              placeholder="Paste Facebook Post link..."
                              className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-primary"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={savingPublish}
                                onClick={() => handleSavePublish(day.id)}
                                className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-on-primary hover:bg-primary/90"
                              >
                                {savingPublish ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPublishDayId(null)}
                                className="rounded border border-outline-variant px-2 py-1 text-[10px] text-on-surface-variant hover:bg-surface-low"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : day.published_url ? (
                          <div className="space-y-1">
                            <a
                              href={day.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-primary hover:underline text-[11px]"
                            >
                              <Icon name="link" className="text-xs" /> Live Post Link ↗
                            </a>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPublishDayId(day.id);
                                  setPublishedUrlInput(day.published_url || "");
                                }}
                                className="text-[10px] text-on-surface-variant hover:text-primary underline"
                              >
                                Edit link
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPublishDayId(day.id);
                              setPublishedUrlInput("");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            <Icon name="add_link" className="text-xs" /> Add FB Link
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brief / Script Details Modal */}
      {activeDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-outline-variant bg-surface-lowest p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant pb-3">
              <div>
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                  Day #{activeDayDetail.day_number}
                </span>
                <h3 className="mt-1 text-lg font-black text-on-surface">
                  {activeDayDetail.theme || "Content Guideline"}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Date: {formatDate(activeDayDetail.post_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDayDetail(null)}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Prominent Shared Reference Links */}
            {(activeDayDetail.source_link || activeDayDetail.research_note || activeDayDetail.image_headline) && (
              <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-black text-primary flex items-center gap-1.5">
                  <Icon name="link" className="text-base" /> Shared Reference Links &amp; Guides:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeDayDetail.source_link && (
                    <a
                      href={activeDayDetail.source_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white p-3 shadow-sm hover:border-blue-400 hover:shadow-md transition-all dark:bg-surface-lowest dark:border-blue-900"
                    >
                      <Icon name="description" className="text-xl text-blue-600" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-on-surface truncate">Google Docs Brief</p>
                        <p className="text-[10px] text-blue-600 truncate">Open Requirements &amp; Guide ↗</p>
                      </div>
                    </a>
                  )}

                  {activeDayDetail.research_note && activeDayDetail.research_note.startsWith("http") && (
                    <a
                      href={activeDayDetail.research_note}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all dark:bg-surface-lowest dark:border-emerald-900"
                    >
                      <Icon name="smart_toy" className="text-xl text-emerald-600" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-on-surface truncate">ChatGPT Script / Chat</p>
                        <p className="text-[10px] text-emerald-600 truncate">Open AI Prompt &amp; Script ↗</p>
                      </div>
                    </a>
                  )}

                  {activeDayDetail.image_headline && activeDayDetail.image_headline.startsWith("http") && (
                    <a
                      href={activeDayDetail.image_headline}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-3 shadow-sm hover:border-amber-400 hover:shadow-md transition-all dark:bg-surface-lowest dark:border-amber-900"
                    >
                      <Icon name="folder_open" className="text-xl text-amber-600" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-on-surface truncate">Drive Assets Folder</p>
                        <p className="text-[10px] text-amber-600 truncate">Open Raw Assets &amp; Footage ↗</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {activeDayDetail.caption && (
                <div className="rounded-xl border border-outline-variant bg-surface-low/50 p-3">
                  <p className="font-bold text-on-surface-variant uppercase text-[10px]">Note / Caption Idea:</p>
                  <p className="mt-1 text-on-surface whitespace-pre-wrap leading-relaxed">{activeDayDetail.caption}</p>
                </div>
              )}

              {activeDayDetail.reel_script && (
                <div className="rounded-xl border border-outline-variant bg-surface-low/50 p-3">
                  <p className="font-bold text-on-surface-variant uppercase text-[10px]">Reel Script / Hook:</p>
                  <p className="mt-1 text-on-surface whitespace-pre-wrap leading-relaxed font-mono text-[11px]">{activeDayDetail.reel_script}</p>
                </div>
              )}

              {activeDayDetail.hashtags && (
                <div>
                  <p className="font-bold text-on-surface-variant uppercase text-[10px]">Hashtags:</p>
                  <p className="text-primary font-semibold">{activeDayDetail.hashtags}</p>
                </div>
              )}

              {activeDayDetail.goal && (
                <div>
                  <p className="font-bold text-on-surface-variant uppercase text-[10px]">Goal:</p>
                  <p className="text-on-surface text-sm">{activeDayDetail.goal}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveDayDetail(null)}
                className="rounded-xl bg-surface-container px-4 py-2 font-bold text-xs text-on-surface hover:bg-surface-high"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen attendance template for high-resolution PNG export */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={attendanceCardRef}
          style={{ width: "1080px", minHeight: "600px", fontFamily: "system-ui, -apple-system, sans-serif" }}
          className="bg-linear-to-b from-[#0B1329] via-[#0F172A] to-[#0B1329] text-white p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-emerald-400 text-xs font-black tracking-widest uppercase block">
                  ★ WE CONNECT INNOVATIVE SOLUTIONS ★
                </span>
                <h1 className="text-2xl font-black text-white mt-1">
                  {campaign?.client_name || campaign?.campaign_name || "Social Media Campaign"}
                </h1>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Daily Attendance &amp; Consistency Tracker
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black text-emerald-300">
                  📅 {formatDate(todayIso())}
                </span>
                <div className="mt-2 flex items-center justify-end gap-2 text-xs font-bold">
                  <span className="text-emerald-400">✅ {studentStats.reduce((sum, s) => sum + s.totalSubmitted, 0)} Done</span>
                  <span className="text-white/40">·</span>
                  <span className="text-rose-400">❌ {studentStats.reduce((sum, s) => sum + s.missedCount, 0)} Missed</span>
                </div>
              </div>
            </div>

            {/* Student Cards Grid */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {studentStats.map((stat) => (
                <div
                  key={stat.studentId}
                  className="rounded-xl border border-white/12 bg-white/5 p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-white text-xs truncate max-w-[190px]">
                        {stat.student?.full_name || "Student"}
                      </span>
                      {stat.winnerCount > 0 && (
                        <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[9px] font-black text-black shrink-0">
                          ⭐ {stat.winnerCount} won
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-white/60">Consistency:</span>
                      <span className="font-black text-white">{stat.percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full ${
                          stat.percent >= 80 ? "bg-emerald-500" : stat.percent >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] font-semibold">
                    <span className="text-emerald-400">✅ {stat.totalSubmitted} Done</span>
                    {stat.missedCount > 0 ? (
                      <span className="text-rose-400">❌ {stat.missedCount} Missed</span>
                    ) : (
                      <span className="text-emerald-400">0 Missed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span>&ldquo;Consistency transforms talent into results.&rdquo; 🚀</span>
            <span className="font-mono text-emerald-400 font-bold">weconnectinnovativesolutions.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
