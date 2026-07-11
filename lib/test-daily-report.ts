// Standalone Test Script for WeConnect Daily Report System
// Run with: npx tsx lib/test-daily-report.ts

import * as assert from "assert";

// Types matching components/admin/task-analytics-dashboard.tsx
type StudentTaskDetail = {
  studentId: string;
  studentName: string;
  email: string;
  courseTitle: string;
  taskTitle?: string;
  joinedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  status: "submitted" | "pending";
  feedback?: string | null;
  taskStatus?: string | null;
};

type DailyCompactRow = {
  studentName: string;
  submittedCount: number;
  clientHuntingCount: number;
  feedback: string;
};

type DailyPendingReportRow = {
  studentId: string;
  studentName: string;
  taskTitles: string;
  clientHuntTitles: string;
  status: "submitted" | "pending";
};

// 1. Timezone Bound calculator in PKT (UTC+5)
function getPakistanDayBounds(dateStr: string): { startIso: string; endIso: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startPktInUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 5 * 60 * 60 * 1000);
  const endPktInUtc = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 5 * 60 * 60 * 1000);
  return {
    startIso: startPktInUtc.toISOString(),
    endIso: endPktInUtc.toISOString(),
  };
}

// 2. Compact row builder
function buildDailyCompactRows(
  activeStudents: StudentTaskDetail[],
  taskDetails: StudentTaskDetail[],
  reportDate: string,
): DailyCompactRow[] {
  if (!reportDate) return [];

  const { startIso, endIso } = getPakistanDayBounds(reportDate);

  const countsByStudent = new Map<string, {
    studentName: string;
    submittedCount: number;
    clientHuntingCount: number;
    feedbacks: string[];
  }>();

  for (const student of activeStudents) {
    countsByStudent.set(student.studentId, {
      studentName: student.studentName,
      submittedCount: 0,
      clientHuntingCount: 0,
      feedbacks: [],
    });
  }

  for (const detail of taskDetails) {
    const activeDate = detail.reviewedAt ?? detail.submittedAt;
    if (!activeDate || activeDate < startIso || activeDate >= endIso) continue;
    const entry = countsByStudent.get(detail.studentId);
    if (!entry) continue;

    entry.submittedCount += 1;
    if ((detail.taskTitle ?? "").toLowerCase().includes("client hunting")) {
      entry.clientHuntingCount += 1;
    }
    if (detail.taskStatus === "reviewed" && detail.feedback && detail.feedback.trim()) {
      entry.feedbacks.push(detail.feedback.trim());
    }
  }

  return Array.from(countsByStudent.values()).map((entry) => ({
    studentName: entry.studentName,
    submittedCount: entry.submittedCount,
    clientHuntingCount: entry.clientHuntingCount,
    feedback: entry.feedbacks.length > 0 ? entry.feedbacks.join("; ") : "No feedback",
  })).sort((first, second) => first.studentName.localeCompare(second.studentName));
}

// 3. Pending report row builder
function buildDailyReportRows(
  activeStudents: StudentTaskDetail[],
  taskDetails: StudentTaskDetail[],
  reportDate: string,
): DailyPendingReportRow[] {
  if (!reportDate) return [];

  const { startIso, endIso } = getPakistanDayBounds(reportDate);

  const titlesByStudent = new Map<string, Set<string>>();
  const clientHuntTitlesByStudent = new Map<string, Set<string>>();

  for (const detail of taskDetails) {
    const activeDate = detail.reviewedAt ?? detail.submittedAt;
    if (!activeDate || activeDate < startIso || activeDate >= endIso) continue;
    const title = detail.taskTitle?.trim();
    if (!title) continue;
    const existing = titlesByStudent.get(detail.studentId) ?? new Set<string>();
    existing.add(title);
    titlesByStudent.set(detail.studentId, existing);
    if (title.toLowerCase().includes("client hunting")) {
      const clientExisting = clientHuntTitlesByStudent.get(detail.studentId) ?? new Set<string>();
      clientExisting.add(title);
      clientHuntTitlesByStudent.set(detail.studentId, clientExisting);
    }
  }

  return activeStudents.map((student) => {
    const titles = Array.from(titlesByStudent.get(student.studentId) ?? []).sort((first, second) => first.localeCompare(second));
    const clientHuntTitles = Array.from(clientHuntTitlesByStudent.get(student.studentId) ?? []).sort((first, second) => first.localeCompare(second));
    return {
      studentId: student.studentId,
      studentName: student.studentName,
      taskTitles: titles.length > 0 ? titles.join(", ") : "Nothing Submitted",
      clientHuntTitles: clientHuntTitles.length > 0 ? clientHuntTitles.join(", ") : "Nothing Submitted",
      status: titles.length > 0 ? ("submitted" as const) : ("pending" as const),
    };
  }).sort((first, second) => first.studentName.localeCompare(second.studentName));
}

