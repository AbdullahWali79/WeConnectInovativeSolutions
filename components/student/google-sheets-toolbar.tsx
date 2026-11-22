/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { type ToastState } from "@/components/toast";

type Props = {
  campaign: any;
  days: any[];
  members: any[];
  currentUserId: string;
  driveUrl?: string | null;
  onBack: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  zoomLevel: number;
  onChangeZoom: (delta: number) => void;
  onResetZoom: () => void;
  isBold: boolean;
  onToggleBold: () => void;
  isItalic: boolean;
  onToggleItalic: () => void;
  onReload: () => Promise<void>;
  setToast: (toast: ToastState) => void;
  onQuickSubmitLink?: () => void;
  onSelectTab?: (tabId: string) => void;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function GoogleSheetsToolbar({
  campaign,
  days,
  members,
  currentUserId,
  driveUrl,
  onBack,
  isMaximized,
  onToggleMaximize,
  zoomLevel,
  onChangeZoom,
  onResetZoom,
  isBold,
  onToggleBold,
  isItalic,
  onToggleItalic,
  onReload,
  setToast,
  onQuickSubmitLink,
  onSelectTab,
}: Props) {
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);

  // Close menu dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sheets-menu]")) {
        setActiveMenuDropdown(null);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Export to CSV
  function handleDownloadCsv() {
    if (days.length === 0) {
      setToast({ type: "error", message: "No planned days to export." });
      return;
    }

    const headers = [
      "Day #",
      "Post Date",
      "Topic / Content Theme",
      "Caption / Guidelines",
      "Docs Brief Link",
      "ChatGPT Link",
      "Assets Link",
      "Day Status",
    ];

    const rows = days.map((d) => [
      d.day_number,
      d.post_date || "",
      `"${(d.theme || "").replace(/"/g, '""')}"`,
      `"${(d.caption || "").replace(/"/g, '""')}"`,
      `"${(d.source_link || "").replace(/"/g, '""')}"`,
      `"${(d.research_note || "").replace(/"/g, '""')}"`,
      `"${(d.image_headline || "").replace(/"/g, '""')}"`,
      d.status || "",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${(campaign.client_name || "campaign").replace(/\s+/g, "_")}_content_sheet.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ type: "success", message: "Spreadsheet downloaded as CSV file." });
    setActiveMenuDropdown(null);
  }

  // Print
  function handlePrint() {
    setActiveMenuDropdown(null);
    window.print();
  }

  // Copy link
  function handleCopyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    setToast({ type: "success", message: "Campaign link copied to clipboard!" });
    setActiveMenuDropdown(null);
  }

  // Open Drive
  function handleOpenDrive() {
    const target = driveUrl || campaign.drive_url || "https://drive.google.com";
    window.open(target, "_blank", "noopener,noreferrer");
    setActiveMenuDropdown(null);
  }

  // Open ChatGPT
  function handleOpenChatGpt() {
    window.open("https://chatgpt.com", "_blank", "noopener,noreferrer");
    setActiveMenuDropdown(null);
  }

  const menus = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "Download CSV (.csv)", icon: "download", onClick: handleDownloadCsv },
        { label: "Print / Save PDF", icon: "print", onClick: handlePrint },
        { label: "Open Google Drive Folder", icon: "folder_shared", onClick: handleOpenDrive },
        { label: "Reload Spreadsheet", icon: "refresh", onClick: () => { void onReload(); setActiveMenuDropdown(null); } },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          label: "Submit / Edit Work Links",
          icon: "add_link",
          onClick: () => {
            onQuickSubmitLink?.();
            setActiveMenuDropdown(null);
          },
        },
        { label: "Copy Sheet Link", icon: "content_copy", onClick: handleCopyShareLink },
        {
          label: "Edit Profile & Password",
          icon: "manage_accounts",
          onClick: () => {
            window.dispatchEvent(new Event("open-account-settings"));
            setActiveMenuDropdown(null);
          },
        },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        {
          label: isMaximized ? "Exit Fullscreen" : "Maximize Sheet Workspace",
          icon: isMaximized ? "fullscreen_exit" : "fullscreen",
          onClick: () => {
            onToggleMaximize();
            setActiveMenuDropdown(null);
          },
        },
        {
          label: isCompactMode ? "Expand Menus & Toolbar" : "Compact Mode (Hide Menus)",
          icon: isCompactMode ? "unfold_more" : "unfold_less",
          onClick: () => {
            setIsCompactMode(!isCompactMode);
            setActiveMenuDropdown(null);
          },
        },
        { label: "Zoom 100% (Default)", icon: "zoom_in", onClick: () => { onResetZoom(); setActiveMenuDropdown(null); } },
        { label: "Zoom 110%", icon: "zoom_in", onClick: () => { onChangeZoom(10); setActiveMenuDropdown(null); } },
        { label: "Zoom 90%", icon: "zoom_out", onClick: () => { onChangeZoom(-10); setActiveMenuDropdown(null); } },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      items: [
        {
          label: "Insert Google Drive Video Link",
          icon: "folder_shared",
          onClick: () => {
            onQuickSubmitLink?.();
            setActiveMenuDropdown(null);
          },
        },
        {
          label: "Insert Google Docs Content Link",
          icon: "description",
          onClick: () => {
            onQuickSubmitLink?.();
            setActiveMenuDropdown(null);
          },
        },
        {
          label: "Insert Live Post URL",
          icon: "public",
          onClick: () => {
            onQuickSubmitLink?.();
            setActiveMenuDropdown(null);
          },
        },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      items: [
        { label: "ChatGPT Prompt Assistant", icon: "smart_toy", onClick: handleOpenChatGpt },
        { label: "Open Campaign Assets", icon: "folder_open", onClick: handleOpenDrive },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Student Submission Guide", icon: "help_outline", onClick: () => { setShowHelpModal(true); setActiveMenuDropdown(null); } },
      ],
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dadce0] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900 shadow-sm select-none">
      {/* ---------------------------------------------------------------- */}
      {/* ROW 1: GOOGLE SHEETS AUTHENTIC TITLE BAR                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dadce0] dark:border-zinc-800 bg-surface-lowest px-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Back to all campaigns button */}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface-lowest px-2 py-1 text-xs font-bold text-on-surface-variant hover:text-[#0F9D58] hover:border-[#0F9D58]/60 transition shadow-xs"
            title="Back to all campaigns"
          >
            <Icon name="arrow_back" className="text-sm" />
            <span className="hidden sm:inline">Campaigns</span>
          </button>

          {/* Authentic Google Sheets Icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0F9D58] text-white shadow-xs">
            <Icon name="table_chart" className="text-base" />
          </div>

          {/* Title, Star, and Cloud Sync */}
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <h1 className="truncate text-sm sm:text-base font-black text-on-surface tracking-tight">
              {campaign.client_name}{" "}
              <span className="font-normal text-on-surface-variant hidden md:inline">
                – Social Media Calendar
              </span>
            </h1>

            {/* Star button */}
            <button
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className="text-on-surface-variant hover:text-amber-500 p-0.5"
              title={isStarred ? "Starred" : "Star"}
            >
              <Icon
                name={isStarred ? "star" : "star_border"}
                className={`text-sm ${isStarred ? "text-amber-500" : ""}`}
              />
            </button>

            {/* Cloud Sync Status */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold ml-1">
              <Icon name="cloud_done" className="text-xs" />
              <span>All changes saved to Drive</span>
            </span>
          </div>
        </div>

        {/* Right side: Collaborators, Status, Profile & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Collaborator Avatars (Presence Bubbles) */}
          {members.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden p-0.5" title="Active Teammates">
              {members.slice(0, 4).map((m: any, idx: number) => {
                const isMe = m.student_id === currentUserId;
                const name = m.student?.full_name || "Student";
                const initials = name
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const colors = [
                  "bg-emerald-600 text-white ring-emerald-300",
                  "bg-blue-600 text-white ring-blue-300",
                  "bg-purple-600 text-white ring-purple-300",
                  "bg-amber-600 text-white ring-amber-300",
                ];
                const colorClass = isMe
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-500 font-black"
                  : colors[idx % colors.length];

                return (
                  <span
                    key={m.student_id}
                    title={`${name} ${isMe ? "(You)" : ""}`}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-surface-lowest shadow-xs ${colorClass}`}
                  >
                    {initials || "S"}
                  </span>
                );
              })}
              {members.length > 4 && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-container text-[9px] font-bold text-on-surface ring-2 ring-surface-lowest shadow-xs">
                  +{members.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Ongoing Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Ongoing
          </span>

          {/* Profile & Password */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("open-account-settings"));
              }
            }}
            title="Edit your email, phone, or password"
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-[11px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/40 shadow-xs transition"
          >
            <Icon name="manage_accounts" className="text-xs text-primary" />
            <span className="hidden sm:inline">Profile</span>
          </button>

          {/* Compact View Toggle (Collapses Menus & Toolbar Ribbon) */}
          <button
            type="button"
            onClick={() => setIsCompactMode(!isCompactMode)}
            title={isCompactMode ? "Expand Menus & Toolbar Ribbon" : "Compact Mode (Hide Menus & Toolbar Ribbon for extra sheet space)"}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold shadow-xs transition ${
              isCompactMode
                ? "bg-[#0F9D58] text-white border-[#0F9D58]"
                : "border-outline-variant bg-surface-lowest text-on-surface hover:text-[#0F9D58] hover:border-[#0F9D58]/60"
            }`}
          >
            <Icon name={isCompactMode ? "unfold_more" : "unfold_less"} className="text-sm" />
            <span className="hidden md:inline">{isCompactMode ? "Expand Menus" : "Compact View"}</span>
          </button>

          {/* Fullscreen / Maximize Workspace button */}
          <button
            type="button"
            onClick={onToggleMaximize}
            title={isMaximized ? "Exit Fullscreen (Esc)" : "Maximize Spreadsheet Space"}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold shadow-xs transition ${
              isMaximized
                ? "bg-[#0F9D58] text-white border-[#0F9D58]"
                : "border-outline-variant bg-surface-lowest text-on-surface hover:text-[#0F9D58] hover:border-[#0F9D58]/60"
            }`}
          >
            <Icon name={isMaximized ? "fullscreen_exit" : "fullscreen"} className="text-sm" />
            <span className="hidden md:inline">{isMaximized ? "Exit Maximize" : "Maximize Space"}</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ROW 2: GOOGLE SHEETS TEXT MENU BAR (File, Edit, View, Insert...) */}
      {/* ---------------------------------------------------------------- */}
      {!isCompactMode && (
        <div className="flex items-center gap-1 px-3 py-1 bg-surface-lowest border-b border-[#dadce0] dark:border-zinc-800 text-xs font-semibold text-on-surface animate-in fade-in duration-150" data-sheets-menu>
          {menus.map((menu) => {
            const isOpen = activeMenuDropdown === menu.id;
            return (
              <div key={menu.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenuDropdown(isOpen ? null : menu.id)}
                  className={`rounded px-2 py-0.5 text-xs text-on-surface transition hover:bg-surface-low ${
                    isOpen ? "bg-surface-low font-bold text-[#0F9D58]" : ""
                  }`}
                >
                  {menu.label}
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 min-w-[210px] rounded-xl border border-outline-variant/80 bg-surface-lowest p-1 shadow-lg z-50 animate-in fade-in duration-100">
                    {menu.items.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={item.onClick}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-on-surface hover:bg-surface-low hover:text-[#0F9D58] transition"
                      >
                        <Icon name={item.icon} className="text-sm shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ribbon Collapse Chevron Button */}
          <button
            type="button"
            onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
            title={isRibbonCollapsed ? "Expand Toolbar Ribbon" : "Collapse Toolbar Ribbon"}
            className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-low transition"
          >
            <span className="hidden sm:inline">{isRibbonCollapsed ? "Show Toolbar" : "Hide Toolbar"}</span>
            <Icon name={isRibbonCollapsed ? "keyboard_arrow_down" : "keyboard_arrow_up"} className="text-sm" />
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ROW 3: ICONIC ACTION TOOLBAR RIBBON (The Google Sheets Toolbar)  */}
      {/* ---------------------------------------------------------------- */}
      {!isCompactMode && !isRibbonCollapsed && (
        <div className="flex items-center gap-1 overflow-x-auto px-2.5 py-1 bg-[#edf2fa] dark:bg-zinc-800/80 border-b border-[#dadce0] dark:border-zinc-800 text-xs text-on-surface hide-scrollbar animate-in fade-in duration-150">
        {/* Undo / Redo */}
        <button
          type="button"
          disabled
          title="Undo (Ctrl+Z)"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 cursor-not-allowed hover:bg-black/5"
        >
          <Icon name="undo" className="text-sm" />
        </button>
        <button
          type="button"
          disabled
          title="Redo (Ctrl+Y)"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 cursor-not-allowed hover:bg-black/5"
        >
          <Icon name="redo" className="text-sm" />
        </button>

        {/* Print / Export */}
        <button
          type="button"
          onClick={handleDownloadCsv}
          title="Download as CSV spreadsheet"
          className="flex h-7 w-7 items-center justify-center rounded text-on-surface hover:bg-black/10 dark:hover:bg-white/10 transition"
        >
          <Icon name="table_view" className="text-sm text-emerald-700 dark:text-emerald-400" />
        </button>
        <button
          type="button"
          onClick={handlePrint}
          title="Print Spreadsheet (Ctrl+P)"
          className="flex h-7 w-7 items-center justify-center rounded text-on-surface hover:bg-black/10 dark:hover:bg-white/10 transition"
        >
          <Icon name="print" className="text-sm" />
        </button>

        <div className="h-4 w-px bg-outline-variant/60 shrink-0 mx-0.5" />

        {/* Zoom scale */}
        <div className="flex items-center gap-0.5 bg-surface-lowest rounded-md px-1 py-0.5 border border-outline-variant/40 shrink-0">
          <button
            type="button"
            onClick={() => onChangeZoom(-10)}
            title="Zoom out"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-surface-low text-[10px] font-bold"
          >
            -
          </button>
          <span className="text-[10px] font-mono font-bold px-1 min-w-[34px] text-center" title="Current zoom level">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={() => onChangeZoom(10)}
            title="Zoom in"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-surface-low text-[10px] font-bold"
          >
            +
          </button>
        </div>

        <div className="h-4 w-px bg-outline-variant/60 shrink-0 mx-0.5" />

        {/* Formatting: Bold, Italic, Strikethrough */}
        <button
          type="button"
          onClick={onToggleBold}
          title="Toggle Bold text formatting"
          className={`flex h-7 w-7 items-center justify-center rounded font-serif font-black transition ${
            isBold ? "bg-[#0F9D58] text-white shadow-xs" : "hover:bg-black/10 dark:hover:bg-white/10"
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={onToggleItalic}
          title="Toggle Italic text formatting"
          className={`flex h-7 w-7 items-center justify-center rounded font-serif italic font-bold transition ${
            isItalic ? "bg-[#0F9D58] text-white shadow-xs" : "hover:bg-black/10 dark:hover:bg-white/10"
          }`}
        >
          I
        </button>

        <div className="h-4 w-px bg-outline-variant/60 shrink-0 mx-0.5" />

        {/* Alignment */}
        <button
          type="button"
          title="Align Left"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
        >
          <Icon name="format_align_left" className="text-sm" />
        </button>
        <button
          type="button"
          title="Align Center"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
        >
          <Icon name="format_align_center" className="text-sm" />
        </button>

        <div className="h-4 w-px bg-outline-variant/60 shrink-0 mx-0.5" />

        {/* Key Action: Insert / Submit Link (Highlighted) */}
        <button
          type="button"
          onClick={onQuickSubmitLink}
          title="Paste your Google Drive & Docs work links"
          className="inline-flex items-center gap-1 rounded-md bg-[#0F9D58] text-white px-2.5 py-1 text-xs font-bold hover:bg-[#0F9D58]/90 shadow-xs shrink-0"
        >
          <Icon name="add_link" className="text-sm" />
          <span>+ Submit Work Link</span>
        </button>

        {/* Open Central Drive Folder */}
        <button
          type="button"
          onClick={handleOpenDrive}
          title="Open Google Drive folder"
          className="inline-flex items-center gap-1 rounded-md bg-surface-lowest border border-outline-variant/50 px-2 py-1 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-700 shrink-0 shadow-xs"
        >
          <Icon name="folder_shared" className="text-sm text-emerald-600" />
          <span className="hidden lg:inline">Drive Folder</span>
        </button>

        {/* ChatGPT Prompt Assistant */}
        <button
          type="button"
          onClick={handleOpenChatGpt}
          title="Open ChatGPT script writer"
          className="inline-flex items-center gap-1 rounded-md bg-surface-lowest border border-outline-variant/50 px-2 py-1 text-xs font-semibold hover:border-primary hover:text-primary shrink-0 shadow-xs"
        >
          <Icon name="smart_toy" className="text-sm text-primary" />
          <span className="hidden lg:inline">ChatGPT</span>
        </button>

        {/* Reload */}
        <button
          type="button"
          onClick={() => void onReload()}
          title="Reload latest plan & submissions"
          className="flex h-7 w-7 items-center justify-center rounded text-on-surface hover:bg-black/10 dark:hover:bg-white/10 ml-auto shrink-0"
        >
          <Icon name="refresh" className="text-sm" />
        </button>
      </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-lowest p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
              <h3 className="text-sm font-black text-on-surface flex items-center gap-1.5">
                <Icon name="help_outline" className="text-[#0F9D58]" /> Google Sheets Submission Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
              <p>
                <strong>1. Follow Daily Guidelines:</strong> Each row represents one calendar day with its theme, brief, and prompt.
              </p>
              <p>
                <strong>2. Submit Both Links:</strong> You can submit both your <strong>Google Drive video link</strong> and <strong>Google Docs script link</strong> in Column C.
              </p>
              <p>
                <strong>3. Daily Winner Benchmark ⭐:</strong> Teachers review daily submissions and select the best submission as the official benchmark!
              </p>
              <p>
                <strong>4. Maximize Space:</strong> Use the <strong>Maximize Space</strong> button in the top right to expand this spreadsheet to full screen.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-lg bg-[#0F9D58] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0F9D58]/90"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
