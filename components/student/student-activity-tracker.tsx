"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const HEARTBEAT_MS = 30_000;

export function StudentActivityTracker() {
  const pathname = usePathname();
  const lastTick = useRef(Date.now());
  const supabase = useRef(createSupabaseBrowserClient()).current;

  useEffect(() => {
    lastTick.current = Date.now();
    void supabase.rpc("record_student_activity", {
      p_event_type: "page_view",
      p_path: pathname,
      p_label: document.title,
      p_active_seconds: 0,
    });
  }, [pathname, supabase]);

  useEffect(() => {
    const heartbeat = () => {
      const now = Date.now();
      const seconds = document.visibilityState === "visible"
        ? Math.min(60, Math.max(0, Math.round((now - lastTick.current) / 1000)))
        : 0;
      lastTick.current = now;
      if (!seconds) return;
      void supabase.rpc("record_student_activity", {
        p_event_type: "heartbeat",
        p_path: window.location.pathname,
        p_label: null,
        p_active_seconds: seconds,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") heartbeat();
      else lastTick.current = Date.now();
    };
    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const submitter = (event as SubmitEvent).submitter as HTMLElement | null;
      const label = submitter?.textContent?.trim() || form.getAttribute("aria-label") || "Form submitted";
      void supabase.rpc("record_student_activity", {
        p_event_type: "submit",
        p_path: window.location.pathname,
        p_label: label.slice(0, 500),
        p_active_seconds: 0,
      });
    };

    const timer = window.setInterval(heartbeat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      heartbeat();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [supabase]);

  return null;
}
