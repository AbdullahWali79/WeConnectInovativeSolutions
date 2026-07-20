"use client";

import { Icon } from "@/components/icon";

export type SocialTodayReportRow = {
  name: string;
  submitted: number;
};

export function SocialTodayReportButton({ rows, target }: { rows: SocialTodayReportRow[]; target: number }) {
  function downloadReport() {
    const rowsPerColumn = Math.max(Math.ceil(rows.length / 2), 1);
    const width = 1600;
    const padding = 60;
    const headerHeight = 190;
    const columnHeaderHeight = 52;
    const rowHeight = 48;
    const footerHeight = 72;
    const gap = 32;
    const height = headerHeight + 24 + columnHeaderHeight + rowsPerColumn * rowHeight + footerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    const achieved = rows.filter((row) => row.submitted >= target).length;
    const incomplete = rows.length - achieved;
    const reportDate = new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    context.fillStyle = "#f6f9fd";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#15558a";
    context.fillRect(0, 0, width, headerHeight);
    context.fillStyle = "#bfdbfe";
    context.font = "700 21px Arial, sans-serif";
    context.fillText("TODAY SOCIAL MEDIA REPORT", padding, 48);
    context.fillStyle = "#ffffff";
    context.font = "700 40px Arial, sans-serif";
    context.fillText("Paid Active Students Weekly Progress", padding, 103);
    context.fillStyle = "#dbeafe";
    context.font = "22px Arial, sans-serif";
    context.fillText(`${reportDate}  |  Target: ${target} posts  |  Active: ${rows.length}  |  Achieved: ${achieved}  |  Incomplete: ${incomplete}`, padding, 150);

    const columnWidth = (width - padding * 2 - gap) / 2;
    const drawColumn = (columnRows: SocialTodayReportRow[], columnIndex: number, startNumber: number) => {
      const x = padding + columnIndex * (columnWidth + gap);
      const top = headerHeight + 24;
      context.fillStyle = "#e8f0f7";
      context.fillRect(x, top, columnWidth, columnHeaderHeight);
      context.fillStyle = "#15558a";
      context.font = "700 17px Arial, sans-serif";
      context.textAlign = "left";
      context.fillText("#", x + 16, top + 33);
      context.fillText("ACTIVE STUDENT", x + 55, top + 33);
      context.textAlign = "right";
      context.fillText("POSTS", x + columnWidth - 145, top + 33);
      context.fillText("STATUS", x + columnWidth - 18, top + 33);

      columnRows.forEach((row, index) => {
        const y = top + columnHeaderHeight + index * rowHeight;
        const complete = row.submitted >= target;
        context.fillStyle = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        context.fillRect(x, y, columnWidth, rowHeight);
        context.strokeStyle = "#e2e8f0";
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + columnWidth, y); context.stroke();
        context.fillStyle = "#64748b";
        context.font = "16px Arial, sans-serif";
        context.textAlign = "left";
        context.fillText(String(startNumber + index), x + 16, y + 31);
        context.fillStyle = "#0f172a";
        context.font = "700 17px Arial, sans-serif";
        const safeName = row.name.length > 34 ? `${row.name.slice(0, 31)}...` : row.name;
        context.fillText(safeName, x + 55, y + 31);
        context.textAlign = "right";
        context.fillStyle = "#0f172a";
        context.fillText(`${row.submitted}/${target}`, x + columnWidth - 145, y + 31);
        context.fillStyle = complete ? "#047857" : row.submitted > 0 ? "#b45309" : "#b91c1c";
        context.fillText(complete ? "ACHIEVED" : row.submitted > 0 ? "IN PROGRESS" : "NOT STARTED", x + columnWidth - 18, y + 31);
      });
    };

    drawColumn(rows.slice(0, rowsPerColumn), 0, 1);
    drawColumn(rows.slice(rowsPerColumn), 1, rowsPerColumn + 1);
    context.fillStyle = "#15558a";
    context.fillRect(0, height - footerHeight, width, footerHeight);
    context.fillStyle = "#ffffff";
    context.font = "700 18px Arial, sans-serif";
    context.textAlign = "left";
    context.fillText("WeConnect Innovative Solutions", padding, height - 28);
    context.textAlign = "right";
    context.fillText(`Generated ${reportDate}`, width - padding, height - 28);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `social-media-today-report-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(href);
    }, "image/png");
  }

  return <button type="button" onClick={downloadReport} className="wc-secondary-btn min-h-14 justify-center whitespace-nowrap"><Icon name="download" />Download Today Report</button>;
}
