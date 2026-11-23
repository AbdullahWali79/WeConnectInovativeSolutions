/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useRef } from "react";
import { Icon } from "@/components/icon";
import { type ToastState } from "@/components/toast";
import { toPng } from "html-to-image";
import {
  type DailySubmissionsData,
  toggleWinnerSubmission,
} from "@/app/admin/social-media-campaigns/actions";
import { extractSubmissionLinks } from "@/lib/proof-links";

function todayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(isoDate: string, deltaDays: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + deltaDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanPhoneForWhatsapp(phone?: string | null) {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = "92" + digits;
  }
  return digits;
}

function formatDate(isoDate: string) {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(isoDateTime?: string | null) {
  if (!isoDateTime) return "";
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function DailySubmissionsReport({
  data,
  role,
  onReload,
  onOpenCampaign,
  setToast,
}: {
  data: DailySubmissionsData;
  role: string;
  onReload: () => Promise<void>;
  onOpenCampaign: (campaignId: string) => void;
  setToast: (toast: ToastState) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [activeView, setActiveView] = useState<"glance" | "daily" | "leaderboard">("glance");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "pending">("all");
  const [campaignDayOverrides, setCampaignDayOverrides] = useState<Record<string, string>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [busySubId, setBusySubId] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportTargetCampaignId, setExportTargetCampaignId] = useState<string>("all");

  const dailyCardRef = useRef<HTMLDivElement>(null);
  const leaderboardCardRef = useRef<HTMLDivElement>(null);

  const { campaigns, days, members, submissions } = data;

  // Submissions map: key = `${day_id}_${student_id}`
  const submissionsMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const sub of submissions) {
      const key = `${sub.day_id}_${sub.student_id}`;
      map[key] = sub;
    }
    return map;
  }, [submissions]);

  // Filter campaigns by dropdown
  const filteredCampaigns = useMemo(() => {
    if (selectedCampaignId === "all") return campaigns;
    return campaigns.filter((c) => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  // For each campaign, compute the day for selectedDate
  const campaignDayReports = useMemo(() => {
    return filteredCampaigns.map((camp) => {
      // 1. User manual override for this campaign
      const manualDayId = campaignDayOverrides[camp.id];
      let targetDay = manualDayId ? days.find((d) => d.id === manualDayId) : null;

      // 2. Find day with post_date matching selectedDate
      if (!targetDay) {
        targetDay = days.find(
          (d) => d.campaign_id === camp.id && d.post_date === selectedDate
        );
      }

      // 3. Find if any day received submissions on selectedDate
      if (!targetDay) {
        const subOnDate = submissions.find(
          (s) =>
            s.campaign_id === camp.id &&
            (s.created_at?.slice(0, 10) === selectedDate || s.updated_at?.slice(0, 10) === selectedDate)
        );
        if (subOnDate) {
          targetDay = days.find((d) => d.id === subOnDate.day_id);
        }
      }

      // 4. Find day with status active or in_progress
      if (!targetDay) {
        targetDay = days.find(
          (d) => d.campaign_id === camp.id && (d.status === "active" || d.status === "in_progress")
        );
      }

      // 5. Fallback: latest day with post_date <= selectedDate, or first day
      if (!targetDay) {
        const pastDays = days
          .filter((d) => d.campaign_id === camp.id && d.post_date && d.post_date <= selectedDate)
          .sort((a, b) => b.day_number - a.day_number);
        targetDay =
          pastDays[0] ||
          days.filter((d) => d.campaign_id === camp.id).sort((a, b) => a.day_number - b.day_number)[0];
      }

      // Members allotted to this campaign
      const campMembers = members.filter(
        (m) => m.campaign_id === camp.id && m.status === "active"
      );

      // Submissions for this day / date
      const daySubmissions: any[] = [];
      const pendingMembers: any[] = [];

      for (const m of campMembers) {
        const student = m.student;
        if (!student) continue;

        let sub = targetDay ? submissionsMap[`${targetDay.id}_${m.student_id}`] : null;

        // Also check if student made a submission in this campaign on selectedDate
        if (!sub) {
          sub = submissions.find(
            (s) =>
              s.campaign_id === camp.id &&
              s.student_id === m.student_id &&
              (s.created_at?.slice(0, 10) === selectedDate || s.updated_at?.slice(0, 10) === selectedDate)
          );
        }

        if (sub) {
          const subDay = days.find((d) => d.id === sub.day_id) || targetDay;
          daySubmissions.push({
            member: m,
            student,
            submission: sub,
            day: subDay,
            links: extractSubmissionLinks(sub),
          });
        } else {
          pendingMembers.push({
            member: m,
            student,
            campaign: camp,
            day: targetDay,
          });
        }
      }

      const totalMembers = campMembers.length;
      const submittedCount = daySubmissions.length;
      const rate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

      return {
        campaign: camp,
        day: targetDay,
        campMembers,
        daySubmissions,
        pendingMembers,
        totalMembers,
        submittedCount,
        rate,
      };
    });
  }, [filteredCampaigns, days, selectedDate, members, submissionsMap, submissions, campaignDayOverrides]);

  // Combined all submitted today across campaigns
  const allSubmittedToday = useMemo(() => {
    const list: any[] = [];
    for (const r of campaignDayReports) {
      for (const item of r.daySubmissions) {
        list.push({
          ...item,
          campaign: r.campaign,
        });
      }
    }
    return list;
  }, [campaignDayReports]);

  // Combined all pending today across campaigns
  const allPendingToday = useMemo(() => {
    const list: any[] = [];
    for (const r of campaignDayReports) {
      for (const item of r.pendingMembers) {
        list.push({
          ...item,
          campaign: r.campaign,
        });
      }
    }
    return list;
  }, [campaignDayReports]);

  // Search filtered submitted
  const filteredSubmittedToday = useMemo(() => {
    if (!studentSearch.trim()) return allSubmittedToday;
    const q = studentSearch.toLowerCase();
    return allSubmittedToday.filter((item) => {
      const name = item.student?.full_name?.toLowerCase() || "";
      const email = item.student?.email?.toLowerCase() || "";
      const phone = item.student?.phone || "";
      const camp = (item.campaign?.client_name || item.campaign?.campaign_name || "").toLowerCase();
      const topic = (item.day?.topic || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || camp.includes(q) || topic.includes(q);
    });
  }, [allSubmittedToday, studentSearch]);

  // Search filtered pending
  const filteredPendingToday = useMemo(() => {
    if (!studentSearch.trim()) return allPendingToday;
    const q = studentSearch.toLowerCase();
    return allPendingToday.filter((item) => {
      const name = item.student?.full_name?.toLowerCase() || "";
      const email = item.student?.email?.toLowerCase() || "";
      const phone = item.student?.phone || "";
      const camp = (item.campaign?.client_name || item.campaign?.campaign_name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || camp.includes(q);
    });
  }, [allPendingToday, studentSearch]);

  // Summary counts for today
  const dailySummaryStats = useMemo(() => {
    let totalAssigned = 0;
    let totalSubmitted = 0;
    for (const r of campaignDayReports) {
      totalAssigned += r.totalMembers;
      totalSubmitted += r.submittedCount;
    }
    const overallRate = totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0;
    return {
      totalAssigned,
      totalSubmitted,
      totalPending: totalAssigned - totalSubmitted,
      overallRate,
    };
  }, [campaignDayReports]);

  // Overall Leaderboard calculation across ALL campaigns
  const leaderboard = useMemo(() => {
    const today = todayIso();
    const pastDays = days.filter((d) => !d.post_date || d.post_date <= today);

    // Group memberships by student
    const studentMap = new Map<string, any>();

    for (const m of members) {
      const s = m.student;
      if (!s || !s.id) continue;

      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, {
          id: s.id,
          fullName: s.full_name || "Student",
          email: s.email || "",
          phone: s.phone || "",
          campaigns: [],
          targetDaysCount: 0,
          submittedCount: 0,
          winnerCount: 0,
          submissions: [],
        });
      }

      const entry = studentMap.get(s.id)!;
      const camp = campaigns.find((c) => c.id === m.campaign_id);
      entry.campaigns.push(camp?.client_name || camp?.campaign_name || "Campaign");

      // Count past days for this campaign
      const campPastDays = pastDays.filter((d) => d.campaign_id === m.campaign_id);
      entry.targetDaysCount += campPastDays.length || 1;
    }

    // Tally submissions
    for (const sub of submissions) {
      if (!sub.student_id || !studentMap.has(sub.student_id)) continue;
      const entry = studentMap.get(sub.student_id)!;
      entry.submittedCount += 1;
      if (sub.is_selected || sub.status === "selected") {
        entry.winnerCount += 1;
      }
      entry.submissions.push(sub);
    }

    const list = Array.from(studentMap.values()).map((st) => {
      const targets = Math.max(st.targetDaysCount, 1);
      const consistency = Math.min(100, Math.round((st.submittedCount / targets) * 100));
      // Composite Score: consistency * 2 + submitted * 10 + winner * 30
      const score = (consistency * 2) + (st.submittedCount * 10) + (st.winnerCount * 30);
      return {
        ...st,
        consistency,
        score,
      };
    });

    // Sort by winnerCount DESC, consistency DESC, submittedCount DESC
    list.sort((a, b) => {
      if (b.winnerCount !== a.winnerCount) return b.winnerCount - a.winnerCount;
      if (b.consistency !== a.consistency) return b.consistency - a.consistency;
      if (b.submittedCount !== a.submittedCount) return b.submittedCount - a.submittedCount;
      return b.score - a.score;
    });

    return list;
  }, [members, campaigns, days, submissions]);

  // Filtered leaderboard by search
  const filteredLeaderboard = useMemo(() => {
    if (!studentSearch.trim()) return leaderboard;
    const q = studentSearch.toLowerCase();
    return leaderboard.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [leaderboard, studentSearch]);

  // Toggle Day Winner
  async function handleToggleWinner(submissionId: string, dayId: string) {
    setBusySubId(submissionId);
    const res = await toggleWinnerSubmission(submissionId, dayId);
    setBusySubId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not set winner." });
      return;
    }
    setToast({
      type: "success",
      message: res.is_selected
        ? "🏆 Marked as Day Winner / Best Work!"
        : "Unmarked winning pick.",
    });
    void onReload();
  }

  // Copy WhatsApp Summary
  function handleCopyWhatsappSummary(report: any) {
    const campName = report.campaign.client_name || report.campaign.campaign_name || "Campaign";
    const dayNum = report.day ? `Day #${report.day.day_number}` : "Daily Task";
    const topic = report.day?.topic || "Task Guidelines";

    const submittedNames = report.daySubmissions.map((s: any, idx: number) => {
      const isWinner = s.submission.is_selected ? " 🏆 (Winner Best Pick)" : "";
      return `${idx + 1}. *${s.student.full_name}*${isWinner}`;
    });

    const pendingNames = report.pendingMembers.map((m: any, idx: number) => {
      return `${idx + 1}. ${m.student.full_name}`;
    });

    const text = [
      `🌟 *WE CONNECT INNOVATIVE SOLUTIONS*`,
      `📢 *Daily Deliverables & Attendance Report*`,
      `📅 *Date:* ${formatDate(selectedDate)}`,
      `🏢 *Campaign:* ${campName} (${dayNum})`,
      `🎯 *Topic:* ${topic}`,
      ``,
      `✅ *Submitted On-Time (${report.submittedCount}/${report.totalMembers}) - ${report.rate}% Completed:*`,
      submittedNames.length > 0 ? submittedNames.join("\n") : `_No submissions yet today._`,
      ``,
      pendingNames.length > 0 ? `⏳ *Pending Submission (${pendingNames.length}):*\n${pendingNames.join("\n")}\n` : `🎉 *100% Submissions Complete! Awesome work!*\n`,
      `🚀 *Consistency is key to learning and winning client projects. Keep up the high standard!*`,
      `🌐 weconnectinnovativesolutions.com`,
    ].join("\n");

    void navigator.clipboard.writeText(text);
    setToast({ type: "success", message: "WhatsApp announcement text copied to clipboard!" });
  }

  // Copy All Campaigns WhatsApp Summary
  function handleCopyAllCampaignsWhatsapp() {
    const lines = [
      `🌟 *WE CONNECT - DAILY DELIVERABLES & ATTENDANCE REPORT*`,
      `📅 *Date:* ${formatDate(selectedDate)}`,
      `📊 *Overall Completion:* ${dailySummaryStats.totalSubmitted}/${dailySummaryStats.totalAssigned} (${dailySummaryStats.overallRate}%)`,
      `------------------------------------------`,
    ];

    for (const r of campaignDayReports) {
      const campName = r.campaign.client_name || r.campaign.campaign_name;
      const dayNum = r.day ? `Day #${r.day.day_number}` : "Daily Task";
      lines.push(`\n🏢 *${campName}* (${dayNum}) - ${r.submittedCount}/${r.totalMembers} Submitted:`);
      if (r.daySubmissions.length > 0) {
        for (const s of r.daySubmissions) {
          const winTag = s.submission.is_selected ? " 🏆 [WINNER]" : "";
          lines.push(`  • ✅ ${s.student.full_name}${winTag}`);
        }
      } else {
        lines.push(`  • _No submissions recorded yet._`);
      }
      if (r.pendingMembers.length > 0) {
        const pendingNames = r.pendingMembers.map((m: any) => m.student.full_name).join(", ");
        lines.push(`  • ⏳ Pending (${r.pendingMembers.length}): ${pendingNames}`);
      }
    }

    lines.push(
      `\n------------------------------------------`,
      `🚀 *Consistency is key to learning and winning client projects!*`,
      `🌐 weconnectinnovativesolutions.com`
    );

    void navigator.clipboard.writeText(lines.join("\n"));
    setToast({ type: "success", message: "All campaigns summary copied to clipboard!" });
  }

  // Copy All Pending WhatsApp Numbers
  function handleCopyAllPendingWhatsapp() {
    const numbers = allPendingToday
      .map((item) => {
        const wa = cleanPhoneForWhatsapp(item.student?.phone);
        return wa ? `+${wa}` : null;
      })
      .filter(Boolean) as string[];

    const unique = Array.from(new Set(numbers));
    if (unique.length === 0) {
      setToast({ type: "error", message: "No WhatsApp numbers found among pending students." });
      return;
    }
    navigator.clipboard.writeText(unique.join(", "));
    setToast({ type: "success", message: `Copied ${unique.length} pending WhatsApp numbers to clipboard!` });
  }

  // Get single WhatsApp reminder link for a student
  function getStudentReminderUrl(student: any, campaign: any, day: any) {
    const wa = cleanPhoneForWhatsapp(student?.phone);
    if (!wa) return null;
    const client = campaign?.client_name || campaign?.campaign_name || "Social Media Campaign";
    const taskInfo = day ? `Day #${day.day_number} (${day.topic || "Daily Task"})` : "today's task";
    const msg = `Salam ${student?.full_name || "Student"}, reminder from WeConnect Innovative Solutions: your deliverable for ${client} [${taskInfo}] on ${formatDate(selectedDate)} is pending. Please complete and submit your work as soon as possible. Thank you!`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  }

  // Export PNG Card
  async function handleDownloadDailyCard(campaignId: string = "all") {
    setExportTargetCampaignId(campaignId);
    setIsExportingPng(true);

    try {
      // Allow DOM to update state and styles
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      if (!dailyCardRef.current) throw new Error("Card element not ready.");

      const dataUrl = await toPng(dailyCardRef.current, {
        cacheBust: true,
        backgroundColor: "#0B1329",
        pixelRatio: 2,
      });

      const campName =
        campaignId === "all"
          ? "all-campaigns"
          : (campaigns.find((c) => c.id === campaignId)?.client_name || "campaign")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");

      const link = document.createElement("a");
      link.download = `weconnect-submissions-${campName}-${selectedDate}.png`;
      link.href = dataUrl;
      link.click();

      setToast({ type: "success", message: "📸 High-resolution PNG submission card downloaded!" });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Could not generate PNG card." });
    } finally {
      setIsExportingPng(false);
    }
  }

  // Export Leaderboard PNG Card
  async function handleDownloadLeaderboardCard() {
    setIsExportingPng(true);

    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      if (!leaderboardCardRef.current) throw new Error("Leaderboard card not ready.");

      const dataUrl = await toPng(leaderboardCardRef.current, {
        cacheBust: true,
        backgroundColor: "#0B1329",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `weconnect-champions-hall-of-fame-${selectedDate}.png`;
      link.href = dataUrl;
      link.click();

      setToast({ type: "success", message: "🏆 Hall of Fame & Winners card downloaded!" });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Could not generate Leaderboard PNG." });
    } finally {
      setIsExportingPng(false);
    }
  }

  // Active campaign report for single card export
  const singleExportReport = useMemo(() => {
    if (exportTargetCampaignId === "all") return null;
    return campaignDayReports.find((r) => r.campaign.id === exportTargetCampaignId) ?? null;
  }, [campaignDayReports, exportTargetCampaignId]);

  return (
    <div className="space-y-4">
      {/* TOP CONTROLS & NAV BAR */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-lowest p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-xl bg-surface-low p-1 border border-outline-variant/50">
            <button
              type="button"
              onClick={() => setActiveView("glance")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeView === "glance"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="bolt" className="text-[15px] text-amber-400" />
              <span>Today at a Glance</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold">
                {dailySummaryStats.totalSubmitted} Done
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("daily")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeView === "daily"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="campaign" className="text-[15px]" />
              <span>By Campaign Details</span>
              <span className="rounded-full bg-surface-container px-1.5 py-0.2 text-[10px] text-on-surface font-extrabold">
                {campaignDayReports.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("leaderboard")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeView === "leaderboard"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="military_tech" className="text-[15px]" />
              <span>Champions &amp; Leaderboard</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-700 dark:text-amber-300 font-extrabold">
                🏆 Top Ranks
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeView !== "leaderboard" ? (
              <>
                <button
                  type="button"
                  onClick={handleCopyAllCampaignsWhatsapp}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                  title="Copy formatted text to send in WhatsApp student group"
                >
                  <Icon name="content_copy" className="text-sm" />
                  <span>Copy WhatsApp Report</span>
                </button>
                <button
                  type="button"
                  disabled={isExportingPng}
                  onClick={() => handleDownloadDailyCard("all")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                >
                  <Icon name="photo_camera" className="text-sm" />
                  <span>{isExportingPng ? "Generating…" : "Download Report (PNG)"}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isExportingPng}
                onClick={handleDownloadLeaderboardCard}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-2xs"
              >
                <Icon name="emoji_events" className="text-sm" />
                <span>{isExportingPng ? "Generating…" : "Download Hall of Fame Card (PNG)"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void onReload()}
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-low transition shadow-2xs"
              title="Refresh submissions"
            >
              <Icon name="refresh" className="text-sm" />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-outline-variant/40">
          {activeView !== "leaderboard" && (
            <>
              {/* Date controls */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-on-surface-variant mr-1">Date:</span>
                <button
                  type="button"
                  onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))}
                  className="rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-xs font-bold text-on-surface hover:bg-surface-low transition shadow-2xs"
                  title="Previous day"
                >
                  ‹
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1 text-xs font-semibold text-on-surface outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayIso())}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition shadow-2xs ${
                    selectedDate === todayIso()
                      ? "bg-primary/10 text-primary font-black border border-primary/30"
                      : "border border-outline-variant bg-surface-lowest text-on-surface hover:bg-surface-low"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))}
                  className="rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-xs font-bold text-on-surface hover:bg-surface-low transition shadow-2xs"
                  title="Next day"
                >
                  ›
                </button>
              </div>

              {/* Campaign Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant">Campaign:</span>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1 text-xs font-semibold text-on-surface outline-none focus:border-primary max-w-[200px]"
                >
                  <option value="all">All Campaigns ({campaigns.length})</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name || c.campaign_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Search box */}
          <div className="relative min-w-[180px] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant"
            />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student by name, email, WhatsApp, or campaign..."
              className="w-full rounded-lg border border-outline-variant bg-surface-lowest py-1 pl-8 pr-2.5 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* QUICK SUMMARY STATS BANNER */}
      {activeView !== "leaderboard" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-3 shadow-2xs">
            <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
              <Icon name="campaign" className="text-primary text-sm" /> Active Campaigns
            </p>
            <p className="text-xl font-black text-on-surface mt-0.5">{campaignDayReports.length}</p>
          </div>
          <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-3 shadow-2xs">
            <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
              <Icon name="groups" className="text-blue-600 text-sm" /> Total Assigned
            </p>
            <p className="text-xl font-black text-on-surface mt-0.5">{dailySummaryStats.totalAssigned}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 shadow-2xs">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Icon name="check_circle" className="text-emerald-600 text-sm" /> Submitted Today
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {dailySummaryStats.totalSubmitted}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded">
                {dailySummaryStats.overallRate}% Done
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 shadow-2xs">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Icon name="schedule" className="text-amber-600 text-sm" /> Pending Today
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {dailySummaryStats.totalPending}
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded">
                Waiting
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 0: TODAY AT A GLANCE (QUICK REPORT) */}
      {activeView === "glance" && (
        <div className="space-y-4">
          {/* Filter Pills and Action Bar */}
          <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-surface-low p-1 border border-outline-variant/40 gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                  statusFilter === "all"
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All Students ({dailySummaryStats.totalAssigned})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("submitted")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition flex items-center gap-1 ${
                  statusFilter === "submitted"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                }`}
              >
                <span>✅ Submitted</span>
                <span className="rounded-full bg-black/15 px-1.5 text-[10px] font-black">
                  {allSubmittedToday.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition flex items-center gap-1 ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <span>⏳ Pending</span>
                <span className="rounded-full bg-black/15 px-1.5 text-[10px] font-black">
                  {allPendingToday.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {allPendingToday.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAllPendingWhatsapp}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-100 transition shadow-2xs"
                  title="Copy WhatsApp numbers of all pending students"
                >
                  <Icon name="chat" className="text-xs text-amber-600" />
                  <span>Copy Pending WhatsApp ({allPendingToday.filter((p) => cleanPhoneForWhatsapp(p.student?.phone)).length})</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 1: SUBMITTED DELIVERABLES TODAY */}
          {(statusFilter === "all" || statusFilter === "submitted") && (
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-lowest shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <Icon name="check_circle" className="text-base" />
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-on-surface">
                      Submitted Deliverables ({filteredSubmittedToday.length})
                    </h3>
                    <p className="text-[10px] text-on-surface-variant">
                      Work submitted for {formatDate(selectedDate)}
                    </p>
                  </div>
                </div>
              </div>

              {filteredSubmittedToday.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/80 p-6 text-center text-xs text-on-surface-variant">
                  <Icon name="cloud_off" className="text-2xl opacity-40 mx-auto mb-1 block" />
                  No submissions found for {formatDate(selectedDate)}.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSubmittedToday.map(({ student, submission, day, campaign, links }: any) => {
                    const isWinner = submission.is_selected;
                    const submittedTime = formatTime(submission.created_at);
                    const campName = campaign?.client_name || campaign?.campaign_name || "Campaign";
                    const waDigits = cleanPhoneForWhatsapp(student.phone);
                    const waChatUrl = waDigits ? `https://wa.me/${waDigits}` : null;

                    return (
                      <div
                        key={submission.id}
                        className={`rounded-xl border p-3.5 transition-all relative flex flex-col justify-between space-y-2.5 shadow-2xs ${
                          isWinner
                            ? "border-amber-400 bg-amber-500/10 dark:border-amber-500/60 dark:bg-amber-950/20"
                            : "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500"
                        }`}
                      >
                        <div>
                          {/* Student Header */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                                <span className="truncate">{student.full_name}</span>
                                {isWinner && (
                                  <span className="shrink-0 text-amber-500 text-sm" title="Winner Best Pick">
                                    🏆
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant truncate">
                                {student.email}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                              ✅ {submittedTime || "Done"}
                            </span>
                          </div>

                          {/* Campaign & Task Info */}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md border border-outline-variant/60 bg-surface-lowest px-1.5 py-0.5 text-[10px] font-bold text-on-surface">
                              {campName}
                            </span>
                            {day && (
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary truncate max-w-[170px]" title={day.topic}>
                                Day #{day.day_number}: {day.topic || "Daily Task"}
                              </span>
                            )}
                          </div>

                          {/* Clickable Work Proof Links */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {links.driveUrl && (
                              <a
                                href={links.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-surface-lowest px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 transition"
                                title="Open Google Drive Files"
                              >
                                <Icon name="folder" className="text-xs text-[#0F9D58]" />
                                <span>Drive Link</span>
                              </a>
                            )}
                            {links.docUrl && (
                              <a
                                href={links.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-surface-lowest px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-200 hover:bg-blue-50 transition"
                                title="Open Google Docs"
                              >
                                <Icon name="description" className="text-xs text-[#4285F4]" />
                                <span>Docs Link</span>
                              </a>
                            )}
                            {links.postUrl && (
                              <a
                                href={links.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-surface-lowest px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-200 hover:bg-purple-50 transition"
                                title="Open Live Post"
                              >
                                <Icon name="share" className="text-xs text-purple-600" />
                                <span>Live Post</span>
                              </a>
                            )}
                          </div>

                          {/* Student Note */}
                          {submission.note && (
                            <p className="mt-2 text-[10px] text-on-surface-variant italic bg-surface-lowest/80 p-1.5 rounded-lg border border-outline-variant/40 line-clamp-2">
                              &ldquo;{submission.note}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                          {waChatUrl ? (
                            <a
                              href={waChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <Icon name="chat" className="text-xs" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant">Logged</span>
                          )}

                          {role !== "student" && day && (
                            <button
                              type="button"
                              disabled={busySubId === submission.id}
                              onClick={() => handleToggleWinner(submission.id, day.id)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition shadow-2xs ${
                                isWinner
                                  ? "bg-amber-600 text-white hover:bg-amber-700"
                                  : "border border-amber-500/40 bg-surface-lowest text-amber-800 dark:text-amber-300 hover:bg-amber-50"
                              }`}
                            >
                              <span>{isWinner ? "🏆 Winner" : "👑 Pick Winner"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: PENDING STUDENTS TODAY */}
          {(statusFilter === "all" || statusFilter === "pending") && (
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-lowest shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                    <Icon name="schedule" className="text-base" />
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-on-surface">
                      Pending Deliverables ({filteredPendingToday.length})
                    </h3>
                    <p className="text-[10px] text-on-surface-variant">
                      Students who have not submitted today&apos;s current task yet
                    </p>
                  </div>
                </div>
                {filteredPendingToday.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyAllPendingWhatsapp}
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-low px-2 py-1 text-[11px] font-bold text-on-surface hover:text-amber-700 transition"
                  >
                    <Icon name="content_copy" className="text-xs" />
                    <span>Copy Numbers</span>
                  </button>
                )}
              </div>

              {filteredPendingToday.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-500/50 bg-emerald-50/20 p-6 text-center text-xs text-emerald-800 dark:text-emerald-300">
                  <Icon name="verified" className="text-2xl text-emerald-600 mx-auto mb-1 block" />
                  🎉 Awesome! All assigned students have submitted their tasks for {formatDate(selectedDate)}.
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPendingToday.map(({ student, campaign, day }: any) => {
                    const campName = campaign?.client_name || campaign?.campaign_name || "Campaign";
                    const reminderUrl = getStudentReminderUrl(student, campaign, day);

                    return (
                      <div
                        key={`${campaign.id}_${student.id}`}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:border-amber-500/60 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-on-surface truncate">
                                {student.full_name}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant truncate">
                                {student.email}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300">
                              ⏳ Pending
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md border border-outline-variant/60 bg-surface-lowest px-1.5 py-0.5 text-[10px] font-bold text-on-surface">
                              {campName}
                            </span>
                            {day && (
                              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 truncate max-w-[170px]" title={day.topic}>
                                Day #{day.day_number}: {day.topic || "Daily Task"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-on-surface-variant">
                            {student.phone || "No phone"}
                          </span>

                          {reminderUrl ? (
                            <a
                              href={reminderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition"
                              title="Send reminder on WhatsApp"
                            >
                              <Icon name="chat" className="text-xs" />
                              <span>Remind WhatsApp ↗</span>
                            </a>
                          ) : (
                            <span className="text-[9px] text-on-surface-variant italic">
                              No WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: DAILY DELIVERABLES PER CAMPAIGN */}
      {activeView === "daily" && (
        <div className="space-y-4">
          {campaignDayReports.map((report) => {
            const { campaign, day, daySubmissions, pendingMembers, totalMembers, submittedCount, rate } = report;
            const clientName = campaign.client_name || campaign.campaign_name || "Campaign";
            const dayTitle = day ? `Day #${day.day_number}: ${day.topic || "Daily Task"}` : "No task scheduled for this date";

            // Apply search filter
            const visibleSubmissions = studentSearch.trim()
              ? daySubmissions.filter((s: any) =>
                  s.student.full_name?.toLowerCase().includes(studentSearch.toLowerCase())
                )
              : daySubmissions;

            const visiblePending = studentSearch.trim()
              ? pendingMembers.filter((m: any) =>
                  m.student.full_name?.toLowerCase().includes(studentSearch.toLowerCase())
                )
              : pendingMembers;

            return (
              <div
                key={campaign.id}
                className="rounded-2xl border border-outline-variant/60 bg-surface-lowest shadow-sm overflow-hidden"
              >
                {/* CAMPAIGN CARD HEADER */}
                <div className="border-b border-outline-variant/50 bg-surface-low/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onOpenCampaign(campaign.id)}
                        className="text-sm font-black text-on-surface hover:text-primary transition flex items-center gap-1 group"
                      >
                        <span>{clientName}</span>
                        <Icon name="open_in_new" className="text-xs opacity-60 group-hover:opacity-100" />
                      </button>
                      {day && (
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">
                          Day #{day.day_number}
                        </span>
                      )}
                      {days.filter((d) => d.campaign_id === campaign.id).length > 1 && (
                        <select
                          value={day?.id || ""}
                          onChange={(e) =>
                            setCampaignDayOverrides((prev) => ({ ...prev, [campaign.id]: e.target.value }))
                          }
                          className="rounded-md border border-outline-variant/60 bg-surface-lowest px-1.5 py-0.5 text-[10px] font-bold text-on-surface outline-none focus:border-primary max-w-[190px]"
                          title="Select task day for this campaign"
                        >
                          {days
                            .filter((d) => d.campaign_id === campaign.id)
                            .sort((a, b) => a.day_number - b.day_number)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                Day #{d.day_number}: {d.topic ? d.topic.slice(0, 24) : "Task"}
                              </option>
                            ))}
                        </select>
                      )}
                      <span className="rounded-md bg-surface-lowest border border-outline-variant/60 px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                        {submittedCount}/{totalMembers} Submitted ({rate}%)
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                      {dayTitle} {day?.content_type ? `• Format: ${day.content_type}` : ""}
                    </p>
                  </div>

                  {/* Actions for this campaign */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyWhatsappSummary(report)}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:text-emerald-700 hover:border-emerald-300 transition shadow-2xs"
                      title="Copy WhatsApp text for this campaign"
                    >
                      <Icon name="content_copy" className="text-xs text-emerald-600" />
                      <span>WhatsApp Text</span>
                    </button>
                    <button
                      type="button"
                      disabled={isExportingPng}
                      onClick={() => handleDownloadDailyCard(campaign.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                      title="Download PNG image card for this campaign"
                    >
                      <Icon name="download" className="text-xs" />
                      <span>PNG Card</span>
                    </button>
                  </div>
                </div>

                {/* SUBMISSION LISTING GRID */}
                <div className="p-3.5 space-y-3">
                  {/* SECTION A: SUBMITTED STUDENTS (HIGHLIGHTED IN GREEN) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Icon name="check_circle" className="text-[15px] text-emerald-600" />
                        <span>Submitted Deliverables ({visibleSubmissions.length})</span>
                      </p>
                    </div>

                    {visibleSubmissions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-outline-variant/80 p-3 text-center text-xs text-on-surface-variant/80">
                        No submissions recorded for this campaign on {formatDate(selectedDate)} yet.
                      </div>
                    ) : (
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleSubmissions.map(({ student, submission, links }: any) => {
                          const isWinner = submission.is_selected;
                          const submittedTime = formatTime(submission.created_at);

                          return (
                            <div
                              key={submission.id}
                              className={`rounded-xl border p-3 transition-all relative flex flex-col justify-between space-y-2 shadow-2xs ${
                                isWinner
                                  ? "border-amber-400 bg-amber-500/10 dark:border-amber-500/60 dark:bg-amber-950/20"
                                  : "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500"
                              }`}
                            >
                              {/* Student name & badges */}
                              <div>
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                                      <span className="truncate">{student.full_name}</span>
                                      {isWinner && (
                                        <span
                                          className="shrink-0 text-amber-500 text-sm"
                                          title="Official Day Winner / Best Pick"
                                        >
                                          🏆
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-[10px] text-on-surface-variant truncate">
                                      {student.email || student.phone || "Enrolled student"}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                                      ✅ Done {submittedTime}
                                    </span>
                                  </div>
                                </div>

                                {/* Clickable Work Links */}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {links.driveUrl && (
                                    <a
                                      href={links.driveUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-surface-lowest px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 transition"
                                      title="Open Google Drive Video / Files"
                                    >
                                      <Icon name="folder" className="text-xs text-[#0F9D58]" />
                                      <span>Drive Link</span>
                                    </a>
                                  )}
                                  {links.docUrl && (
                                    <a
                                      href={links.docUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-surface-lowest px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-200 hover:bg-blue-50 transition"
                                      title="Open Google Docs Guideline / Content"
                                    >
                                      <Icon name="description" className="text-xs text-[#4285F4]" />
                                      <span>Docs Link</span>
                                    </a>
                                  )}
                                  {links.postUrl && (
                                    <a
                                      href={links.postUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-surface-lowest px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-200 hover:bg-purple-50 transition"
                                      title="Open Live Post URL"
                                    >
                                      <Icon name="share" className="text-xs text-purple-600" />
                                      <span>Live Post</span>
                                    </a>
                                  )}
                                </div>

                                {/* Student Note */}
                                {submission.note && (
                                  <p className="mt-1.5 text-[10px] text-on-surface-variant italic bg-surface-lowest/70 p-1.5 rounded-lg border border-outline-variant/40 line-clamp-2">
                                    &ldquo;{submission.note}&rdquo;
                                  </p>
                                )}
                              </div>

                              {/* Card Footer: Winner toggle */}
                              <div className="pt-1 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-on-surface-variant">
                                  {isWinner ? (
                                    <span className="text-amber-700 dark:text-amber-300 font-black">
                                      ⭐ Ranked Best Deliverable
                                    </span>
                                  ) : (
                                    <span>Reviewed &amp; Logged</span>
                                  )}
                                </span>

                                {role !== "student" && day && (
                                  <button
                                    type="button"
                                    disabled={busySubId === submission.id}
                                    onClick={() => handleToggleWinner(submission.id, day.id)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition shadow-2xs ${
                                      isWinner
                                        ? "bg-amber-600 text-white hover:bg-amber-700"
                                        : "border border-amber-500/40 bg-surface-lowest text-amber-800 dark:text-amber-300 hover:bg-amber-50"
                                    }`}
                                  >
                                    <span>{isWinner ? "🏆 Selected Winner" : "👑 Pick Winner"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION B: PENDING STUDENTS */}
                  {visiblePending.length > 0 && (
                    <div className="pt-2 border-t border-outline-variant/40">
                      <p className="text-xs font-bold text-on-surface-variant mb-2 flex items-center gap-1.5">
                        <Icon name="schedule" className="text-[15px] text-amber-600" />
                        <span>Pending Submissions ({visiblePending.length})</span>
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {visiblePending.map(({ student }: any) => (
                          <div
                            key={student.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/70 bg-surface-low/40 px-2.5 py-1 text-[11px] text-on-surface-variant"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="font-semibold text-on-surface">{student.full_name}</span>
                            <span className="text-[9px] text-on-surface-variant/70">
                              (Pending)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: ALL CAMPAIGNS CHAMPIONS & WINNERS LEADERBOARD */}
      {activeView === "leaderboard" && (
        <div className="space-y-4">
          {/* PODIUM TOP 3 PERFORMERS */}
          {filteredLeaderboard.length >= 3 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {/* 2nd place */}
              <div className="rounded-2xl border border-slate-300 bg-linear-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950 p-4 shadow-sm text-center flex flex-col justify-between order-2 sm:order-1">
                <div>
                  <span className="inline-block text-2xl mb-1">🥈</span>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2nd Place • Consistency Star
                  </span>
                  <h3 className="text-base font-black text-on-surface mt-1">
                    {filteredLeaderboard[1].fullName}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {filteredLeaderboard[1].campaigns.join(", ")}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-around text-xs">
                  <div>
                    <span className="block font-black text-on-surface">
                      {filteredLeaderboard[1].submittedCount}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Submitted</span>
                  </div>
                  <div>
                    <span className="block font-black text-emerald-600">
                      {filteredLeaderboard[1].consistency}%
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Consistency</span>
                  </div>
                  <div>
                    <span className="block font-black text-amber-600">
                      🏆 {filteredLeaderboard[1].winnerCount}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Wins</span>
                  </div>
                </div>
              </div>

              {/* 1st place champion */}
              <div className="rounded-2xl border-2 border-amber-400 bg-linear-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-950 p-4 shadow-md text-center flex flex-col justify-between order-1 sm:order-2 ring-2 ring-amber-400/30">
                <div>
                  <span className="inline-block text-4xl mb-1 animate-bounce">👑</span>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    🥇 Overall Winner &amp; Regularity Champion
                  </span>
                  <h3 className="text-lg font-black text-on-surface mt-1">
                    {filteredLeaderboard[0].fullName}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {filteredLeaderboard[0].campaigns.join(", ")}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-300/40 flex items-center justify-around text-xs">
                  <div>
                    <span className="block font-black text-on-surface text-sm">
                      {filteredLeaderboard[0].submittedCount}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Submitted</span>
                  </div>
                  <div>
                    <span className="block font-black text-emerald-600 text-sm">
                      {filteredLeaderboard[0].consistency}%
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Consistency</span>
                  </div>
                  <div>
                    <span className="block font-black text-amber-600 text-sm">
                      🏆 {filteredLeaderboard[0].winnerCount}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Wins</span>
                  </div>
                </div>
              </div>

              {/* 3rd place */}
              <div className="rounded-2xl border border-amber-700/30 bg-linear-to-b from-amber-100/50 to-white dark:from-slate-900 dark:to-slate-950 p-4 shadow-sm text-center flex flex-col justify-between order-3">
                <div>
                  <span className="inline-block text-2xl mb-1">🥉</span>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    3rd Place • Dedicated Creator
                  </span>
                  <h3 className="text-base font-black text-on-surface mt-1">
                    {filteredLeaderboard[2].fullName}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {filteredLeaderboard[2].campaigns.join(", ")}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-around text-xs">
                  <div>
                    <span className="block font-black text-on-surface">
                      {filteredLeaderboard[2].submittedCount}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Submitted</span>
                  </div>
                  <div>
                    <span className="block font-black text-emerald-600">
                      {filteredLeaderboard[2].consistency}%
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Consistency</span>
                  </div>
                  <div>
                    <span className="block font-black text-amber-600">
                      🏆 {filteredLeaderboard[2].winnerCount}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Wins</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FULL LEADERBOARD TABLE */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-lowest shadow-sm overflow-hidden">
            <div className="border-b border-outline-variant/50 bg-surface-low/50 px-4 py-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-on-surface flex items-center gap-2">
                <Icon name="leaderboard" className="text-primary text-[15px]" />
                <span>Overall Consistency &amp; Deliverables Ranking ({filteredLeaderboard.length} Students)</span>
              </h3>
              <span className="text-[11px] text-on-surface-variant">
                Ranked by Wins 🏆 &amp; Regularity %
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface-low/30 text-[10px] uppercase tracking-wider text-on-surface-variant font-black">
                    <th className="py-2.5 pl-4 pr-2">Rank</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Assigned Campaigns</th>
                    <th className="py-2.5 px-3 text-center">Submissions</th>
                    <th className="py-2.5 px-3 text-center">Wins 🏆</th>
                    <th className="py-2.5 px-3">Consistency Rate</th>
                    <th className="py-2.5 pr-4 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {filteredLeaderboard.map((st, index) => {
                    const rank = index + 1;
                    return (
                      <tr key={st.id} className="hover:bg-surface-low/40 transition">
                        <td className="py-2.5 pl-4 pr-2 font-black">
                          {rank === 1 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black text-xs font-black">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-black text-xs font-black">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/60 text-white text-xs font-black">
                              3
                            </span>
                          ) : (
                            <span className="text-on-surface-variant pl-1.5">#{rank}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-on-surface block">{st.fullName}</span>
                          <span className="text-[10px] text-on-surface-variant truncate block">
                            {st.email || st.phone}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {st.campaigns.map((c: string, idx: number) => (
                              <span
                                key={idx}
                                className="rounded-md bg-surface-low border border-outline-variant/40 px-1.5 py-0.5 text-[9px] font-semibold text-on-surface"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-on-surface">
                          {st.submittedCount}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {st.winnerCount > 0 ? (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                              🏆 {st.winnerCount}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/50">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                              {st.consistency}%
                            </span>
                            <div className="w-16 bg-surface-low rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${st.consistency}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 pl-3 text-right">
                          {st.consistency >= 90 ? (
                            <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black">
                              🔥 Star Regular
                            </span>
                          ) : st.consistency >= 60 ? (
                            <span className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold">
                              ⚡ Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 px-2 py-0.5 text-[10px] font-medium">
                              In Progress
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIDDEN / OFF-SCREEN PNG CARD TEMPLATES FOR HTML-TO-IMAGE EXPORT */}
      {/* ========================================================================= */}

      {/* 1. DAILY DELIVERABLES PNG CARD */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={dailyCardRef}
          style={{ width: "1080px", minHeight: "1080px", fontFamily: "sans-serif" }}
          className="bg-linear-to-b from-[#0B1329] via-[#0F172A] to-[#0B1329] text-white p-12 flex flex-col justify-between"
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <span className="text-emerald-400 text-sm font-black tracking-widest uppercase block">
                  ★ WE CONNECT INNOVATIVE SOLUTIONS ★
                </span>
                <h1 className="text-3xl font-black text-white mt-1">
                  Social Media Campaigns Hub
                </h1>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-4 py-1.5 text-xs font-black text-emerald-300">
                  {formatDate(selectedDate)}
                </span>
              </div>
            </div>

            {/* Banner Title */}
            <div className="my-8 rounded-2xl bg-linear-to-r from-emerald-600/30 via-indigo-600/20 to-purple-600/30 border border-white/15 p-6 text-center">
              <span className="text-amber-400 text-xs font-black uppercase tracking-wider block mb-1">
                🌟 DAILY SUBMISSION ROLL OF HONOR 🌟
              </span>
              <h2 className="text-2xl font-black text-white">
                {singleExportReport
                  ? `${singleExportReport.campaign.client_name || singleExportReport.campaign.campaign_name} • Day #${singleExportReport.day?.day_number ?? 1}`
                  : `All Campaigns Daily Deliverables Report`}
              </h2>
              {singleExportReport?.day?.topic && (
                <p className="text-emerald-200 text-sm mt-1 font-semibold">
                  Task: {singleExportReport.day.topic}
                </p>
              )}
            </div>

            {/* Submissions Grid */}
            <div className="space-y-6">
              {singleExportReport ? (
                <div>
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-3">
                    Submissions ({singleExportReport.submittedCount}/{singleExportReport.totalMembers} Completed)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {singleExportReport.daySubmissions.map(({ student, submission }: any) => (
                      <div
                        key={submission.id}
                        className={`rounded-xl p-3 border ${
                          submission.is_selected
                            ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400"
                            : "border-emerald-500/30 bg-emerald-500/10"
                        } flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                            ✓
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">
                              {student.full_name}
                            </span>
                            <span className="text-[10px] text-emerald-200">
                              Verified Deliverable
                            </span>
                          </div>
                        </div>
                        {submission.is_selected && (
                          <span className="text-amber-300 text-xs font-black">
                            🏆 BEST PICK
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignDayReports.map((r) => (
                    <div key={r.campaign.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                        <span className="font-black text-white text-base">
                          {r.campaign.client_name || r.campaign.campaign_name}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {r.submittedCount}/{r.totalMembers} Done ({r.rate}%)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {r.daySubmissions.map(({ student, submission }: any) => (
                          <span
                            key={submission.id}
                            className={`rounded-lg px-3 py-1 text-xs font-bold ${
                              submission.is_selected
                                ? "bg-amber-500 text-black font-black"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            }`}
                          >
                            ✅ {student.full_name} {submission.is_selected ? "🏆" : ""}
                          </span>
                        ))}
                        {r.daySubmissions.length === 0 && (
                          <span className="text-xs text-white/50 italic">
                            No submissions recorded yet today.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
            <div>
              <p className="font-bold text-white">
                &ldquo;Consistency is what transforms average into excellence.&rdquo; 🚀
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">
                We Connect Innovative Solutions • Training &amp; Production Agency
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-400 font-bold">
                weconnectinnovativesolutions.com
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LEADERBOARD & WINNERS HALL OF FAME PNG CARD */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={leaderboardCardRef}
          style={{ width: "1080px", minHeight: "1350px", fontFamily: "sans-serif" }}
          className="bg-linear-to-b from-[#080E21] via-[#0F172A] to-[#080E21] text-white p-12 flex flex-col justify-between"
        >
          {/* Header */}
          <div>
            <div className="text-center pb-6 border-b border-white/10">
              <span className="text-amber-400 text-sm font-black tracking-widest uppercase">
                ★ WE CONNECT INNOVATIVE SOLUTIONS ★
              </span>
              <h1 className="text-4xl font-black text-white mt-1">
                🏆 CHAMPIONS &amp; WINNERS HALL OF FAME 🏆
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Honoring the Most Consistent &amp; Outstanding Creators Across All Campaigns
              </p>
            </div>

            {/* Top 3 Podium Cards */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 my-8">
                {/* 2nd Place */}
                <div className="rounded-2xl border border-slate-300/40 bg-white/5 p-5 text-center mt-6">
                  <span className="text-3xl block">🥈</span>
                  <span className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                    2ND PLACE
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {leaderboard[1].fullName}
                  </h3>
                  <div className="mt-3 bg-white/5 rounded-xl p-2 text-xs">
                    <span className="text-emerald-400 font-bold block">
                      {leaderboard[1].consistency}% Consistency
                    </span>
                    <span className="text-white/60 text-[10px]">
                      {leaderboard[1].submittedCount} Deliverables
                    </span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="rounded-2xl border-2 border-amber-400 bg-linear-to-b from-amber-400/20 to-white/5 p-6 text-center ring-2 ring-amber-400/40">
                  <span className="text-5xl block animate-bounce">👑</span>
                  <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                    🥇 TOP WINNER &amp; REGULAR STAR
                  </span>
                  <h2 className="text-xl font-black text-white mt-1">
                    {leaderboard[0].fullName}
                  </h2>
                  <div className="mt-4 bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 text-xs">
                    <span className="text-amber-300 font-black text-sm block">
                      🏆 {leaderboard[0].winnerCount} Wins • {leaderboard[0].consistency}% Streak
                    </span>
                    <span className="text-white/80 text-[11px]">
                      {leaderboard[0].submittedCount} Completed Tasks
                    </span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="rounded-2xl border border-amber-700/40 bg-white/5 p-5 text-center mt-6">
                  <span className="text-3xl block">🥉</span>
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                    3RD PLACE
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {leaderboard[2].fullName}
                  </h3>
                  <div className="mt-3 bg-white/5 rounded-xl p-2 text-xs">
                    <span className="text-emerald-400 font-bold block">
                      {leaderboard[2].consistency}% Consistency
                    </span>
                    <span className="text-white/60 text-[10px]">
                      {leaderboard[2].submittedCount} Deliverables
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Regular Roster */}
            <div>
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-3">
                Top Consistency Performers
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {leaderboard.slice(0, 10).map((st, idx) => (
                  <div
                    key={st.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-white/10 text-white font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs block">
                          {st.fullName}
                        </span>
                        <span className="text-[10px] text-white/60">
                          {st.campaigns.slice(0, 2).join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-400 text-xs block">
                        {st.consistency}%
                      </span>
                      {st.winnerCount > 0 && (
                        <span className="text-[10px] text-amber-300 font-bold">
                          🏆 {st.winnerCount} Wins
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
            <div>
              <p className="font-bold text-white">
                &ldquo;Dedicated creators lead tomorrow&apos;s digital economy.&rdquo; 🚀
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">
                We Connect Innovative Solutions • Social Media Marketing Division
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-400 font-bold">
                weconnectinnovativesolutions.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
