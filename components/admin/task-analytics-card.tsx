"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export function TaskAnalyticsCard({
  label,
  count,
  icon,
  active,
  onClick,
  description,
}: {
  label: string;
  count: number;
  icon: string;
  active: boolean;
  onClick: () => void;
  description: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex min-h-36 flex-col justify-between rounded-xl border p-4 text-left shadow-sm transition-all",
        active
          ? "border-primary bg-primary text-on-primary shadow-lg"
          : "border-outline-variant/60 bg-surface hover:border-primary/50 hover:bg-surface-container-low",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", active ? "bg-white/15" : "bg-primary/10 text-primary")}>
          <Icon name={icon} className="text-[24px]" />
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", active ? "bg-secondary-container text-on-secondary-fixed" : "bg-surface-container text-primary")}>
          View
        </span>
      </div>
      <div>
        <p className={cn("text-3xl font-black leading-none", active ? "text-white" : "text-on-surface")}>{count}</p>
        <h3 className={cn("mt-2 text-sm font-bold leading-snug", active ? "text-white" : "text-on-surface")}>{label}</h3>
        <p className={cn("mt-1 text-xs leading-relaxed", active ? "text-blue-100" : "text-on-surface-variant")}>{description}</p>
      </div>
    </motion.button>
  );
}
