"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Icon } from "@/components/icon";

const MENU_OPTIONS = [
  ["dashboard", "My Dashboard", "dashboard"], ["profile", "My Profile", "person"], ["tasks", "Tasks / Add Task", "add_task"],
  ["ai-tools", "AI Tools", "smart_toy"], ["seat-reservation", "Reserve a Seat", "event_seat"], ["syllabus", "Syllabus", "menu_book"],
  ["talent-portfolio", "Talent Portfolio", "badge"], ["client-hunting", "Client Hunting", "manage_search"], ["social-media", "Social Media", "share"],
  ["assigned-projects", "Assigned Projects", "assignment_turned_in"], ["projects", "Projects", "folder_special"], ["progress", "My Progress", "monitoring"],
  ["videos", "My Videos", "videocam"], ["helping-videos", "Helping Videos", "smart_display"],
] as const;
type MenuKey = typeof MENU_OPTIONS[number][0];
const defaultOrder = MENU_OPTIONS.map(([key]) => key);
type Control = { menu_key: string; is_visible: boolean; sort_order?: number };

export function StudentMenuControls() {
  const supabase = createSupabaseBrowserClient();
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [selected, setSelected] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<MenuKey[]>(defaultOrder);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await supabase.from("courses").select("id,title").order("title");
      if (result.error) { setError(result.error.message); setLoading(false); return; }
      setCourses(result.data ?? []);
      if (result.data?.[0]) setSelected(result.data[0].id);
      else setLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true); setMessage(""); setError("");
    void (async () => {
      const result = await supabase.from("course_student_menu_controls").select("*").eq("course_id", selected);
      if (cancelled) return;
      if (result.error) {
        setError(result.error.message.includes("schema cache") ? "Database setup required: run supabase/student-menu-controls-setup.sql in the Supabase SQL Editor." : result.error.message);
      }
      const rows = (result.data ?? []) as Control[];
      setVisible(Object.fromEntries(defaultOrder.map(key => [key, rows.some(row => row.menu_key === key && row.is_visible)])));
      setOrder([...defaultOrder].sort((a, b) => (rows.find(row => row.menu_key === a)?.sort_order ?? 0) - (rows.find(row => row.menu_key === b)?.sort_order ?? 0)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selected, supabase]);

  function move(index: number, direction: number) {
    setOrder(current => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMessage("");
  }

  async function save() {
    setSaving(true); setMessage("");
    const rows = order.map((menu_key, sort_order) => ({ course_id: selected, menu_key, sort_order, is_visible: visible[menu_key] !== false, updated_at: new Date().toISOString() }));
    const result = await supabase.from("course_student_menu_controls").upsert(rows, { onConflict: "course_id,menu_key" });
    setSaving(false);
    if (result.error) setError(result.error.message);
    else { setError(""); setMessage("Menu visibility and order saved."); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-black uppercase tracking-widest text-primary">Student access</p><h1 className="mt-1 text-3xl font-black text-on-surface">Student Menu Controls</h1><p className="mt-2 text-sm text-on-surface-variant">Enable only the features students in this course should use. Uncheck My Dashboard to hide it and open the first enabled feature instead. Tasks / Add Task and My Profile are also optional.</p></header>
    <section className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-card">
      <label className="block max-w-md text-sm font-bold text-on-surface">Course<select disabled={saving} value={selected} onChange={e => setSelected(e.target.value)} className="wc-input mt-2">{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 space-y-2">{order.map((key, index) => {
        const option = MENU_OPTIONS.find(item => item[0] === key)!;
        return <div key={key} className="flex items-center gap-3 rounded-xl border border-outline-variant p-3">
          <span className="w-5 text-xs text-on-surface-variant">{index + 1}</span>
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input disabled={loading || saving} type="checkbox" checked={visible[key] !== false} onChange={e => setVisible(current => ({ ...current, [key]: e.target.checked }))} className="h-4 w-4" /><Icon name={option[2]} className="text-primary" /><span className="text-sm font-bold text-on-surface">{option[1]}</span></label>
          <button type="button" aria-label={`Move ${option[1]} up`} disabled={loading || saving || index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-outline-variant p-1.5 text-primary hover:bg-surface-container-low disabled:opacity-30"><Icon name="arrow_upward" /></button>
          <button type="button" aria-label={`Move ${option[1]} down`} disabled={loading || saving || index === order.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-outline-variant p-1.5 text-primary hover:bg-surface-container-low disabled:opacity-30"><Icon name="arrow_downward" /></button>
        </div>;
      })}</div>
      <div className="mt-6 flex flex-wrap items-center gap-4"><button disabled={!selected || loading || saving || !!error} onClick={() => void save()} className="wc-primary-btn"><Icon name="save" />{saving ? "Saving..." : "Save Menu Settings"}</button>{message && <span role="status" className="text-sm font-semibold text-emerald-700">{message}</span>}</div>
    </section>
  </div>;
}
