/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { type ToastState } from "@/components/toast";
import {
  submitDayLink,
  deleteMyDaySubmission,
} from "@/app/student/campaigns/actions";

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

export function StudentSheetView({
  campaign,
  days,
  submissions,
  members,
  currentUserId,
  onReload,
  setToast,
}: {
  campaign: Row;
  days: Row[];
  submissions: Row[];
  members: Row[];
  currentUserId: string;
  onReload: () => Promise<void>;
  setToast: (toast: ToastState) => void;
}) {
  const [selectedWeek, setSelectedWeek] = useState<number | "all">(1);
  const [activeDayDetail, setActiveDayDetail] = useState<Row | null>(null);
  const [quickInputDayId, setQuickInputDayId] = useState<string | null>(null);
  const [quickUrl, setQuickUrl] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingDayId, setDeletingDayId] = useState<string | null>(null);

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

  // Set default week to week 1 or first available
  const activeWeekNumber = useMemo(() => {
    if (selectedWeek === "all") return "all";
    if (weeks[selectedWeek]) return selectedWeek;
    return weekNumbers[0] ?? "all";
  }, [selectedWeek, weeks, weekNumbers]);

  const displayedDays = useMemo(() => {
    if (activeWeekNumber === "all") return days;
    return weeks[activeWeekNumber] ?? [];
  }, [activeWeekNumber, days, weeks]);

  // Teammates excluding current user
  const otherMembers = useMemo(() => {
    return members.filter((m) => m.student_id !== currentUserId);
  }, [members, currentUserId]);

  // Map of submissions by day_id
  const submissionsByDay = useMemo(() => {
    const map: Record<string, { mySubmission: Row | null; peerSubmissions: Row[]; winner: Row | null }> = {};
    for (const day of days) {
      const daySubs = submissions.filter((s) => s.day_id === day.id);
      const mySub = daySubs.find((s) => s.student_id === currentUserId) ?? null;
      const peers = daySubs.filter((s) => s.student_id !== currentUserId);
      const winner = daySubs.find((s) => s.is_selected || s.status === "selected") ?? null;
      map[day.id] = { mySubmission: mySub, peerSubmissions: peers, winner };
    }
    return map;
  }, [days, submissions, currentUserId]);

  async function handleSaveQuickLink(dayId: string) {
    if (!quickUrl.trim()) {
      setToast({ type: "error", message: "Please paste your Google Drive or Docs link." });
      return;
    }
    setSaving(true);
    const res = await submitDayLink(dayId, quickUrl.trim(), quickNote.trim());
    setSaving(false);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not save your link." });
      return;
    }
    setQuickInputDayId(null);
    setQuickUrl("");
    setQuickNote("");
    setToast({ type: "success", message: "Your link has been submitted successfully!" });
    void onReload();
  }

  async function handleDeleteMyLink(dayId: string) {
    if (!confirm("Are you sure you want to remove your submitted link? You can paste an updated link afterwards.")) {
      return;
    }
    setDeletingDayId(dayId);
    const res = await deleteMyDaySubmission(dayId);
    setDeletingDayId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not delete link." });
      return;
    }
    setToast({ type: "success", message: "Your link has been deleted." });
    void onReload();
  }

  return (
    <div className="space-y-4">
      {/* 1. Page Teammates Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="groups" className="text-base" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Assigned Page Collaborators</h3>
              <p className="text-[11px] text-on-surface-variant">
                You and your teammates are allotted to this page. Upload your video/docs to your Drive and paste your link below.
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-primary">
            {members.length} {members.length === 1 ? "Student Team" : "Students Team"}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {members.map((m) => {
            const isMe = m.student_id === currentUserId;
            return (
              <span
                key={m.student_id}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  isMe
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant bg-surface-low text-on-surface"
                }`}
              >
                <Icon name="person" className="text-xs" />
                {m.student?.full_name || "Student"} {isMe && "(You)"}
              </span>
            );
          })}
        </div>
      </div>

      {/* 2. Week Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {weekNumbers.map((wNum) => {
            const count = (weeks[wNum] ?? []).length;
            const startDay = (wNum - 1) * 7 + 1;
            const endDay = startDay + count - 1;
            return (
              <button
                key={wNum}
                type="button"
                onClick={() => setSelectedWeek(wNum)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  activeWeekNumber === wNum
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant bg-surface-lowest text-on-surface-variant hover:text-primary hover:bg-surface-low"
                }`}
              >
                Week {String(wNum).padStart(2, "0")} (Days {startDay}–{endDay})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedWeek("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeWeekNumber === "all"
                ? "bg-primary text-on-primary shadow-sm"
                : "border border-outline-variant bg-surface-lowest text-on-surface-variant hover:text-primary hover:bg-surface-low"
            }`}
          >
            All Weeks ({days.length} Days)
          </button>
        </div>

        <div className="text-xs text-on-surface-variant">
          Showing <span className="font-bold text-on-surface">{displayedDays.length}</span> planned days
        </div>
      </div>

      {/* 3. Google Sheet Interactive Table */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-low text-on-surface-variant">
                <th className="w-24 p-3 font-bold sticky left-0 bg-surface-low z-10 border-r border-outline-variant/60">
                  Day # / Date
                </th>
                <th className="min-w-[200px] max-w-[260px] p-3 font-bold border-r border-outline-variant/60">
                  Topic & Content Guideline
                </th>
                <th className="min-w-[260px] max-w-[320px] p-3 font-bold border-r border-outline-variant/60 bg-primary/5 text-primary">
                  My Submission (Your Link) ✏️
                </th>
                <th className="min-w-[240px] max-w-[300px] p-3 font-bold border-r border-outline-variant/60">
                  Teammates&apos; Work (View &amp; Learn) 👀
                </th>
                <th className="min-w-[160px] p-3 font-bold">
                  Winning Best Pick ⭐
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {displayedDays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    No days planned in this week yet.
                  </td>
                </tr>
              ) : (
                displayedDays.map((day) => {
                  const today = todayIso();
                  const isToday = day.post_date === today;
                  const dayData = submissionsByDay[day.id] || { mySubmission: null, peerSubmissions: [], winner: null };
                  const mySub = dayData.mySubmission;
                  const isMyWinner = mySub && (mySub.is_selected || mySub.status === "selected");
                  const activeMyLink = mySub?.video_url || mySub?.doc_url || mySub?.post_url;

                  return (
                    <tr
                      key={day.id}
                      className={`transition-colors hover:bg-surface-low/30 ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Day # & Date */}
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

                      {/* Topic & Content Guideline */}
                      <td className="p-3 align-top border-r border-outline-variant/60">
                        <div className="space-y-1.5">
                          <p className="font-bold text-on-surface leading-snug">
                            {day.theme || "Topic not specified"}
                          </p>

                          {day.caption && (
                            <p className="line-clamp-2 text-[11px] text-on-surface-variant">
                              {day.caption}
                            </p>
                          )}

                          {/* Quick clickable links shared by Teacher/Admin */}
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

                      {/* MY SUBMISSION COLUMN */}
                      <td
                        className={`p-3 align-top border-r border-outline-variant/60 transition-colors ${
                          isMyWinner ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-primary/5"
                        }`}
                      >
                        {mySub ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  isMyWinner
                                    ? "bg-amber-500 text-white"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}
                              >
                                {isMyWinner ? "🏆 Winner Best Pick ⭐" : "✅ Submitted"}
                              </span>

                              {/* Student can delete ONLY their own link */}
                              <button
                                type="button"
                                disabled={deletingDayId === day.id}
                                onClick={() => handleDeleteMyLink(day.id)}
                                title="Delete my submitted link"
                                className="inline-flex items-center gap-0.5 text-xs text-on-surface-variant hover:text-red-600 p-0.5"
                              >
                                <Icon name="delete" className="text-xs" />
                                <span className="text-[10px]">Delete</span>
                              </button>
                            </div>

                            {activeMyLink && (
                              <a
                                href={activeMyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 max-w-[240px] truncate text-[11px] font-bold text-primary hover:underline rounded bg-surface-lowest border border-outline-variant/60 px-2.5 py-1.5"
                              >
                                <Icon name="open_in_new" className="text-xs shrink-0" />
                                <span className="truncate">
                                  {activeMyLink.includes("drive.google.com")
                                    ? "My Google Drive Video"
                                    : activeMyLink.includes("docs.google.com")
                                      ? "My Google Docs"
                                      : "Open My Link"}
                                </span>
                              </a>
                            )}

                            {mySub.note && (
                              <p className="line-clamp-2 text-[10px] text-on-surface-variant italic">
                                Note: &ldquo;{mySub.note}&rdquo;
                              </p>
                            )}

                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickInputDayId(day.id);
                                  setQuickUrl(activeMyLink || "");
                                  setQuickNote(mySub.note || "");
                                }}
                                className="text-[10px] text-primary hover:underline font-semibold"
                              >
                                ✏️ Change link
                              </button>
                            </div>
                          </div>
                        ) : quickInputDayId === day.id ? (
                          <div className="space-y-1.5 rounded-xl border border-primary/40 bg-surface-lowest p-2.5 shadow-sm">
                            <p className="text-[10px] font-bold text-on-surface">Paste your work link:</p>
                            <input
                              type="url"
                              value={quickUrl}
                              onChange={(e) => setQuickUrl(e.target.value)}
                              placeholder="Google Drive or Docs link..."
                              className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-primary"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={quickNote}
                              onChange={(e) => setQuickNote(e.target.value)}
                              placeholder="Optional short note..."
                              className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-primary"
                            />
                            <div className="flex items-center gap-1 pt-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSaveQuickLink(day.id)}
                                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-on-primary hover:bg-primary/90"
                              >
                                {saving ? "Saving…" : "Save Link 💾"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickInputDayId(null);
                                  setQuickUrl("");
                                  setQuickNote("");
                                }}
                                className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant hover:bg-surface-low"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickInputDayId(day.id);
                              setQuickUrl("");
                              setQuickNote("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/60 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Icon name="add_link" className="text-sm" /> + Paste Drive / Docs Link
                          </button>
                        )}
                      </td>

                      {/* TEAMMATES' WORK (READ-ONLY) */}
                      <td className="p-3 align-top border-r border-outline-variant/60">
                        {dayData.peerSubmissions.length === 0 ? (
                          <span className="text-[11px] text-on-surface-variant/70 italic">
                            No peer submissions yet
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {dayData.peerSubmissions.map((peerSub) => {
                              const peerLink = peerSub.video_url || peerSub.doc_url || peerSub.post_url;
                              const isPeerWinner = peerSub.is_selected || peerSub.status === "selected";

                              return (
                                <div
                                  key={peerSub.id}
                                  className={`rounded-lg border p-2 text-xs space-y-1 ${
                                    isPeerWinner
                                      ? "border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30"
                                      : "border-outline-variant/60 bg-surface-low/50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-[11px] text-on-surface truncate">
                                      {peerSub.student?.full_name || "Teammate"}
                                    </span>
                                    {isPeerWinner && (
                                      <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                                        ⭐ Best Pick
                                      </span>
                                    )}
                                  </div>

                                  {peerLink && (
                                    <a
                                      href={peerLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                    >
                                      <Icon name="visibility" className="text-xs" /> View Submission ↗
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* WINNING BEST PICK COLUMN */}
                      <td className="p-3 align-top">
                        {dayData.winner ? (
                          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-2 dark:border-amber-800 dark:bg-amber-950/40">
                            <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Icon name="emoji_events" className="text-xs" /> Winner
                            </p>
                            <p className="mt-0.5 font-bold text-xs text-on-surface truncate">
                              {dayData.winner.student?.full_name || "Student"}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              Benchmark post — follow this style!
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/70 italic">
                            Pending review
                          </span>
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

            {/* Prominent Shared Reference Links from Teacher / Admin */}
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
                  <p className="font-bold text-on-surface-variant uppercase text-[10px]">Note / Instructions:</p>
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
    </div>
  );
}
