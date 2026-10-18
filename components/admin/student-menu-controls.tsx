"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Icon } from "@/components/icon";

const MENU_OPTIONS = [
  ["ai-tools", "AI Tools", "smart_toy"], ["seat-reservation", "Reserve a Seat", "event_seat"], ["syllabus", "Syllabus", "menu_book"],
  ["talent-portfolio", "Talent Portfolio", "badge"], ["client-hunting", "Client Hunting", "manage_search"], ["social-media", "Social Media", "share"],
  ["assigned-projects", "Assigned Projects", "assignment_turned_in"], ["projects", "Projects", "folder_special"], ["progress", "My Progress", "monitoring"],
  ["videos", "My Videos", "videocam"], ["helping-videos", "Helping Videos", "smart_display"],
] as const;

export function StudentMenuControls() {
  const supabase = createSupabaseBrowserClient();
  const [courses, setCourses] = useState<any[]>([]); const [selected, setSelected] = useState<string>("");
  const [visible, setVisible] = useState<Record<string, boolean>>({}); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { void (async () => { const { data } = await supabase.from("courses").select("id,title,status").order("title"); setCourses(data ?? []); if (data?.[0]) setSelected(data[0].id); })(); }, [supabase]);
  useEffect(() => { if (!selected) return; void (async () => { const { data } = await supabase.from("course_student_menu_controls").select("menu_key,is_visible").eq("course_id", selected); const next: Record<string, boolean> = {}; MENU_OPTIONS.forEach(([key]) => { next[key] = true; }); (data ?? []).forEach((row) => { next[row.menu_key] = row.is_visible; }); setVisible(next); })(); }, [selected, supabase]);
  async function save() { setSaving(true); setMessage(""); const rows = MENU_OPTIONS.map(([menu_key]) => ({ course_id: selected, menu_key, is_visible: visible[menu_key] !== false, updated_at: new Date().toISOString() })); const { error } = await supabase.from("course_student_menu_controls").upsert(rows, { onConflict: "course_id,menu_key" }); setSaving(false); setMessage(error ? error.message : "Menu settings saved."); }
  return <div className="mx-auto max-w-5xl space-y-6"><header><p className="text-xs font-black uppercase tracking-widest text-primary">Student access</p><h1 className="mt-1 text-3xl font-black text-on-surface">Student Menu Controls</h1><p className="mt-2 text-sm text-on-surface-variant">Choose which student-hub menus appear for each course. Hidden menus are removed from the sidebar.</p></header><section className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-card"><label className="block max-w-md text-sm font-bold text-on-surface">Course<select value={selected} onChange={(e) => setSelected(e.target.value)} className="wc-input mt-2">{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MENU_OPTIONS.map(([key, label, icon]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant p-4 hover:bg-surface-container-low"><input type="checkbox" checked={visible[key] !== false} onChange={(e) => setVisible((current) => ({ ...current, [key]: e.target.checked }))} className="h-4 w-4" /><Icon name={icon} className="text-primary" /><span className="text-sm font-bold text-on-surface">{label}</span></label>)}</div><div className="mt-6 flex items-center gap-4"><button disabled={!selected || saving} onClick={() => void save()} className="wc-primary-btn"><Icon name="save" />{saving ? "Saving..." : "Save Menu Settings"}</button>{message && <span className="text-sm font-semibold text-emerald-700">{message}</span>}</div></section></div>;
}
