import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  pending: "bg-secondary-container text-on-secondary-fixed",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-error-container text-on-error-container",
  active: "bg-primary-fixed text-on-primary-fixed",
  inactive: "bg-slate-100 text-slate-600",
  completed: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  pending_fee: "bg-amber-100 text-amber-700",
  overdue: "bg-error-container text-on-error-container",
  waived: "bg-slate-100 text-slate-600",
  blocked: "bg-error-container text-on-error-container",
  dropped: "bg-slate-200 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  reviewed: "bg-green-100 text-green-700",
  revision_required: "bg-orange-100 text-orange-700",
  in_progress: "bg-primary-fixed text-on-primary-fixed",
};

const labelMap: Record<string, string> = {
  reviewed: "Accepted",
  submitted: "Submitted",
  revision_required: "Revision required",
};

export function StatusPill({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", toneClasses[value] ?? "bg-slate-100 text-slate-600", className)}>
      {labelMap[value] ?? value.replaceAll("_", " ")}
    </span>
  );
}
