"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StudentProgress } from "@/components/student/student-progress";
import type { Profile } from "@/lib/supabase/types";

export function StudentReportsManager({ students }: { students: Profile[] }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  return (
    <>
      <PageHeader
        eyebrow="Students"
        title="Reports"
        description="Select a student to download their complete task or project report as PDF or Excel."
      />
      <section className="wc-card mb-6 p-5">
        <label className="block max-w-xl">
          <span className="wc-label">Student</span>
          <select className="wc-input mt-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.length === 0 ? <option value="">No students available</option> : null}
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name || student.email || "Student"}{student.email && student.full_name ? ` (${student.email})` : ""}
              </option>
            ))}
          </select>
        </label>
      </section>
      {studentId ? <StudentProgress key={studentId} targetStudentId={studentId} adminMode /> : null}
    </>
  );
}
