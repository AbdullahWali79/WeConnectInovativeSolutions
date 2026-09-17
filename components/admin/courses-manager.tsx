"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { filterCoursesByScope, loadTeacherCourseScope, type CourseScope } from "@/lib/admin-course-scope";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Course, CourseCategory, CourseStatus, Profile } from "@/lib/supabase/types";

const categoryInitial = { name: "", description: "" };
const courseInitial = { title: "", description: "", duration: "", level: "", category_id: "", status: "active" as CourseStatus };

export function CoursesManager({
  currentRole = "admin",
  permissions = [],
  initialCategories = [],
  initialCourses = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
  initialCategories?: CourseCategory[];
  initialCourses?: Course[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canUse = useCallback((permission: PermissionKey) => currentRole === "admin" || permissions.includes(permission), [currentRole, permissions]);
  const canCreate = canUse("courses.create");
  const canEdit = canUse("courses.edit");
  const canDelete = canUse("courses.delete");
  const [categories, setCategories] = useState<CourseCategory[]>(initialCategories);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [categoryForm, setCategoryForm] = useState(categoryInitial);
  const [courseForm, setCourseForm] = useState(courseInitial);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingCategoryId ? !canEdit : !canCreate) {
      setToast({ type: "error", message: "You do not have permission to save course categories." });
      return;
    }
    if (!categoryForm.name.trim()) {
      setToast({ type: "error", message: "Category name is required." });
      return;
    }
    setSaving(true);
    const payload = { name: categoryForm.name.trim(), description: categoryForm.description.trim() || null };
    const result = editingCategoryId
      ? await supabase.from("course_categories").update(payload).eq("id", editingCategoryId)
      : await supabase.from("course_categories").insert(payload);
    setSaving(false);
    if (result.error) {
      setToast({ type: "error", message: result.error.message });
      return;
    }
    setToast({ type: "success", message: editingCategoryId ? "Category updated." : "Category created." });
    setCategoryForm(categoryInitial);
    setEditingCategoryId(null);
    setShowCategoryModal(false);
    await loadData();
  }

  async function saveCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingCourseId ? !canEdit : !canCreate) {
      setToast({ type: "error", message: "You do not have permission to save courses." });
      return;
    }
    if (!courseForm.title.trim()) {
      setToast({ type: "error", message: "Course title is required." });
      return;
    }
    setSaving(true);
    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || null,
      duration: courseForm.duration.trim() || null,
      level: courseForm.level.trim() || null,
      category_id: courseForm.category_id || null,
      status: courseForm.status,
    };
    const result = editingCourseId ? await supabase.from("courses").update(payload).eq("id", editingCourseId) : await supabase.from("courses").insert(payload);
    setSaving(false);
    if (result.error) {
      setToast({ type: "error", message: result.error.message });
      return;
    }
    setToast({ type: "success", message: editingCourseId ? "Course updated." : "Course created." });
    setCourseForm(courseInitial);
    setEditingCourseId(null);
    setShowCourseModal(false);
    await loadData();
  }

  async function deleteRow(table: "course_categories" | "courses", id: string) {
    if (!canDelete) {
      setToast({ type: "error", message: "You do not have permission to delete courses." });
      return;
    }
    const confirmed = window.confirm("Delete this record? Related records may prevent deletion.");
    if (!confirmed) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Record deleted." });
    await loadData();
  }

  async function duplicateCourse(course: Course) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to duplicate courses." });
      return;
    }

    const { error } = await supabase.from("courses").insert({
      category_id: course.category_id,
      title: `${course.title} Copy`,
      description: course.description,
      duration: course.duration,
      level: course.level,
      status: "inactive",
    });

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Course duplicated as inactive draft." });
    await loadData();
  }

  function editCategory(category: CourseCategory) {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, description: category.description ?? "" });
    setShowCategoryModal(true);
  }

  function editCourse(course: Course) {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title,
      description: course.description ?? "",
      duration: course.duration ?? "",
      level: course.level ?? "",
      category_id: course.category_id ?? "",
      status: course.status,
    });
    setShowCourseModal(true);
  }

  function loadCourseTemplate(course: Course) {
    if (!canCreate) {
      setToast({ type: "error", message: "You do not have permission to create courses." });
      return;
    }

    setEditingCourseId(null);
    setCourseForm({
      title: `${course.title} Template`,
      description: course.description ?? "",
      duration: course.duration ?? "",
      level: course.level ?? "",
      category_id: course.category_id ?? "",
      status: "inactive",
    });
    setShowCourseModal(true);
    setToast({ type: "success", message: "Course template loaded in the create form." });
  }

  if (loading) return <LoadingState label="Loading course catalog..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader 
        eyebrow="Catalog" 
        title="Courses and categories" 
        description="Create, edit, deactivate, and delete course categories and courses shown on the public landing page." 
        action={canCreate ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryForm(categoryInitial); setShowCategoryModal(true); }} className="wc-secondary-btn shrink-0 whitespace-nowrap px-3 py-2 text-sm">
              <Icon name="add" className="mr-1 text-sm" /> New Category
            </button>
            <button type="button" onClick={() => { setEditingCourseId(null); setCourseForm(courseInitial); setShowCourseModal(true); }} className="wc-primary-btn shrink-0 whitespace-nowrap px-3 py-2 text-sm">
              <Icon name="add" className="mr-1 text-sm" /> New Course
            </button>
          </div>
        ) : null}
      />

      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onSubmit={saveCategory} className="wc-card relative w-full max-w-sm space-y-4 p-5 [&_.wc-input]:px-3 [&_.wc-input]:py-2 [&_.wc-input]:text-sm [&_.wc-label]:text-xs [&_.wc-label]:font-bold [&_.wc-label]:uppercase [&_.wc-label]:tracking-wider">
              <button type="button" className="absolute right-4 top-4 rounded-full p-2 hover:bg-surface-container" onClick={() => { setShowCategoryModal(false); setEditingCategoryId(null); setCategoryForm(categoryInitial); }}><Icon name="close" /></button>
              <h2 className="text-lg font-bold text-on-surface">{editingCategoryId ? "Edit category" : "Create category"}</h2>
              <label className="block">
                <span className="wc-label">Name</span>
                <input className="wc-input mt-1.5" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label className="block">
                <span className="wc-label">Description</span>
                <textarea className="wc-input mt-1.5 min-h-[80px]" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="pt-2">
                <button disabled={saving} className="wc-primary-btn w-full !py-2.5">{editingCategoryId ? "Update category" : "Create category"}</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onSubmit={saveCourse} className="wc-card relative w-full max-w-lg space-y-4 p-5 [&_.wc-input]:px-3 [&_.wc-input]:py-2 [&_.wc-input]:text-sm [&_.wc-label]:text-xs [&_.wc-label]:font-bold [&_.wc-label]:uppercase [&_.wc-label]:tracking-wider">
              <button type="button" className="absolute right-4 top-4 rounded-full p-2 hover:bg-surface-container" onClick={() => { setShowCourseModal(false); setEditingCourseId(null); setCourseForm(courseInitial); }}><Icon name="close" /></button>
              <h2 className="text-lg font-bold text-on-surface">{editingCourseId ? "Edit course" : "Create course"}</h2>
              <label className="block">
                <span className="wc-label">Title</span>
                <input className="wc-input mt-1.5" value={courseForm.title} onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label className="block">
                <span className="wc-label">Category</span>
                <select className="wc-input mt-1.5" value={courseForm.category_id} onChange={(event) => setCourseForm((current) => ({ ...current, category_id: event.target.value }))}>
                  <option value="">No category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <div className="grid gap-4 grid-cols-2">
                <label className="block">
                  <span className="wc-label">Duration</span>
                  <input className="wc-input mt-1.5" value={courseForm.duration} onChange={(event) => setCourseForm((current) => ({ ...current, duration: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="wc-label">Level</span>
                  <input className="wc-input mt-1.5" value={courseForm.level} onChange={(event) => setCourseForm((current) => ({ ...current, level: event.target.value }))} />
                </label>
              </div>
              <label className="block">
                <span className="wc-label">Status</span>
                <select className="wc-input mt-1.5" value={courseForm.status} onChange={(event) => setCourseForm((current) => ({ ...current, status: event.target.value as CourseStatus }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="block">
                <span className="wc-label">Description</span>
                <textarea className="wc-input mt-1.5 min-h-[100px]" value={courseForm.description} onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="pt-2">
                <button disabled={saving} className="wc-primary-btn w-full !py-2.5">{editingCourseId ? "Update course" : "Create course"}</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="space-y-6">
          {!(canCreate || canEdit) ? (
            <section className="wc-card p-4">
              <h2 className="text-base font-bold text-on-surface">Read-only course access</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">You can view the course catalog, but create, edit, and delete actions are not enabled for this account.</p>
            </section>
          ) : null}

          <section className="space-y-6">
            <div className="wc-card overflow-hidden">
              <div className="border-b border-outline-variant/70 p-3"><h2 className="text-[13px] font-bold text-on-surface uppercase tracking-wider">Categories</h2></div>
              {categories.length === 0 ? <div className="p-4"><EmptyState title="No categories" description="Create a course category to organize the catalog." /></div> : (
                <div className="divide-y divide-outline-variant/70">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between gap-3 p-3 hover:bg-surface-container-low transition">
                      <div>
                        <p className="text-sm font-bold text-on-surface">{category.name}</p>
                        {category.description && <p className="text-xs text-on-surface-variant line-clamp-1 max-w-[280px]">{category.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {canEdit ? <button onClick={() => editCategory(category)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 p-1 text-primary transition"><Icon name="edit" className="text-sm" /></button> : null}
                        {canDelete ? <button onClick={() => deleteRow("course_categories", category.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-error-container hover:bg-error/20 p-1 text-error transition"><Icon name="delete" className="text-sm" /></button> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wc-card overflow-hidden">
              <div className="border-b border-outline-variant/70 p-3"><h2 className="text-[13px] font-bold text-on-surface uppercase tracking-wider">Courses</h2></div>
              {courses.length === 0 ? <div className="p-4"><EmptyState title="No courses" description="Create a course to show it publicly and enroll students." icon="school" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[660px] text-left">
                    <thead className="bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-primary">
                      <tr><th className="px-3 py-2">Course</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Duration</th><th className="px-3 py-2">Status</th>{(canCreate || canEdit || canDelete) ? <th className="px-3 py-2 text-right">Actions</th> : null}</tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/70 text-sm">
                      {courses.map((course) => (
                        <motion.tr key={course.id} whileHover={{ backgroundColor: "rgba(0, 33, 110, 0.02)" }}>
                          <td className="px-3 py-2"><p className="text-sm font-bold text-on-surface">{course.title}</p><p className="max-w-xs text-[11px] text-on-surface-variant line-clamp-1">{course.description}</p></td>
                          <td className="px-3 py-2 text-[11px] text-on-surface-variant whitespace-nowrap">{course.category_id ? categoryById.get(course.category_id)?.name ?? "Unknown" : "None"}</td>
                          <td className="px-3 py-2 text-[11px] text-on-surface-variant whitespace-nowrap">{course.duration ?? "Not set"}</td>
                          <td className="px-3 py-2 whitespace-nowrap"><StatusPill value={course.status} /></td>
                          {(canCreate || canEdit || canDelete) ? (
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1">
                                {canCreate ? <button title="Use as template" onClick={() => loadCourseTemplate(course)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 p-1 text-primary transition"><Icon name="content_copy" className="text-[14px]" /></button> : null}
                                {canCreate ? <button title="Duplicate course" onClick={() => void duplicateCourse(course)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 p-1 text-primary transition"><Icon name="post_add" className="text-[14px]" /></button> : null}
                                {canEdit ? <button onClick={() => editCourse(course)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 p-1 text-primary transition"><Icon name="edit" className="text-[14px]" /></button> : null}
                                {canDelete ? <button onClick={() => deleteRow("courses", course.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-error-container hover:bg-error/20 p-1 text-error transition"><Icon name="delete" className="text-[14px]" /></button> : null}
                              </div>
                            </td>
                          ) : null}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
}
