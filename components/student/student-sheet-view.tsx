/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { type ToastState } from "@/components/toast";
import {
  submitDayLink,
  deleteMyDaySubmission,
} from "@/app/student/campaigns/actions";
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

function toUrl(val?: string | null) {
  if (!val) return "";
  const s = val.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
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
  const [quickDriveUrl, setQuickDriveUrl] = useState("");
  const [quickDocUrl, setQuickDocUrl] = useState("");
  const [quickPostUrl, setQuickPostUrl] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingDayId, setDeletingDayId] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<"cards" | "grid">("cards");

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

  // Active highlighted day for formula bar preview
  const activePromptDay = useMemo(() => {
    const today = todayIso();
    const todayMatch = displayedDays.find((d) => d.post_date === today);
    if (todayMatch) return todayMatch;
    return displayedDays[0] ?? null;
  }, [displayedDays]);

  async function handleSaveQuickLink(dayId: string) {
    if (!quickDriveUrl.trim() && !quickDocUrl.trim() && !quickPostUrl.trim()) {
      setToast({ type: "error", message: "Please enter at least one link (Google Drive link or Google Docs link)." });
      return;
    }
    setSaving(true);
    const res = await submitDayLink(dayId, {
      driveUrl: quickDriveUrl.trim() || null,
      docUrl: quickDocUrl.trim() || null,
      postUrl: quickPostUrl.trim() || null,
      note: quickNote.trim() || null,
    });
    setSaving(false);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not save your links." });
      return;
    }
    setQuickInputDayId(null);
    setQuickDriveUrl("");
    setQuickDocUrl("");
    setQuickPostUrl("");
    setQuickNote("");
    setToast({ type: "success", message: "Your links have been saved successfully!" });
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
    <div className="space-y-2.5">
      {/* GOOGLE SHEETS TOOLBAR & FORMULA BAR */}
      <div className="overflow-hidden rounded-2xl border border-[#dadce0] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/80 shadow-sm">
        {/* Spreadsheet Quick Actions Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dadce0] dark:border-zinc-800 px-3 py-2 bg-surface-lowest">
          {/* Assigned Collaborators in Google Sheet Presence Format */}
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F9D58]/10 text-[#0F9D58]">
              <Icon name="groups" className="text-sm" />
            </span>
            <span className="text-xs font-bold text-on-surface">Collaborators:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {members.map((m) => {
                const isMe = m.student_id === currentUserId;
                return (
                  <span
                    key={m.student_id}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isMe
                        ? "bg-[#0F9D58] text-white shadow-sm"
                        : "border border-outline-variant/60 bg-surface-low text-on-surface"
                    }`}
                  >
                    <Icon name="person" className="text-[10px]" />
                    {m.student?.full_name || "Student"} {isMe && "(You)"}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Mobile View Toggle */}
          <div className="md:hidden flex items-center gap-1 bg-surface-low rounded-lg p-0.5 border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setMobileMode("cards")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                mobileMode === "cards" ? "bg-surface-lowest text-[#0F9D58] shadow-sm" : "text-on-surface-variant"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setMobileMode("grid")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                mobileMode === "grid" ? "bg-surface-lowest text-[#0F9D58] shadow-sm" : "text-on-surface-variant"
              }`}
            >
              Sheet Grid
            </button>
          </div>
        </div>

        {/* Authentic Google Sheets Formula Bar (fx) */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-[#dadce0] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/90 font-mono">
          {/* Cell Coordinate Box */}
          <div className="flex items-center justify-center min-w-[54px] rounded border border-[#dadce0] dark:border-zinc-700 bg-surface-lowest px-2 py-0.5 text-[11px] font-bold text-on-surface shadow-xs">
            {activePromptDay ? `Day ${activePromptDay.day_number}` : "A1"}
          </div>

          {/* fx symbol */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 font-serif italic font-bold select-none">
            fx
          </div>

          <div className="h-4 w-px bg-outline-variant/60 shrink-0" />

          {/* Formula text / Active prompt info */}
          <div className="min-w-0 flex-1 truncate text-[11px] text-on-surface">
            <span className="text-[#0F9D58] font-bold font-mono">=CONTENT_PLAN(</span>
            <span className="text-blue-600 font-semibold">&quot;{campaign.client_name}&quot;</span>
            <span className="text-[#0F9D58] font-bold">)</span>
            {activePromptDay && (
              <span className="text-on-surface-variant font-sans ml-2">
                • <strong className="text-on-surface font-semibold">Active Prompt:</strong> {activePromptDay.theme || "Content Guideline"}
              </span>
            )}
          </div>
        </div>

        {/* Week Selector Tabs (Google Sheets Sheet Tabs Style) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto px-2.5 py-1.5 bg-[#f0f3f4] dark:bg-zinc-800/60 hide-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            {weekNumbers.map((wNum) => {
              const count = (weeks[wNum] ?? []).length;
              const startDay = (wNum - 1) * 7 + 1;
              const endDay = startDay + count - 1;
              const isSelected = activeWeekNumber === wNum;
              return (
                <button
                  key={wNum}
                  type="button"
                  onClick={() => setSelectedWeek(wNum)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "bg-surface-lowest text-[#0F9D58] border-b-2 border-[#0F9D58] shadow-sm font-black"
                      : "text-on-surface-variant hover:bg-surface-lowest/70 hover:text-on-surface"
                  }`}
                >
                  <Icon name="calendar_view_week" className="text-xs text-[#0F9D58]" />
                  <span>Week {wNum} (Days {startDay}–{endDay})</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedWeek("all")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                activeWeekNumber === "all"
                  ? "bg-surface-lowest text-[#0F9D58] border-b-2 border-[#0F9D58] shadow-sm font-black"
                  : "text-on-surface-variant hover:bg-surface-lowest/70 hover:text-on-surface"
              }`}
            >
              <Icon name="view_week" className="text-xs text-primary" />
              <span>All Days ({days.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-on-surface-variant shrink-0 hidden sm:block font-medium">
            Showing <strong className="text-on-surface font-black">{displayedDays.length}</strong> planned days
          </div>
        </div>
      </div>

      {/* MOBILE COMPACT CARDS VIEW (Only on mobile when cards mode active) */}
      {mobileMode === "cards" && (
        <div className="space-y-2.5 md:hidden">
          {displayedDays.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-6 text-center text-xs text-on-surface-variant">
              No days planned in this week yet.
            </div>
          ) : (
            displayedDays.map((day) => {
              const today = todayIso();
              const isToday = day.post_date === today;
              const dayData = submissionsByDay[day.id] || { mySubmission: null, peerSubmissions: [], winner: null };
              const mySub = dayData.mySubmission;
              const isMyWinner = mySub && (mySub.is_selected || mySub.status === "selected");
              const myLinks = extractSubmissionLinks(mySub);

              return (
                <div
                  key={day.id}
                  className={`rounded-2xl border bg-surface-lowest p-3.5 shadow-sm transition-all overflow-hidden ${
                    isToday
                      ? "border-[#0F9D58] ring-1 ring-[#0F9D58]/30"
                      : isMyWinner
                        ? "border-amber-300 dark:border-amber-700"
                        : "border-[#dadce0] dark:border-zinc-800"
                  }`}
                >
                  {/* Google Sheets Row Header Accent */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#dadce0]/60 dark:border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-md bg-[#0F9D58]/10 text-[#0F9D58] px-2 py-0.5 text-xs font-black">
                        Day #{day.day_number}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        {formatDate(day.post_date)}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-[#0F9D58] px-2 py-0.2 text-[9px] font-black text-white uppercase">
                          Today
                        </span>
                      )}
                    </div>

                    <div>
                      {isMyWinner ? (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                          ⭐ Winner Pick
                        </span>
                      ) : mySub ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ✅ Submitted
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Topic & Content Guideline */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-on-surface leading-snug">
                      {day.theme || "Topic not specified"}
                    </h4>
                    {day.caption && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-on-surface-variant">
                        {day.caption}
                      </p>
                    )}

                    {/* Quick Link Pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {day.source_link && (
                        <a
                          href={toUrl(day.source_link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        >
                          <Icon name="description" className="text-[12px]" /> Docs Brief ↗
                        </a>
                      )}
                      {day.research_note && (
                        <a
                          href={toUrl(day.research_note)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <Icon name="smart_toy" className="text-[12px]" /> ChatGPT ↗
                        </a>
                      )}
                      {day.image_headline && (
                        <a
                          href={toUrl(day.image_headline)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        >
                          <Icon name="folder_open" className="text-[12px]" /> Assets ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveDayDetail(day)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline ml-auto"
                      >
                        <Icon name="visibility" className="text-xs" /> Full Brief
                      </button>
                    </div>
                  </div>

                  {/* My Submission Action Box */}
                  <div className="mt-2.5 rounded-xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-2.5 border border-[#dadce0] dark:border-zinc-800">
                    {mySub ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                            My Submitted Links
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickInputDayId(day.id);
                                setQuickDriveUrl(myLinks.driveUrl || "");
                                setQuickDocUrl(myLinks.docUrl || "");
                                setQuickPostUrl(myLinks.postUrl || "");
                                setQuickNote(mySub.note || "");
                              }}
                              className="text-[10px] font-bold text-primary hover:underline"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingDayId === day.id}
                              onClick={() => handleDeleteMyLink(day.id)}
                              className="text-[10px] font-bold text-red-600 hover:underline"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {myLinks.driveUrl && (
                            <a
                              href={myLinks.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between rounded-lg bg-surface-lowest border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <span className="inline-flex items-center gap-1.5 truncate">
                                <Icon name="folder_shared" className="text-xs shrink-0 text-emerald-600" />
                                <span className="truncate">Google Drive Link</span>
                              </span>
                              <Icon name="open_in_new" className="text-xs shrink-0 ml-1 opacity-70" />
                            </a>
                          )}

                          {myLinks.docUrl && (
                            <a
                              href={myLinks.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between rounded-lg bg-surface-lowest border border-blue-200 dark:border-blue-800/60 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                            >
                              <span className="inline-flex items-center gap-1.5 truncate">
                                <Icon name="description" className="text-xs shrink-0 text-blue-600" />
                                <span className="truncate">Google Docs Link</span>
                              </span>
                              <Icon name="open_in_new" className="text-xs shrink-0 ml-1 opacity-70" />
                            </a>
                          )}

                          {myLinks.postUrl && (
                            <a
                              href={myLinks.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between rounded-lg bg-surface-lowest border border-purple-200 dark:border-purple-800/60 px-2.5 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline"
                            >
                              <span className="inline-flex items-center gap-1.5 truncate">
                                <Icon name="public" className="text-xs shrink-0 text-purple-600" />
                                <span className="truncate">Live Post Link</span>
                              </span>
                              <Icon name="open_in_new" className="text-xs shrink-0 ml-1 opacity-70" />
                            </a>
                          )}
                        </div>

                        {mySub.note && (
                          <p className="text-[11px] text-on-surface-variant italic">
                            Note: &ldquo;{mySub.note}&rdquo;
                          </p>
                        )}
                      </div>
                    ) : quickInputDayId === day.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-on-surface">Submit Your Work Links:</p>
                          <span className="text-[10px] text-on-surface-variant">Drive &amp; Docs</span>
                        </div>

                        <div>
                          <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface mb-0.5">
                            <Icon name="folder_shared" className="text-xs text-emerald-600" />
                            <span>Google Drive Link (Video / Files)</span>
                          </label>
                          <input
                            type="url"
                            value={quickDriveUrl}
                            onChange={(e) => setQuickDriveUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface mb-0.5">
                            <Icon name="description" className="text-xs text-blue-600" />
                            <span>Google Docs Link (Content / Script)</span>
                          </label>
                          <input
                            type="url"
                            value={quickDocUrl}
                            onChange={(e) => setQuickDocUrl(e.target.value)}
                            placeholder="https://docs.google.com/document/d/..."
                            className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant mb-0.5">
                            <Icon name="public" className="text-xs text-purple-600" />
                            <span>Live Post URL <span className="text-[9px] font-normal text-on-surface-variant/70">(Optional)</span></span>
                          </label>
                          <input
                            type="url"
                            value={quickPostUrl}
                            onChange={(e) => setQuickPostUrl(e.target.value)}
                            placeholder="https://facebook.com/... or instagram.com/..."
                            className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant mb-0.5">
                            Short Note <span className="text-[9px] font-normal text-on-surface-variant/70">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={quickNote}
                            onChange={(e) => setQuickNote(e.target.value)}
                            placeholder="Optional short note..."
                            className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSaveQuickLink(day.id)}
                            className="flex-1 rounded-lg bg-[#0F9D58] py-1.5 text-xs font-bold text-white hover:bg-[#0F9D58]/90"
                          >
                            {saving ? "Saving…" : "Save Links 💾"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickInputDayId(null);
                              setQuickDriveUrl("");
                              setQuickDocUrl("");
                              setQuickPostUrl("");
                              setQuickNote("");
                            }}
                            className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs text-on-surface-variant hover:bg-surface-low"
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
                          setQuickDriveUrl("");
                          setQuickDocUrl("");
                          setQuickPostUrl("");
                          setQuickNote("");
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#0F9D58]/60 bg-[#0F9D58]/10 py-2 text-xs font-bold text-[#0F9D58] hover:bg-[#0F9D58]/15 transition-colors"
                      >
                        <Icon name="add_link" className="text-sm" /> + Paste Drive &amp; Docs Links
                      </button>
                    )}
                  </div>

                  {/* Official Winner Announcement */}
                  {dayData.winner && (
                    <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 dark:border-amber-800 dark:bg-amber-950/40">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-800 dark:text-amber-300">
                          <Icon name="emoji_events" className="text-sm text-amber-500" /> Official Day Winner ⭐
                        </span>
                        <span className="font-bold text-xs text-on-surface">
                          {dayData.winner.student?.full_name || "Student"}
                        </span>
                      </div>
                      {(dayData.winner.video_url || dayData.winner.doc_url || dayData.winner.post_url) && (
                        <div className="mt-1.5 pt-1 border-t border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">Benchmark post:</span>
                          <a
                            href={toUrl(dayData.winner.video_url || dayData.winner.doc_url || dayData.winner.post_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-sm hover:bg-amber-600 transition"
                          >
                            <Icon name="visibility" className="text-xs" /> View Winning Post ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Peer submissions */}
                  {dayData.peerSubmissions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-[10px] text-on-surface-variant font-medium">Teammates&apos; work:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {dayData.peerSubmissions.slice(0, 3).map((p) => {
                          const pLink = p.video_url || p.doc_url || p.post_url;
                          return pLink ? (
                            <a
                              key={p.id}
                              href={pLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:underline"
                            >
                              {p.student?.full_name?.split(" ")[0] || "Teammate"} ↗
                            </a>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* DESKTOP & SCROLLABLE GOOGLE SPREADSHEET TABLE */}
      <div className={`overflow-hidden rounded-2xl border border-[#dadce0] dark:border-zinc-800 bg-surface-lowest shadow-sm ${
        mobileMode === "grid" ? "block" : "hidden md:block"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* GOOGLE SHEETS COLUMN LETTERS (A, B, C, D, E) */}
            <thead>
              <tr className="border-b border-[#dadce0] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] select-none">
                {/* Classic Google Sheets Corner Triangle Button */}
                <th className="w-12 p-2 text-center font-bold sticky left-0 bg-[#f8f9fa] dark:bg-zinc-900 z-20 border-r border-[#dadce0] dark:border-zinc-800 text-zinc-400">
                  ◢
                </th>
                <th className="w-28 p-2 font-bold border-r border-[#dadce0] dark:border-zinc-800">
                  <span className="block text-center font-bold text-zinc-500">A</span>
                  <span className="block font-sans text-xs font-bold text-on-surface">Day &amp; Date</span>
                </th>
                <th className="min-w-[220px] max-w-[280px] p-2 font-bold border-r border-[#dadce0] dark:border-zinc-800">
                  <span className="block text-center font-bold text-zinc-500">B</span>
                  <span className="block font-sans text-xs font-bold text-on-surface">Topic &amp; Content Guidelines</span>
                </th>
                <th className="min-w-[260px] max-w-[320px] p-2 font-bold border-r border-[#dadce0] dark:border-zinc-800 bg-[#0F9D58]/5 text-[#0F9D58]">
                  <span className="block text-center font-bold text-[#0F9D58]">C</span>
                  <span className="block font-sans text-xs font-bold text-[#0F9D58]">My Submission Link ✏️</span>
                </th>
                <th className="min-w-[220px] max-w-[280px] p-2 font-bold border-r border-[#dadce0] dark:border-zinc-800">
                  <span className="block text-center font-bold text-zinc-500">D</span>
                  <span className="block font-sans text-xs font-bold text-on-surface">Teammates&apos; Work 👀</span>
                </th>
                <th className="min-w-[180px] p-2 font-bold bg-amber-500/5 text-amber-700 dark:text-amber-300">
                  <span className="block text-center font-bold text-amber-600">E</span>
                  <span className="block font-sans text-xs font-bold text-amber-800 dark:text-amber-300">Official Day Winner ⭐</span>
                </th>
              </tr>
            </thead>

            {/* SPREADSHEET ROWS */}
            <tbody className="divide-y divide-[#dadce0]/70 dark:divide-zinc-800">
              {displayedDays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant font-medium">
                    No days planned in this week yet.
                  </td>
                </tr>
              ) : (
                displayedDays.map((day, rowIndex) => {
                  const today = todayIso();
                  const isToday = day.post_date === today;
                  const dayData = submissionsByDay[day.id] || { mySubmission: null, peerSubmissions: [], winner: null };
                  const mySub = dayData.mySubmission;
                  const isMyWinner = mySub && (mySub.is_selected || mySub.status === "selected");
                  const myLinks = extractSubmissionLinks(mySub);

                  return (
                    <tr
                      key={day.id}
                      className={`transition-colors hover:bg-[#f8fafd] dark:hover:bg-zinc-800/40 group ${
                        isToday ? "bg-[#0F9D58]/5" : ""
                      }`}
                    >
                      {/* ROW NUMBER (Like Google Sheets Row 1, 2, 3...) */}
                      <td className="p-2 text-center align-top font-mono text-[11px] font-bold text-zinc-500 sticky left-0 bg-[#f8f9fa] dark:bg-zinc-900 z-10 border-r border-[#dadce0] dark:border-zinc-800 select-none">
                        {rowIndex + 1}
                      </td>

                      {/* COLUMN A: Day # & Date */}
                      <td className="p-2.5 align-top font-bold text-on-surface border-r border-[#dadce0] dark:border-zinc-800">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 font-bold text-xs text-on-surface">
                            Day #{day.day_number}
                            {isToday && (
                              <span className="rounded-full bg-[#0F9D58] px-1.5 py-0.2 text-[9px] font-black text-white uppercase">
                                Today
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-normal text-on-surface-variant mt-0.5">
                            {formatDate(day.post_date)}
                          </span>
                        </div>
                      </td>

                      {/* COLUMN B: Topic & Content Guidelines */}
                      <td className="p-2.5 align-top border-r border-[#dadce0] dark:border-zinc-800">
                        <div className="space-y-1.5">
                          <p className="font-bold text-xs text-on-surface leading-snug">
                            {day.theme || "Topic not specified"}
                          </p>

                          {day.caption && (
                            <p className="line-clamp-2 text-[11px] text-on-surface-variant leading-relaxed">
                              {day.caption}
                            </p>
                          )}

                          {/* Quick clickable chips */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {day.source_link && (
                              <a
                                href={toUrl(day.source_link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 hover:underline dark:bg-blue-950 dark:text-blue-300"
                                title="Open Google Docs Brief"
                              >
                                <Icon name="description" className="text-[12px]" /> Docs Brief ↗
                              </a>
                            )}
                            {day.research_note && (
                              <a
                                href={toUrl(day.research_note)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:underline dark:bg-emerald-950 dark:text-emerald-300"
                                title="Open ChatGPT Script / Chat"
                              >
                                <Icon name="smart_toy" className="text-[12px]" /> ChatGPT ↗
                              </a>
                            )}
                            {day.image_headline && (
                              <a
                                href={toUrl(day.image_headline)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:underline dark:bg-amber-950 dark:text-amber-300"
                                title="Open Drive Assets"
                              >
                                <Icon name="folder_open" className="text-[12px]" /> Assets ↗
                              </a>
                            )}
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => setActiveDayDetail(day)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                            >
                              <Icon name="visibility" className="text-xs" /> View Full Details
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* COLUMN C: MY SUBMISSION LINKS (Drive, Docs, Post) */}
                      <td
                        className={`p-2.5 align-top border-r border-[#dadce0] dark:border-zinc-800 transition-colors ${
                          isMyWinner ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-[#0F9D58]/5"
                        }`}
                      >
                        {mySub ? (
                          <div className="space-y-1.5 min-w-[210px]">
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

                              {/* Student can delete their own link */}
                              <button
                                type="button"
                                disabled={deletingDayId === day.id}
                                onClick={() => handleDeleteMyLink(day.id)}
                                title="Delete my submitted links"
                                className="inline-flex items-center gap-0.5 text-xs text-on-surface-variant hover:text-red-600 p-0.5"
                              >
                                <Icon name="delete" className="text-xs" />
                                <span className="text-[10px]">Delete</span>
                              </button>
                            </div>

                            {/* Render All Attached Submission Links */}
                            <div className="space-y-1">
                              {myLinks.driveUrl && (
                                <a
                                  href={myLinks.driveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 max-w-[240px] truncate text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline rounded-lg bg-surface-lowest border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1.5 shadow-xs"
                                  title={myLinks.driveUrl}
                                >
                                  <Icon name="folder_shared" className="text-xs shrink-0 text-emerald-600" />
                                  <span className="truncate">Google Drive Link</span>
                                  <Icon name="open_in_new" className="text-[10px] shrink-0 ml-auto opacity-70" />
                                </a>
                              )}

                              {myLinks.docUrl && (
                                <a
                                  href={myLinks.docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 max-w-[240px] truncate text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline rounded-lg bg-surface-lowest border border-blue-200 dark:border-blue-800/60 px-2.5 py-1.5 shadow-xs"
                                  title={myLinks.docUrl}
                                >
                                  <Icon name="description" className="text-xs shrink-0 text-blue-600" />
                                  <span className="truncate">Google Docs Link</span>
                                  <Icon name="open_in_new" className="text-[10px] shrink-0 ml-auto opacity-70" />
                                </a>
                              )}

                              {myLinks.postUrl && (
                                <a
                                  href={myLinks.postUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 max-w-[240px] truncate text-[11px] font-bold text-purple-700 dark:text-purple-400 hover:underline rounded-lg bg-surface-lowest border border-purple-200 dark:border-purple-800/60 px-2.5 py-1.5 shadow-xs"
                                  title={myLinks.postUrl}
                                >
                                  <Icon name="public" className="text-xs shrink-0 text-purple-600" />
                                  <span className="truncate">Live Post Link</span>
                                  <Icon name="open_in_new" className="text-[10px] shrink-0 ml-auto opacity-70" />
                                </a>
                              )}
                            </div>

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
                                  setQuickDriveUrl(myLinks.driveUrl || "");
                                  setQuickDocUrl(myLinks.docUrl || "");
                                  setQuickPostUrl(myLinks.postUrl || "");
                                  setQuickNote(mySub.note || "");
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-[#0F9D58] hover:underline font-bold"
                              >
                                <Icon name="edit" className="text-[11px]" /> Edit Links
                              </button>
                            </div>
                          </div>
                        ) : quickInputDayId === day.id ? (
                          <div className="space-y-2 rounded-xl border border-[#0F9D58]/60 bg-surface-lowest p-2.5 shadow-sm min-w-[240px]">
                            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/40">
                              <p className="text-[11px] font-black text-on-surface flex items-center gap-1">
                                <Icon name="link" className="text-xs text-[#0F9D58]" /> Submit Links:
                              </p>
                              <span className="text-[10px] text-on-surface-variant font-medium">Drive &amp; Docs</span>
                            </div>

                            {/* 1. Google Drive Link */}
                            <div>
                              <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface mb-0.5">
                                <Icon name="folder_shared" className="text-xs text-emerald-600" />
                                <span>Google Drive Link (Video / Files)</span>
                              </label>
                              <input
                                type="url"
                                value={quickDriveUrl}
                                onChange={(e) => setQuickDriveUrl(e.target.value)}
                                placeholder="https://drive.google.com/file/d/..."
                                className="w-full rounded-lg border border-[#dadce0] bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                                autoFocus
                              />
                            </div>

                            {/* 2. Google Docs Link */}
                            <div>
                              <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface mb-0.5">
                                <Icon name="description" className="text-xs text-blue-600" />
                                <span>Google Docs Link (Content / Script)</span>
                              </label>
                              <input
                                type="url"
                                value={quickDocUrl}
                                onChange={(e) => setQuickDocUrl(e.target.value)}
                                placeholder="https://docs.google.com/document/d/..."
                                className="w-full rounded-lg border border-[#dadce0] bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                              />
                            </div>

                            {/* 3. Live Post URL (optional) */}
                            <div>
                              <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant mb-0.5">
                                <Icon name="public" className="text-xs text-purple-600" />
                                <span>Live Post URL <span className="text-[9px] font-normal text-on-surface-variant/70">(Optional)</span></span>
                              </label>
                              <input
                                type="url"
                                value={quickPostUrl}
                                onChange={(e) => setQuickPostUrl(e.target.value)}
                                placeholder="https://facebook.com/... or instagram.com/..."
                                className="w-full rounded-lg border border-[#dadce0] bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                              />
                            </div>

                            {/* 4. Short Note (optional) */}
                            <div>
                              <label className="block text-[10px] font-bold text-on-surface-variant mb-0.5">
                                Short Note <span className="text-[9px] font-normal text-on-surface-variant/70">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                value={quickNote}
                                onChange={(e) => setQuickNote(e.target.value)}
                                placeholder="Optional short note..."
                                className="w-full rounded-lg border border-[#dadce0] bg-surface-lowest p-1.5 text-xs text-on-surface outline-none focus:border-[#0F9D58]"
                              />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-1 pt-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSaveQuickLink(day.id)}
                                className="flex-1 rounded-lg bg-[#0F9D58] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0F9D58]/90 shadow-xs flex items-center justify-center gap-1"
                              >
                                <Icon name="save" className="text-xs" />
                                <span>{saving ? "Saving…" : "Save Links 💾"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickInputDayId(null);
                                  setQuickDriveUrl("");
                                  setQuickDocUrl("");
                                  setQuickPostUrl("");
                                  setQuickNote("");
                                }}
                                className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs text-on-surface-variant hover:bg-surface-low"
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
                              setQuickDriveUrl("");
                              setQuickDocUrl("");
                              setQuickPostUrl("");
                              setQuickNote("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#0F9D58]/60 bg-[#0F9D58]/5 px-3 py-2 text-xs font-bold text-[#0F9D58] hover:bg-[#0F9D58]/10 transition-colors"
                          >
                            <Icon name="add_link" className="text-sm" /> + Paste Drive &amp; Docs Links
                          </button>
                        )}
                      </td>

                      {/* COLUMN D: TEAMMATES' WORK (READ-ONLY) */}
                      <td className="p-2.5 align-top border-r border-[#dadce0] dark:border-zinc-800">
                        {dayData.peerSubmissions.length === 0 ? (
                          <span className="text-[11px] text-on-surface-variant/70 italic">
                            No peer submissions yet
                          </span>
                        ) : (
                          <div className="space-y-1.5 min-w-[180px]">
                            {dayData.peerSubmissions.map((peerSub) => {
                              const peerLinks = extractSubmissionLinks(peerSub);
                              const isPeerWinner = peerSub.is_selected || peerSub.status === "selected";

                              return (
                                <div
                                  key={peerSub.id}
                                  className={`rounded-lg border p-1.5 text-xs space-y-1 ${
                                    isPeerWinner
                                      ? "border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30"
                                      : "border-[#dadce0]/70 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-800/40"
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

                                  <div className="flex flex-col gap-1 pt-0.5">
                                    {peerLinks.driveUrl && (
                                      <a
                                        href={peerLinks.driveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                                      >
                                        <Icon name="folder_shared" className="text-[11px] text-emerald-600" />
                                        <span>Drive Video / Files ↗</span>
                                      </a>
                                    )}
                                    {peerLinks.docUrl && (
                                      <a
                                        href={peerLinks.docUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline"
                                      >
                                        <Icon name="description" className="text-[11px] text-blue-600" />
                                        <span>Docs Brief / Content ↗</span>
                                      </a>
                                    )}
                                    {peerLinks.postUrl && (
                                      <a
                                        href={peerLinks.postUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-400 hover:underline"
                                      >
                                        <Icon name="public" className="text-[11px] text-purple-600" />
                                        <span>Live Post ↗</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* COLUMN E: OFFICIAL WINNER BEST PICK */}
                      <td className="p-2.5 align-top bg-amber-500/5">
                        {dayData.winner ? (
                          (() => {
                            const winnerLinks = extractSubmissionLinks(dayData.winner);
                            return (
                              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 dark:border-amber-800 dark:bg-amber-950/40 space-y-1.5 min-w-[180px]">
                                <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                  <Icon name="emoji_events" className="text-sm text-amber-500" /> Day Winner ⭐
                                </p>
                                <p className="font-bold text-xs text-on-surface truncate">
                                  {dayData.winner.student?.full_name || "Student"}
                                </p>
                                <div className="flex flex-col gap-1">
                                  {winnerLinks.driveUrl && (
                                    <a
                                      href={winnerLinks.driveUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-sm hover:bg-amber-600 transition"
                                    >
                                      <Icon name="folder_shared" className="text-xs" /> Drive Video ↗
                                    </a>
                                  )}
                                  {winnerLinks.docUrl && (
                                    <a
                                      href={winnerLinks.docUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-sm hover:bg-blue-700 transition"
                                    >
                                      <Icon name="description" className="text-xs" /> Docs Content ↗
                                    </a>
                                  )}
                                  {winnerLinks.postUrl && (
                                    <a
                                      href={winnerLinks.postUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded bg-purple-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-sm hover:bg-purple-700 transition"
                                    >
                                      <Icon name="public" className="text-xs" /> Live Post ↗
                                    </a>
                                  )}
                                </div>
                                <p className="text-[10px] text-on-surface-variant">
                                  Benchmark post — follow this style!
                                </p>
                              </div>
                            );
                          })()
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
                <span className="rounded-lg bg-[#0F9D58]/10 px-2.5 py-1 text-xs font-black text-[#0F9D58]">
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

            {/* Prominent Reference Links */}
            {(activeDayDetail.source_link || activeDayDetail.research_note || activeDayDetail.image_headline) && (
              <div className="space-y-2 rounded-2xl border border-[#0F9D58]/20 bg-[#0F9D58]/5 p-4">
                <p className="text-xs font-black text-[#0F9D58] flex items-center gap-1.5">
                  <Icon name="link" className="text-base" /> Shared Reference Links &amp; Guides:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeDayDetail.source_link && (
                    <a
                      href={toUrl(activeDayDetail.source_link)}
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

                  {activeDayDetail.research_note && (
                    <a
                      href={toUrl(activeDayDetail.research_note)}
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

                  {activeDayDetail.image_headline && (
                    <a
                      href={toUrl(activeDayDetail.image_headline)}
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