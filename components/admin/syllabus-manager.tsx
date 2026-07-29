"use client";

import { Fragment, useMemo, useState } from "react";
import { updateCourseTopic, type CourseTopicInput } from "@/app/admin/actions";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, CourseTopic, Profile, Task } from "@/lib/supabase/types";

export type SyllabusStudent = Profile & {
  assignmentCourseId: string;
};

type Props = {
  course: Course | null;
  topics: CourseTopic[];
  students: SyllabusStudent[];
  existingTasks: Task[];
  canAssign: boolean;
  canEdit: boolean;
  showPageHeader?: boolean;
};

const webColumns = [
  "Day",
  "Topic",
  "Exact Video Title & Channel (English)",
  "Hindi / Urdu Alternative (Search Exact Title)",
  "Practice / Tough Project",
];

const pythonColumns = [
  "Day",
  "Project Name (Real-Time / Advanced)",
  "Covered Course Days (Syllabus)",
  "Key Concepts & Tech Stack Used",
];

function topicDescription(topic: CourseTopic, isPython: boolean) {
  return [
    `Day ${String(topic.day_number).padStart(2, "0")}: ${topic.title}`,
    topic.english_video ? `${isPython ? "Covered course days" : "English resource"}: ${topic.english_video}` : "",
    !isPython && topic.urdu_video ? `Hindi / Urdu resource: ${topic.urdu_video}` : "",
    topic.practice_project ? `${isPython ? "Key concepts and tech stack" : "Practice / tough project"}: ${topic.practice_project}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function SyllabusManager({
  course,
  topics,
  students,
  existingTasks,
  canAssign,
  canEdit,
  showPageHeader = true,
}: Props) {
  const isPython = Boolean(course?.title.toLowerCase().includes("python"));
  const columns = isPython ? pythonColumns : webColumns;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [topicRows, setTopicRows] = useState(topics);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>([]);
  const [assignedTasks, setAssignedTasks] = useState(existingTasks);
  const [studentSearch, setStudentSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState<CourseTopicInput | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const selectedTopics = topicRows.filter((topic) => selectedTopicIds.includes(topic.id));
  const visibleStudents = students.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    return !query || `${student.full_name ?? ""} ${student.email ?? ""}`.toLowerCase().includes(query);
  });

  function toggleValue(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function startEditing(topic: CourseTopic) {
    setEditingTopicId(topic.id);
    setTopicDraft({
      id: topic.id,
      day_number: topic.day_number,
      title: topic.title,
      english_video: topic.english_video,
      urdu_video: topic.urdu_video,
      practice_project: topic.practice_project,
    });
    if (!expandedTopicIds.includes(topic.id)) {
      setExpandedTopicIds((current) => [...current, topic.id]);
    }
  }

  function cancelEditing() {
    setEditingTopicId(null);
    setTopicDraft(null);
  }

  async function saveTopicChanges() {
    if (!topicDraft || !canEdit) {
      setToast({ type: "error", message: "You do not have permission to edit syllabus topics." });
      return;
    }

    setSavingTopic(true);
    const result = await updateCourseTopic(topicDraft);
    setSavingTopic(false);

    if (!result.success) {
      setToast({ type: "error", message: result.error });
      return;
    }

    setTopicRows((current) =>
      current
        .map((topic) => (topic.id === result.data.id ? result.data : topic))
        .sort((left, right) => left.day_number - right.day_number),
    );
    cancelEditing();
    setToast({ type: "success", message: "Syllabus topic updated successfully." });
  }

  async function assignSelectedTopics() {
    if (!course || !canAssign) {
      setToast({ type: "error", message: "You do not have permission to assign syllabus topics." });
      return;
    }
    if (selectedTopics.length === 0 || selectedStudentIds.length === 0) {
      setToast({ type: "error", message: "Select at least one topic and one active student." });
      return;
    }

    const duplicateKeys = new Set(
      assignedTasks.map((task) => `${task.student_id}:${task.title.trim().toLowerCase()}`),
    );

    const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id));
    const payloads = selectedStudents.flatMap((student) =>
      selectedTopics
        .filter((topic) => !duplicateKeys.has(`${student.id}:${topic.title.trim().toLowerCase()}`))
        .map((topic) => ({
          student_id: student.id,
          course_id: student.assignmentCourseId,
          workflow_type: "assigned" as const,
          title: topic.title,
          description: topicDescription(topic, isPython),
          max_score: 100,
        })),
    );

    if (payloads.length === 0) {
      setToast({ type: "info", message: "These topics are already assigned to the selected students." });
      return;
    }

    setAssigning(true);
    const { data, error } = await supabase.from("tasks").insert(payloads).select("*");
    setAssigning(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setAssignedTasks((current) => [...current, ...((data ?? []) as Task[])]);
    setToast({
      type: "success",
      message: `${payloads.length} topic assignment${payloads.length === 1 ? "" : "s"} sent successfully.`,
    });
  }

  return (
    <div>
      <Toast toast={toast} onClear={() => setToast(null)} />
      {showPageHeader ? <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Academic roadmap</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Syllabus</h1>
        <p className="mt-3 max-w-4xl text-base text-on-surface-variant md:text-lg">
          Excel-style curriculum rows for {course?.title ?? "your courses"}. Select individual topics or assign the complete syllabus.
        </p>
      </header> : null}

      {!course ? (
        <section className="rounded-lg border border-outline-variant bg-surface p-8 text-center">
          <Icon name="menu_book" className="text-5xl text-primary" />
          <h2 className="mt-4 text-xl font-bold">Syllabus not found</h2>
          <p className="mt-2 text-on-surface-variant">Run the curriculum migration, then reload this page.</p>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-lg border border-outline-variant bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">{course.title}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {topicRows.length} spreadsheet rows | {selectedTopicIds.length} selected
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedTopicIds(expandedTopicIds.length === topicRows.length ? [] : topicRows.map((topic) => topic.id))}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-bold text-primary"
                >
                  <Icon name={expandedTopicIds.length === topicRows.length ? "unfold_less" : "unfold_more"} />
                  {expandedTopicIds.length === topicRows.length ? "Collapse all" : "Expand all"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTopicIds(selectedTopicIds.length === topicRows.length ? [] : topicRows.map((topic) => topic.id))}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-on-primary"
                >
                  <Icon name={selectedTopicIds.length === topicRows.length ? "deselect" : "select_all"} />
                  {selectedTopicIds.length === topicRows.length ? "Clear topics" : "Select all topics"}
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-56" />
                  <col className="w-72" />
                  {!isPython ? <col className="w-72" /> : null}
                  <col />
                  <col className="w-14" />
                </colgroup>
                <thead className="bg-primary text-on-primary">
                  <tr>
                    <th className="p-3">
                      <input
                        aria-label="Select all syllabus topics"
                        type="checkbox"
                        checked={topicRows.length > 0 && selectedTopicIds.length === topicRows.length}
                        onChange={() => setSelectedTopicIds(selectedTopicIds.length === topicRows.length ? [] : topicRows.map((topic) => topic.id))}
                        className="h-5 w-5 accent-white"
                      />
                    </th>
                    {columns.map((column) => <th key={column} className="border-l border-white/20 p-3 text-xs font-extrabold uppercase">{column}</th>)}
                    <th className="border-l border-white/20 p-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {topicRows.map((topic, index) => {
                    const expanded = expandedTopicIds.includes(topic.id);
                    const assignedCount = assignedTasks.filter((task) => task.title === topic.title).length;
                    return (
                      <Fragment key={topic.id}>
                        <tr className={index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"}>
                          <td className="border-t border-outline-variant p-3 align-top">
                            <input
                              aria-label={`Select ${topic.title}`}
                              type="checkbox"
                              checked={selectedTopicIds.includes(topic.id)}
                              onChange={() => toggleValue(topic.id, selectedTopicIds, setSelectedTopicIds)}
                              className="h-5 w-5 accent-primary"
                            />
                          </td>
                          <td className="border-l border-t border-outline-variant p-3 align-top font-extrabold">
                            Day {String(topic.day_number).padStart(2, "0")}
                          </td>
                          <td className="border-l border-t border-outline-variant p-3 align-top font-bold">{topic.title}</td>
                          <td className="border-l border-t border-outline-variant p-3 align-top text-sm">{topic.english_video || "-"}</td>
                          {!isPython ? <td className="border-l border-t border-outline-variant p-3 align-top text-sm">{topic.urdu_video || "-"}</td> : null}
                          <td className="border-l border-t border-outline-variant p-3 align-top text-sm">{topic.practice_project || "-"}</td>
                          <td className="border-l border-t border-outline-variant p-2 align-top">
                            <div className="flex items-center">
                              {canEdit ? (
                                <button
                                  type="button"
                                  title={`Edit ${topic.title}`}
                                  onClick={() => startEditing(topic)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary-container"
                                >
                                  <Icon name="edit" />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                title={expanded ? "Collapse topic" : "Expand topic"}
                                onClick={() => toggleValue(topic.id, expandedTopicIds, setExpandedTopicIds)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary-container"
                              >
                                <Icon name={expanded ? "expand_less" : "expand_more"} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr key={`${topic.id}-details`} className="bg-primary-container/30">
                            <td colSpan={isPython ? 6 : 7} className="border-t border-outline-variant p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold">{topic.title}</p>
                                  <p className="mt-1 text-sm text-on-surface-variant">{assignedCount} current student assignment{assignedCount === 1 ? "" : "s"}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedTopicIds.includes(topic.id)) setSelectedTopicIds([...selectedTopicIds, topic.id]);
                                    document.getElementById("syllabus-assignment-panel")?.scrollIntoView({ behavior: "smooth" });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-bold text-primary"
                                >
                                  <Icon name="assignment_add" /> Assign this topic
                                </button>
                              </div>
                              {editingTopicId === topic.id && topicDraft ? (
                                <div className="mt-4 rounded-lg border border-primary/30 bg-surface p-4">
                                  <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                                    <label className="text-sm font-bold">
                                      Day number
                                      <input
                                        type="number"
                                        min={1}
                                        max={999}
                                        value={topicDraft.day_number}
                                        onChange={(event) => setTopicDraft({ ...topicDraft, day_number: Number(event.target.value) })}
                                        className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal outline-none focus:border-primary"
                                      />
                                    </label>
                                    <label className="text-sm font-bold">
                                      {isPython ? "Project name" : "Topic title"}
                                      <input
                                        value={topicDraft.title}
                                        onChange={(event) => setTopicDraft({ ...topicDraft, title: event.target.value })}
                                        className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-normal outline-none focus:border-primary"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    <label className="text-sm font-bold">
                                      {isPython ? "Covered course days (syllabus)" : "English video title and channel"}
                                      <textarea
                                        value={topicDraft.english_video ?? ""}
                                        onChange={(event) => setTopicDraft({ ...topicDraft, english_video: event.target.value })}
                                        rows={3}
                                        className="mt-2 w-full resize-y rounded-lg border border-outline-variant bg-surface p-3 font-normal outline-none focus:border-primary"
                                      />
                                    </label>
                                    {!isPython ? <label className="text-sm font-bold">
                                      Hindi / Urdu alternative
                                      <textarea
                                        value={topicDraft.urdu_video ?? ""}
                                        onChange={(event) => setTopicDraft({ ...topicDraft, urdu_video: event.target.value })}
                                        rows={3}
                                        className="mt-2 w-full resize-y rounded-lg border border-outline-variant bg-surface p-3 font-normal outline-none focus:border-primary"
                                      />
                                    </label> : null}
                                  </div>
                                  <label className="mt-4 block text-sm font-bold">
                                    {isPython ? "Key concepts & tech stack used" : "Practice / tough project"}
                                    <textarea
                                      value={topicDraft.practice_project ?? ""}
                                      onChange={(event) => setTopicDraft({ ...topicDraft, practice_project: event.target.value })}
                                      rows={3}
                                      className="mt-2 w-full resize-y rounded-lg border border-outline-variant bg-surface p-3 font-normal outline-none focus:border-primary"
                                    />
                                  </label>
                                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={savingTopic}
                                      onClick={cancelEditing}
                                      className="min-h-11 rounded-lg border border-outline px-4 font-bold"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={savingTopic || !topicDraft.title.trim()}
                                      onClick={saveTopicChanges}
                                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-on-primary disabled:opacity-50"
                                    >
                                      <Icon name="save" />
                                      {savingTopic ? "Saving..." : "Save changes"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="syllabus-assignment-panel" className="rounded-lg border border-outline-variant bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-primary">Course-restricted assignment</p>
                <h2 className="mt-1 text-xl font-extrabold">Assign selected topics</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Only active students enrolled in {course.title} appear below. Other courses are excluded.
                </p>
              </div>
              <div className="rounded-lg bg-primary-container px-4 py-3 text-sm font-bold text-on-primary-container">
                {selectedTopicIds.length} topics x {selectedStudentIds.length} students
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <label htmlFor="student-search" className="text-xs font-extrabold uppercase">Active {course.title} students</label>
                <input
                  id="student-search"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Search student by name or email"
                  className="mt-2 h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map((student) => student.id))}
                className="h-12 rounded-lg border border-primary px-5 font-bold text-primary"
              >
                {selectedStudentIds.length === students.length && students.length > 0 ? "Clear students" : "Select all active students"}
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleStudents.map((student) => (
                <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant p-3 hover:border-primary">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleValue(student.id, selectedStudentIds, setSelectedStudentIds)}
                    className="h-5 w-5 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{student.full_name || "Student"}</span>
                    <span className="block truncate text-xs text-on-surface-variant">{student.email || "No email"}</span>
                  </span>
                </label>
              ))}
              {visibleStudents.length === 0 ? (
                <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant sm:col-span-2 xl:col-span-3">
                  No active students are enrolled in {course.title}.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={assigning || !canAssign || selectedTopicIds.length === 0 || selectedStudentIds.length === 0}
              onClick={assignSelectedTopics}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-extrabold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="send" />
              {assigning ? "Assigning topics..." : "Assign selected topics"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
