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
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex min-h-32 flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200",
        active
          ? "border-primary bg-primary text-on-primary shadow-md ring-1 ring-primary"
          : "border-outline-variant bg-surface hover:border-primary/40 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg transition-colors", active ? "bg-white/20" : "bg-primary/10 text-primary group-hover:bg-primary/15")}>
          <Icon name={icon} className="text-[20px]" />
        </div>
        <span className={cn("rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors", active ? "bg-secondary-container text-on-secondary-fixed" : "bg-surface-container-low text-primary group-hover:bg-surface-container")}>
          View
        </span>
      </div>
      <div className="mt-4">
        <p className={cn("text-2xl font-black leading-none sm:text-3xl", active ? "text-white" : "text-on-surface")}>{count}</p>
        <h3 className={cn("mt-1.5 text-sm font-extrabold leading-tight", active ? "text-white" : "text-on-surface")}>{label}</h3>
        <p className={cn("mt-1 text-xs font-medium leading-relaxed opacity-90", active ? "text-blue-100" : "text-on-surface-variant")}>{description}</p>
      </div>
    </motion.button>
  );
}
