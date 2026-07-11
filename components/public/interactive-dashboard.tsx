"use client";

import { Icon } from "@/components/icon";

export function InteractiveDashboard() {
  const loginBenefits = [
    {
      icon: "assignment_turned_in",
      title: "Personal Training Dashboard",
      text: "Track assigned tasks, deadlines, and progress in one place.",
    },
    {
      icon: "reviews",
      title: "Mentor Feedback & Scores",
      text: "Receive reviews, scores, and improvement notes after each submission.",
    },
    {
      icon: "folder_open",
      title: "Course Resources Access",
      text: "Access videos, documents, links, and project resources.",
    },
  ];

  return (
    <div className="w-full min-w-0 max-w-[420px] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-[#DDE6F5] min-[380px]:p-5 sm:p-6 lg:max-w-md">
      {/* Header Info */}
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#DDE6F5] pb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5B6B88]">Interactive Demo</p>
          <h3 className="text-lg font-black text-[#062B7F]">Student Login Benefits</h3>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#DFF3FF] px-2.5 py-1 text-[10px] font-bold text-[#062B7F] min-[380px]:px-3 min-[380px]:text-xs">
          <span className="h-2 w-2 rounded-full bg-[#062B7F] animate-pulse" />
          <span>Active Session</span>
        </div>
      </div>

      {/* Benefits Content */}
      <div className="mt-5 flex min-h-[230px] min-w-0 flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B88] pb-1">
            <span>Login benefits</span>
            <span>Student Access</span>
          </div>

          <div className="space-y-2.5">
            {loginBenefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                  index === 0
                    ? "border-[#062B7F]/30 bg-[#EEF4FF]/60"
                    : "border-[#DDE6F5] bg-white"
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#062B7F] shadow-inner-light">
                  <Icon name={benefit.icon} className="text-lg" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-snug text-[#071A3B]">{benefit.title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#5B6B88]">{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA inside card */}
        <div className="mt-5 pt-4 border-t border-[#DDE6F5] flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/apply"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#062B7F] py-2.5 text-xs font-bold text-white shadow hover:bg-[#071A3B] transition sm:w-auto px-4"
          >
            Apply Now
          </a>
          <a
            href="/login"
            className="text-center text-xs font-bold text-[#062B7F] hover:underline"
          >
            Login Preview
          </a>
        </div>
      </div>
    </div>
  );
}