// Test Runner
function runTests() {
  console.log("=== DAILY REPORT SYSTEM UNIT TESTS ===");

  const activeStudents: StudentTaskDetail[] = [
    {
      studentId: "student_1",
      studentName: "Alice Student",
      email: "alice@example.com",
      courseTitle: "MERN Stack Development",
      joinedAt: "2026-06-01T00:00:00.000Z",
      status: "pending",
    },
    {
      studentId: "student_2",
      studentName: "Bob Student",
      email: "bob@example.com",
      courseTitle: "MERN Stack Development",
      joinedAt: "2026-06-02T00:00:00.000Z",
      status: "pending",
    },
  ];

  const taskDetails: StudentTaskDetail[] = [
    // Alice submits 1 task today (accepted with feedback)
    {
      studentId: "student_1",
      studentName: "Alice Student",
      email: "alice@example.com",
      courseTitle: "MERN Stack Development",
      taskTitle: "React Component Lifecycle",
      joinedAt: "2026-06-01T00:00:00.000Z",
      submittedAt: "2026-07-07T05:00:00.000Z", // today in bounds
      reviewedAt: "2026-07-07T05:05:00.000Z",  // today in bounds
      status: "submitted",
      taskStatus: "reviewed",
      feedback: "Alice did a great job on components!",
    },

    // Bob submits 3 tasks today:
    // Task 1: Submitted and reviewed today
    {
      studentId: "student_2",
      studentName: "Bob Student",
      email: "bob@example.com",
      courseTitle: "MERN Stack Development",
      taskTitle: "Express Middleware",
      joinedAt: "2026-06-02T00:00:00.000Z",
      submittedAt: "2026-07-07T06:00:00.000Z",
      reviewedAt: "2026-07-07T06:30:00.000Z",
      status: "submitted",
      taskStatus: "reviewed",
      feedback: "Bob, excellent middleware implementation.",
    },
    // Task 2: Submitted yesterday (2026-07-06 18:21:21Z, outside PKT July 7th bounds),
    // but reviewed/accepted today (2026-07-07 08:57:41Z, inside PKT July 7th bounds)
    // This replicates Muhammad Abdullah's case!
    {
      studentId: "student_2",
      studentName: "Bob Student",
      email: "bob@example.com",
      courseTitle: "MERN Stack Development",
      taskTitle: "MongoDB Schema Design",
      joinedAt: "2026-06-02T00:00:00.000Z",
      submittedAt: "2026-07-06T18:21:21.000Z", // outside bounds
      reviewedAt: "2026-07-07T08:57:41.000Z",  // inside bounds
      status: "submitted",
      taskStatus: "reviewed",
      feedback: "Please index the fields next time.",
    },
    // Task 3: Submitted today, no review date (under review/submitted status)
    {
      studentId: "student_2",
      studentName: "Bob Student",
      email: "bob@example.com",
      courseTitle: "MERN Stack Development",
      taskTitle: "Client Hunting Web Lead 1",
      joinedAt: "2026-06-02T00:00:00.000Z",
      submittedAt: "2026-07-07T11:00:00.000Z", // today in bounds
      reviewedAt: null,
      status: "submitted",
      taskStatus: "submitted",
      feedback: null,
    },

    // OUT OF BOUNDS: Yesterday submission (not reviewed today)
    {
      studentId: "student_1",
      studentName: "Alice Student",
      email: "alice@example.com",
      courseTitle: "MERN Stack Development",
      taskTitle: "HTML Basics",
      joinedAt: "2026-06-01T00:00:00.000Z",
      submittedAt: "2026-07-06T13:00:00.000Z",
      reviewedAt: "2026-07-06T14:00:00.000Z",
      status: "submitted",
      taskStatus: "reviewed",
      feedback: "Good HTML basic structure.",
    },

    // OUT OF BOUNDS: Tomorrow PKT submission
    {
      studentId: "student_2",
      studentName: "Bob Student",
      email: "bob@example.com",
      courseTitle: "MERN Stack Development",
      taskTitle: "CSS Grid layout",
      joinedAt: "2026-06-02T00:00:00.000Z",
      submittedAt: "2026-07-07T20:00:00.000Z",
      reviewedAt: "2026-07-07T21:00:00.000Z",
      status: "submitted",
      taskStatus: "reviewed",
      feedback: "Great Grid usage.",
    },
  ];

  // Run buildDailyCompactRows for 2026-07-07
  const compactRows = buildDailyCompactRows(activeStudents, taskDetails, "2026-07-07");

  console.log("Validating Daily Compact Report Rows...");
  assert.strictEqual(compactRows.length, 2, "Report must include exactly 2 active student rows");

  const aliceRow = compactRows.find((r) => r.studentName === "Alice Student")!;
  const bobRow = compactRows.find((r) => r.studentName === "Bob Student")!;

  // 1. Verify Alice
  console.log("Checking Alice Student details...");
  assert.strictEqual(aliceRow.submittedCount, 1, "Alice should have exactly 1 submitted task today");
  assert.strictEqual(aliceRow.feedback, "Alice did a great job on components!");

  // 2. Verify Bob (3 tasks should count: 2 reviewed/submitted today, plus 1 submitted yesterday but reviewed today)
  console.log("Checking Bob Student details...");
  assert.strictEqual(bobRow.submittedCount, 3, "Bob should have exactly 3 tasks today");
  assert.strictEqual(bobRow.clientHuntingCount, 1, "Bob should have exactly 1 client hunting task");
  assert.strictEqual(
    bobRow.feedback,
    "Bob, excellent middleware implementation.; Please index the fields next time.",
    "Bob feedback should combine today's reviews"
  );

  // 3. Verify total matches row totals
  console.log("Checking report totals...");
  const totalSubmitted = compactRows.reduce((sum, row) => sum + row.submittedCount, 0);
  assert.strictEqual(totalSubmitted, 4, "Total task count must be 4");

  console.log("✅ All Daily Compact Report tests passed!");
  console.log("=== TESTS PASSED SUCCESSFULLY ===");
}

runTests();
