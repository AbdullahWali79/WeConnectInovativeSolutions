"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { StudentProgress } from "@/components/student/student-progress";
import type { Profile } from "@/lib/supabase/types";

export function StudentReportsManager({ students }: { students: Profile[] }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [studentSearch, setStudentSearch] = useState("");
  const visibleStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.id === studentId || [student.full_name, student.email, student.phone].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [studentId, studentSearch, students]);
  const selectedStudent = students.find((student) => student.id === studentId);

  return (
    <>
      <PageHeader
        eyebrow="Students"
        title="Reports"
        description="Select a student to download their complete task or project report as PDF or Excel."
      />
      <section className="wc-card mb-6 grid gap-4 p-5 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_auto] lg:items-end">
        <label className="block">
          <span className="wc-label">Search student</span>
          <span className="relative mt-2 block">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              className="wc-input pl-12"
              placeholder="Search name, email or phone..."
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
          </span>
        </label>
        <label className="block">
          <span className="wc-label">Student</span>
          <select className="wc-input mt-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.length === 0 ? <option value="">No students available</option> : null}
            {visibleStudents.length === 0 && students.length > 0 ? <option value="">No matching student</option> : null}
            {visibleStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name || student.email || "Student"}{student.email && student.full_name ? ` (${student.email})` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Link className="wc-primary-btn" href={`/admin/submissions?studentId=${encodeURIComponent(studentId)}`} aria-disabled={!studentId}>
            <Icon name="rate_review" /> Review Tasks
          </Link>
          <Link className="wc-secondary-btn" href={`/admin/projects?studentId=${encodeURIComponent(studentId)}`} aria-disabled={!studentId}>
            <Icon name="folder_open" /> Review Projects
          </Link>
        </div>
        {selectedStudent ? <p className="text-xs text-on-surface-variant lg:col-span-3">Showing complete drill-down for <strong>{selectedStudent.full_name || selectedStudent.email}</strong>.</p> : null}
      </section>
      {studentId ? <StudentProgress key={studentId} targetStudentId={studentId} adminMode /> : null}
    </>
  );
}
