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
      <header className="mb-5 sm:mb-7">
        <p className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">Academic roadmap</p>
        <h1 className="mt-1.5 text-2xl font-extrabold sm:mt-2 sm:text-3xl md:text-4xl">Syllabus</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-on-surface-variant sm:mt-3 sm:text-base md:text-lg">
          Select a course to review its Excel-style curriculum, edit topics, or assign them to enrolled students.
        </p>
      </header>

      {bundles.length === 0 ? (
        <section className="rounded-xl border border-dashed border-outline-variant bg-surface-low p-10 text-center">
          <Icon name="menu_book" className="text-5xl text-on-surface-variant" />
          <h2 className="mt-4 text-xl font-bold">No syllabus found</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Run the curriculum migrations, then reload this page.</p>
        </section>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {bundles.map((bundle) => {
            const isOpen = openCourseId === bundle.course.id;

            return (
              <section key={bundle.course.id} className={`group overflow-hidden rounded-xl border transition-all duration-200 ${isOpen ? 'border-primary shadow-md ring-1 ring-primary' : 'border-outline-variant bg-surface hover:border-primary/40 hover:shadow-sm'}`}>
                <button
                  type="button"
                  onClick={() => setOpenCourseId(isOpen ? null : bundle.course.id)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors sm:p-5 ${isOpen ? 'bg-primary/5' : 'hover:bg-surface-container-low'}`}
                >
                  <span>
                    <span className="block text-base font-extrabold leading-snug sm:text-xl group-hover:text-primary transition-colors">{bundle.course.title}</span>
                    <span className="mt-1 block text-xs font-medium text-on-surface-variant sm:text-sm">
                      {bundle.topics.length} spreadsheet rows
                    </span>
                  </span>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors sm:h-11 sm:w-11 ${isOpen ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-primary group-hover:border-primary/30 group-hover:bg-primary/5'}`}>
                    <Icon name={isOpen ? "expand_less" : "expand_more"} />
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-outline-variant bg-surface-lowest p-3 sm:p-5">
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
