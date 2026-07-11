"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export function Toast({ toast, onClear }: { toast: ToastState; onClear: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onClear();
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onClear]);

  if (!toast) return null;

  return (
    <div
      className={cn(
        "fixed right-5 top-5 z-50 max-w-sm rounded-xl px-5 py-4 text-sm font-semibold shadow-2xl transition-all",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        toast.type === "success" && "bg-green-600 text-white",
        toast.type === "error" && "bg-error text-white",
        toast.type === "info" && "bg-primary text-white",
      )}
    >
      {toast.message}
    </div>
  );
}
