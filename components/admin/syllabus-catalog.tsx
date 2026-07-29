"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { SyllabusManager, type SyllabusStudent } from "@/components/admin/syllabus-manager";
import type { Course, CourseTopic, Task } from "@/lib/supabase/types";

export type SyllabusBundle = {
  course: Course;
  topics: CourseTopic[];
  students: SyllabusStudent[];
  existingTasks: Task[];
};

type Props = {
  bundles: SyllabusBundle[];
  canAssign: boolean;
  canEdit: boolean;
};

export function SyllabusCatalog({ bundles, canAssign, canEdit }: Props) {
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  return (
    <div>
      <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Academic roadmap</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Syllabus</h1>
        <p className="mt-3 max-w-4xl text-base text-on-surface-variant md:text-lg">
          Select a course to review its Excel-style curriculum, edit topics, or assign them to enrolled students.
        </p>
      </header>

      {bundles.length === 0 ? (
        <section className="rounded-lg border border-outline-variant bg-surface p-8 text-center">
          <Icon name="menu_book" className="text-5xl text-primary" />
          <h2 className="mt-4 text-xl font-bold">No syllabus found</h2>
          <p className="mt-2 text-on-surface-variant">Run the curriculum migrations, then reload this page.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle) => {
            const isOpen = openCourseId === bundle.course.id;

            return (
              <section key={bundle.course.id} className="overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenCourseId(isOpen ? null : bundle.course.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-surface-container-low"
                >
                  <span>
                    <span className="block text-xl font-extrabold">{bundle.course.title}</span>
                    <span className="mt-1 block text-sm text-on-surface-variant">
                      {bundle.topics.length} spreadsheet rows
                    </span>
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-primary">
                    <Icon name={isOpen ? "expand_less" : "expand_more"} />
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-outline-variant p-4">
                    <SyllabusManager
                      course={bundle.course}
                      topics={bundle.topics}
                      students={bundle.students}
                      existingTasks={bundle.existingTasks}
                      canAssign={canAssign}
                      canEdit={canEdit}
                      showPageHeader={false}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
