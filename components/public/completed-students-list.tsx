"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import type { CompletedStudentShowcase } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

type CompletedStudentSource = "certificate_record" | "manual_record" | "completed_trainee";
type CompletedStudentRow = CompletedStudentShowcase & {
  source_type?: CompletedStudentSource;
};

type CompletedStudentsListProps = {
  students: CompletedStudentRow[];
};

const sourceLabels: Record<CompletedStudentSource, string> = {
  certificate_record: "Certificate Records",
  manual_record: "Manual Records",
  completed_trainee: "Completed Trainees",
};

function formatScore(score: number | null) {
  if (score == null) return "0";
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function progressValue(progress: number | null) {
  const value = progress ?? 100;
  return Math.max(0, Math.min(100, value));
}

export function CompletedStudentsList({ students }: CompletedStudentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const courses = useMemo(
    () =>
      Array.from(new Set(students.map((student) => student.course_name).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const studentName = student.student_name ?? "";
      const courseName = student.course_name ?? "";
      const matchesSearch =
        !normalizedSearch ||
        studentName.toLowerCase().includes(normalizedSearch) ||
        courseName.toLowerCase().includes(normalizedSearch);
      const matchesCourse = courseFilter === "all" || courseName === courseFilter;
      const matchesSource = sourceFilter === "all" || student.source_type === sourceFilter;

      return matchesSearch && matchesCourse && matchesSource;
    });
  }, [courseFilter, searchTerm, sourceFilter, students]);

  if (students.length === 0) {
    return (
      <EmptyState
        title="No completed students yet"
        description="Completed students will appear here as they finish their training programs."
        icon="workspace_premium"
      />
    );
  }

  return (
    <>
      <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_240px]">
        <label className="relative block">
          <span className="sr-only">Search completed students</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-primary" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by student name or course"
            className="h-14 w-full rounded-lg border border-outline-variant bg-surface-lowest pl-12 pr-4 text-on-surface shadow-inner-light outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Filter by course</span>
          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="h-14 w-full rounded-lg border border-outline-variant bg-surface-lowest px-4 text-on-surface shadow-inner-light outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </label>

        <label className="relative block">
          <span className="sr-only">Filter by record type</span>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-14 w-full rounded-lg border border-outline-variant bg-surface-lowest px-4 text-on-surface shadow-inner-light outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Completed Records</option>
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-on-surface-variant">
        <p>
          Showing <span className="font-bold text-primary">{filteredStudents.length}</span> of{" "}
          <span className="font-bold text-primary">{students.length}</span> completed students
        </p>
        {(searchTerm || courseFilter !== "all" || sourceFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setCourseFilter("all");
              setSourceFilter("all");
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-bold text-primary transition hover:bg-surface-container-low"
          >
            <Icon name="close" className="text-base" />
            Clear
          </button>
        )}
      </div>

      {filteredStudents.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-lowest shadow-card md:block">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-label-sm uppercase tracking-widest text-primary">
                <tr>
                  <th className="p-5">Student Name</th>
                  <th className="p-5">Course Name</th>
                  <th className="p-5">Record Type</th>
                  <th className="p-5">Progress</th>
                  <th className="p-5">Final Score</th>
                  <th className="p-5">Completion Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filteredStudents.map((student) => {
                  const progress = progressValue(student.progress_percentage);

                  return (
                    <tr key={student.id} className="transition-colors hover:bg-surface-container-lowest/80">
                      <td className="p-5 font-bold text-on-surface">{student.student_name ?? "Student"}</td>
                      <td className="p-5 text-on-surface-variant">{student.course_name ?? "Course"}</td>
                      <td className="p-5">
                        <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-bold text-primary">
                          {student.source_type ? sourceLabels[student.source_type] : "Certificate Records"}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-container-low">
                            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-sm font-bold text-primary">{progress}%</span>
                        </div>
                      </td>
                      <td className="p-5 font-bold text-on-surface">{formatScore(student.final_score)}</td>
                      <td className="p-5 text-on-surface-variant">{formatDate(student.completed_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filteredStudents.map((student) => {
              const progress = progressValue(student.progress_percentage);

              return (
                <article key={student.id} className="rounded-lg border border-outline-variant/50 bg-surface-lowest p-5 shadow-card">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-primary">Student Name</p>
                      <h2 className="mt-1 text-lg font-bold text-on-surface">{student.student_name ?? "Student"}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold uppercase tracking-widest text-primary">Score</p>
                      <p className="mt-1 text-lg font-bold text-on-surface">{formatScore(student.final_score)}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Course Name</p>
                    <p className="mt-1 text-on-surface-variant">{student.course_name ?? "Course"}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Record Type</p>
                    <p className="mt-1 text-on-surface-variant">{student.source_type ? sourceLabels[student.source_type] : "Certificate Records"}</p>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold uppercase tracking-widest text-primary">Progress</p>
                      <span className="text-sm font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Completion Date</p>
                    <p className="mt-1 text-on-surface-variant">{formatDate(student.completed_at)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-outline-variant/50 bg-surface-lowest p-8 text-center shadow-card">
          <Icon name="search_off" className="text-4xl text-primary" />
          <h2 className="mt-3 text-xl font-extrabold text-on-surface">No matching student found</h2>
          <p className="mt-2 text-on-surface-variant">Try another student name or course filter.</p>
        </div>
      )}
    </>
  );
}
