"use client";

import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { importProjects, deleteProject, updateProject } from "@/app/admin/projects-catalog/actions";
import type { Course, CourseProject, Profile, Task } from "@/lib/supabase/types";

export type ProjectStudent = Profile & {
  assignmentCourseId: string;
};

export type ProjectBundle = {
  course: Course;
  projects: CourseProject[];
  students: ProjectStudent[];
  existingTasks: Task[];
};

type Props = {
  bundles: ProjectBundle[];
  canAssign: boolean;
  canEdit: boolean;
};

export function ProjectsCatalog({ bundles, canAssign, canEdit }: Props) {
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  return (
    <div>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Project Roadmap</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Projects Catalog</h1>
        <p className="mt-3 max-w-4xl text-base text-on-surface-variant md:text-lg">
          Select a course to view, import (via Excel), or assign projects to enrolled students.
        </p>
      </header>

      {bundles.length === 0 ? (
        <section className="rounded-lg border border-outline-variant bg-surface p-8 text-center">
          <Icon name="assignment" className="text-5xl text-primary" />
          <h2 className="mt-4 text-xl font-bold">No active courses found</h2>
          <p className="mt-2 text-on-surface-variant">There are no courses to assign projects to.</p>
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
                      {bundle.projects.length} available projects
                    </span>
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-primary">
                    <Icon name={isOpen ? "expand_less" : "expand_more"} />
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-outline-variant p-4">
                    <ProjectManager
                      course={bundle.course}
                      projects={bundle.projects}
                      students={bundle.students}
                      existingTasks={bundle.existingTasks}
                      canAssign={canAssign}
                      canEdit={canEdit}
                      onToast={setToast}
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

function ProjectManager({
  course,
  projects,
  students,
  existingTasks,
  canAssign,
  canEdit,
  onToast,
}: {
  course: Course;
  projects: CourseProject[];
  students: ProjectStudent[];
  existingTasks: Task[];
  canAssign: boolean;
  canEdit: boolean;
  onToast: (toast: ToastState) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id));
  const visibleStudents = students.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    return !query || `${student.full_name ?? ""} ${student.email ?? ""}`.toLowerCase().includes(query);
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canEdit) {
      onToast({ type: "error", message: "You do not have permission to import projects." });
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

        const newProjects: { title: string; description: string }[] = [];
        
        for (const row of rows) {
          const normalizedRow: Record<string, string> = {};
          for (const key in row) {
            normalizedRow[key.toLowerCase().trim()] = String(row[key]);
          }

          const title = normalizedRow["project name"] || normalizedRow["title"];
          const desc = normalizedRow["description in detail"] || normalizedRow["description"];
          
          if (title && desc) {
            newProjects.push({ title: title.trim(), description: desc.trim() });
          }
        }

        if (newProjects.length === 0) {
          onToast({ type: "error", message: "No valid projects found. Excel must have 'Project Name' and 'Description' columns." });
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const result = await importProjects(course.id, newProjects);
        if (result.success) {
          onToast({ type: "success", message: `Successfully imported ${newProjects.length} projects.` });
        } else {
          onToast({ type: "error", message: result.error || "Failed to import projects." });
        }
      } catch (err) {
        onToast({ type: "error", message: "Failed to parse Excel file." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      onToast({ type: "error", message: "Title and description are required." });
      return;
    }
    
    setIsAdding(true);
    let result;
    if (editingProjectId) {
      result = await updateProject(editingProjectId, newTitle.trim(), newDescription.trim());
    } else {
      result = await importProjects(course.id, [{ title: newTitle.trim(), description: newDescription.trim() }]);
    }
    setIsAdding(false);
    
    if (result.success) {
      onToast({ type: "success", message: editingProjectId ? "Project updated successfully." : "Project added successfully." });
      setIsAddModalOpen(false);
      setEditingProjectId(null);
      setNewTitle("");
      setNewDescription("");
    } else {
      onToast({ type: "error", message: result.error || "Failed to save project." });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project? Tasks already assigned to students will NOT be deleted.")) return;
    const result = await deleteProject(projectId);
    if (result.success) {
      onToast({ type: "success", message: "Project deleted successfully." });
    } else {
      onToast({ type: "error", message: result.error || "Failed to delete project." });
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ "Project Name": "Sample Project Title", "Description in detail": "Sample detailed requirements and instructions for this project." }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "Projects_Template.xlsx");
  };

  function toggleValue(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function assignSelectedProjects() {
    if (!canAssign) {
      onToast({ type: "error", message: "You do not have permission to assign projects." });
      return;
    }
    if (selectedProjects.length === 0 || selectedStudentIds.length === 0) {
      onToast({ type: "error", message: "Select at least one project and one student." });
      return;
    }

    const duplicateKeys = new Set(
      existingTasks.map((task) => `${task.student_id}:${task.title.trim().toLowerCase()}`),
    );

    const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id));
    const payloads = selectedStudents.flatMap((student) =>
      selectedProjects
        .filter((p) => !duplicateKeys.has(`${student.id}:${p.title.trim().toLowerCase()}`))
        .map((p) => ({
          student_id: student.id,
          course_id: student.assignmentCourseId,
          workflow_type: "project" as const,
          title: p.title,
          description: p.description,
          max_score: 100,
        })),
    );

    if (payloads.length === 0) {
      onToast({ type: "info", message: "These projects are already assigned to the selected students." });
      return;
    }

    setAssigning(true);
    const { error } = await supabase.from("tasks").insert(payloads);
    setAssigning(false);

    if (error) {
      onToast({ type: "error", message: error.message });
      return;
    }

    onToast({
      type: "success",
      message: `${payloads.length} project assignment${payloads.length === 1 ? "" : "s"} sent successfully. Refreshing...`,
    });
    
    // Hard reload to reflect changes
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-bold">Projects</h3>
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingProjectId(null);
                setNewTitle("");
                setNewDescription("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low"
            >
              <Icon name="add" className="text-[18px]" />
              Add Project
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low"
            >
              <Icon name="download" className="text-[18px]" />
              Download Template
            </button>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="upload" className="text-[18px]" />
              {isImporting ? "Importing..." : "Import from Excel"}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-lowest">
          <div className="border-b border-outline-variant p-4">
            <h4 className="font-bold">Available Projects</h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {projects.length === 0 ? (
              <p className="p-4 text-center text-sm text-on-surface-variant">No projects available for this course. Import them via Excel.</p>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="flex gap-2 mb-2 items-stretch">
                  <label
                    className={`flex-1 flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant p-3 transition-colors hover:bg-surface-container-low ${
                      selectedProjectIds.includes(project.id) ? "bg-primary-container text-on-primary-container border-primary" : "bg-surface"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0 rounded border-outline-variant text-primary focus:ring-primary"
                      checked={selectedProjectIds.includes(project.id)}
                      onChange={() => toggleValue(project.id, selectedProjectIds, setSelectedProjectIds)}
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold leading-tight">{project.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs opacity-80">{project.description}</p>
                    </div>
                  </label>
                  {canEdit && (
                    <div className="flex flex-col gap-1 w-10 shrink-0">
                      <button
                        title="Edit Project"
                        type="button"
                        onClick={() => {
                          setEditingProjectId(project.id);
                          setNewTitle(project.title);
                          setNewDescription(project.description);
                          setIsAddModalOpen(true);
                        }}
                        className="flex flex-1 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        title="Delete Project"
                        type="button"
                        onClick={() => handleDeleteProject(project.id)}
                        className="flex flex-1 items-center justify-center rounded-lg border border-error/30 bg-error/5 text-error hover:bg-error/20 transition-colors"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-lowest flex flex-col">
          <div className="border-b border-outline-variant p-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-bold">Enrolled Students</h4>
              <button
                type="button"
                onClick={() => setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.id))}
                className="text-xs font-bold text-primary hover:underline"
              >
                {selectedStudentIds.length === students.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="mt-3 relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="search"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border-outline-variant bg-surface-container pl-10 pr-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto p-2 flex-1">
            {visibleStudents.length === 0 ? (
              <p className="p-4 text-center text-sm text-on-surface-variant">No students found.</p>
            ) : (
              visibleStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-surface-container-low ${
                    selectedStudentIds.includes(student.id) ? "bg-primary-container text-on-primary-container" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-outline-variant text-primary focus:ring-primary"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleValue(student.id, selectedStudentIds, setSelectedStudentIds)}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-bold">{student.full_name || "Unnamed Student"}</p>
                    <p className="truncate text-xs opacity-75">{student.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant">
        <p className="text-sm font-medium">
          {selectedProjectIds.length} project(s) • {selectedStudentIds.length} student(s)
        </p>
        <button
          type="button"
          disabled={assigning || selectedProjectIds.length === 0 || selectedStudentIds.length === 0}
          onClick={assignSelectedProjects}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-bold text-on-primary transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
        >
          {assigning ? <Icon name="sync" className="animate-spin text-[18px]" /> : <Icon name="send" className="text-[18px]" />}
          Assign Projects
        </button>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <h2 className="text-xl font-bold">{editingProjectId ? "Edit Project" : "Add Project Manually"}</h2>
            <form onSubmit={handleAddProject} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Project Name</span>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Enter project title"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Description</span>
                <textarea
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Enter detailed requirements"
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProjectId(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-50"
                >
                  {isAdding ? "Saving..." : editingProjectId ? "Save Changes" : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
