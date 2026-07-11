"use client";

import { EmptyState } from "@/components/empty-state";
import type { StudentTaskDetail } from "@/app/admin/actions";
import { formatDate, formatDateTime } from "@/lib/utils";

export function TaskStudentDetailsTable({
  rows,
  emptyTitle = "No students found",
  emptyDescription = "Try changing the selected metric or filters.",
}: {
  rows: StudentTaskDetail[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon="fact_check" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
          <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
            <tr>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Course Title</th>
              <th className="px-4 py-3">Task Title</th>
              <th className="px-4 py-3">Joined Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {rows.map((row, index) => (
              <tr key={`${row.studentId}-${row.courseTitle}-${row.taskTitle ?? "active"}-${index}`} className="transition-colors hover:bg-surface-container-lowest">
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">{row.studentName}</p>
                </td>
                <td className="px-4 py-3 text-xs text-on-surface-variant">{row.email || "Not set"}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{row.courseTitle}</td>
                <td className="px-4 py-3 text-xs text-on-surface-variant">{row.taskTitle || "No assigned task"}</td>
                <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(row.joinedAt)}</td>
                <td className="px-4 py-3">
                  <span className={row.status === "submitted" ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700" : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800"}>
                    {row.status === "submitted" ? "Submitted" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-on-surface-variant">{row.submittedAt ? formatDateTime(row.submittedAt) : "Not submitted"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
