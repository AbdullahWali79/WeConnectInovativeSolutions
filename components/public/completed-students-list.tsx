"use client";
import { CmsElement } from "@/components/cms/cms-element";

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
      <CmsElement cmsId="968e1ab2-0" as="div" className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_240px]">
        <CmsElement cmsId="968e1ab2-1" as="label" className="relative block">
          <CmsElement cmsId="968e1ab2-2" as="span" className="sr-only">Search completed students</CmsElement>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-primary" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by student name or course"
            className="h-14 w-full rounded-lg border border-outline-variant bg-surface-lowest pl-12 pr-4 text-on-surface shadow-inner-light outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </CmsElement>

        <CmsElement cmsId="968e1ab2-3" as="label" className="relative block">
          <CmsElement cmsId="968e1ab2-4" as="span" className="sr-only">Filter by course</CmsElement>
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
        </CmsElement>

        <CmsElement cmsId="968e1ab2-5" as="label" className="relative block">
          <CmsElement cmsId="968e1ab2-6" as="span" className="sr-only">Filter by record type</CmsElement>
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
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="968e1ab2-7" as="div" className="mb-4 flex items-center justify-between gap-3 text-sm text-on-surface-variant">
        <CmsElement cmsId="968e1ab2-8" as="p">
          Showing <CmsElement cmsId="968e1ab2-9" as="span" className="font-bold text-primary">{filteredStudents.length}</CmsElement> of{" "}
          <CmsElement cmsId="968e1ab2-10" as="span" className="font-bold text-primary">{students.length}</CmsElement> completed students
        </CmsElement>
        {(searchTerm || courseFilter !== "all" || sourceFilter !== "all") && (
          <CmsElement cmsId="968e1ab2-11" as="button"
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
          </CmsElement>
        )}
      </CmsElement>

      {filteredStudents.length > 0 ? (
        <>
          <CmsElement cmsId="968e1ab2-12" as="div" className="hidden overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-lowest shadow-card md:block">
            <CmsElement cmsId="968e1ab2-13" as="table" className="w-full text-left">
              <CmsElement cmsId="968e1ab2-14" as="thead" className="bg-surface-container-low text-label-sm uppercase tracking-widest text-primary">
                <CmsElement cmsId="968e1ab2-15" as="tr">
                  <CmsElement cmsId="968e1ab2-16" as="th" className="p-5">Student Name</CmsElement>
                  <CmsElement cmsId="968e1ab2-17" as="th" className="p-5">Course Name</CmsElement>
                  <CmsElement cmsId="968e1ab2-18" as="th" className="p-5">Record Type</CmsElement>
                  <CmsElement cmsId="968e1ab2-19" as="th" className="p-5">Progress</CmsElement>
                  <CmsElement cmsId="968e1ab2-20" as="th" className="p-5">Final Score</CmsElement>
                  <CmsElement cmsId="968e1ab2-21" as="th" className="p-5">Completion Date</CmsElement>
                </CmsElement>
              </CmsElement>
              <CmsElement cmsId="968e1ab2-22" as="tbody" className="divide-y divide-outline-variant/50">
                {filteredStudents.map((student) => {
                  const progress = progressValue(student.progress_percentage);

                  return (
                    <CmsElement cmsId="968e1ab2-23" as="tr" instance={String(student.id)} key={student.id} className="transition-colors hover:bg-surface-container-lowest/80">
                      <CmsElement cmsId="968e1ab2-24" as="td" className="p-5 font-bold text-on-surface">{student.student_name ?? "Student"}</CmsElement>
                      <CmsElement cmsId="968e1ab2-25" as="td" className="p-5 text-on-surface-variant">{student.course_name ?? "Course"}</CmsElement>
                      <CmsElement cmsId="968e1ab2-26" as="td" className="p-5">
                        <CmsElement cmsId="968e1ab2-27" as="span" className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-bold text-primary">
                          {student.source_type ? sourceLabels[student.source_type] : "Certificate Records"}
                        </CmsElement>
                      </CmsElement>
                      <CmsElement cmsId="968e1ab2-28" as="td" className="p-5">
                        <CmsElement cmsId="968e1ab2-29" as="div" className="flex items-center gap-3">
                          <CmsElement cmsId="968e1ab2-30" as="div" className="h-2 w-16 overflow-hidden rounded-full bg-surface-container-low">
                            <CmsElement cmsId="968e1ab2-31" as="div" className="h-full bg-primary" style={{ width: `${progress}%` }} />
                          </CmsElement>
                          <CmsElement cmsId="968e1ab2-32" as="span" className="text-sm font-bold text-primary">{progress}%</CmsElement>
                        </CmsElement>
                      </CmsElement>
                      <CmsElement cmsId="968e1ab2-33" as="td" className="p-5 font-bold text-on-surface">{formatScore(student.final_score)}</CmsElement>
                      <CmsElement cmsId="968e1ab2-34" as="td" className="p-5 text-on-surface-variant">{formatDate(student.completed_at)}</CmsElement>
                    </CmsElement>
                  );
                })}
              </CmsElement>
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="968e1ab2-35" as="div" className="grid gap-4 md:hidden">
            {filteredStudents.map((student) => {
              const progress = progressValue(student.progress_percentage);

              return (
                <CmsElement cmsId="968e1ab2-36" as="article" instance={String(student.id)} key={student.id} className="rounded-lg border border-outline-variant/50 bg-surface-lowest p-5 shadow-card">
                  <CmsElement cmsId="968e1ab2-37" as="div" className="mb-4 flex items-start justify-between gap-4">
                    <CmsElement cmsId="968e1ab2-38" as="div">
                      <CmsElement cmsId="968e1ab2-39" as="p" className="text-sm font-bold uppercase tracking-widest text-primary">Student Name</CmsElement>
                      <CmsElement cmsId="968e1ab2-40" as="h2" className="mt-1 text-lg font-bold text-on-surface">{student.student_name ?? "Student"}</CmsElement>
                    </CmsElement>
                    <CmsElement cmsId="968e1ab2-41" as="div" className="text-right">
                      <CmsElement cmsId="968e1ab2-42" as="p" className="text-sm font-bold uppercase tracking-widest text-primary">Score</CmsElement>
                      <CmsElement cmsId="968e1ab2-43" as="p" className="mt-1 text-lg font-bold text-on-surface">{formatScore(student.final_score)}</CmsElement>
                    </CmsElement>
                  </CmsElement>

                  <CmsElement cmsId="968e1ab2-44" as="div" className="mb-4">
                    <CmsElement cmsId="968e1ab2-45" as="p" className="text-sm font-bold uppercase tracking-widest text-primary">Course Name</CmsElement>
                    <CmsElement cmsId="968e1ab2-46" as="p" className="mt-1 text-on-surface-variant">{student.course_name ?? "Course"}</CmsElement>
                  </CmsElement>

                  <CmsElement cmsId="968e1ab2-47" as="div" className="mb-4">
                    <CmsElement cmsId="968e1ab2-48" as="p" className="text-sm font-bold uppercase tracking-widest text-primary">Record Type</CmsElement>
                    <CmsElement cmsId="968e1ab2-49" as="p" className="mt-1 text-on-surface-variant">{student.source_type ? sourceLabels[student.source_type] : "Certificate Records"}</CmsElement>
                  </CmsElement>

                  <CmsElement cmsId="968e1ab2-50" as="div" className="mb-4">
                    <CmsElement cmsId="968e1ab2-51" as="div" className="mb-2 flex items-center justify-between">
                      <CmsElement cmsId="968e1ab2-52" as="p" className="text-sm font-bold uppercase tracking-widest text-primary">Progress</CmsElement>
                      <CmsElement cmsId="968e1ab2-53" as="span" className="text-sm font-bold text-primary">{progress}%</CmsElement>
                    </CmsElement>
                    <CmsElement cmsId="968e1ab2-54" as="div" className="h-2 overflow-hidden rounded-full bg-surface-container-low">
                      <CmsElement cmsId="968e1ab2-55" as="div" className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </CmsElement>
                  </CmsElement>

                  <CmsElement cmsId="968e1ab2-56" as="div">
                    <CmsElement cmsId="968e1ab2-57" as="p" className="text-sm font-bold uppercase tracking-widest text-primary">Completion Date</CmsElement>
                    <CmsElement cmsId="968e1ab2-58" as="p" className="mt-1 text-on-surface-variant">{formatDate(student.completed_at)}</CmsElement>
                  </CmsElement>
                </CmsElement>
              );
            })}
          </CmsElement>
        </>
      ) : (
        <CmsElement cmsId="968e1ab2-59" as="div" className="rounded-lg border border-outline-variant/50 bg-surface-lowest p-8 text-center shadow-card">
          <Icon name="search_off" className="text-4xl text-primary" />
          <CmsElement cmsId="968e1ab2-60" as="h2" className="mt-3 text-xl font-extrabold text-on-surface">No matching student found</CmsElement>
          <CmsElement cmsId="968e1ab2-61" as="p" className="mt-2 text-on-surface-variant">Try another student name or course filter.</CmsElement>
        </CmsElement>
      )}
    </>
  );
}
