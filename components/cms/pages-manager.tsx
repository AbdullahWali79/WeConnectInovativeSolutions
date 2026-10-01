"use client";

import Link from "next/link";
import { useState } from "react";
import { savePageSetting } from "@/app/admin/pages/actions";
import { menuIsVisible, pageIsActive, type PageEntry, type PageSetting } from "@/lib/cms/model";
import { navCategories, groupId } from "@/lib/cms/navigation";

const navigationIds = new Set(navCategories.flatMap(category => [category.href || groupId(category.label), ...(category.items ?? []).map(item => item.href)]));

type Stamp = { path: string; updated_at: string };
export function PagesManager({ entries, initialSettings, drafts, published, storageReady }: { entries: PageEntry[]; initialSettings: PageSetting[]; drafts: Stamp[]; published: Stamp[]; storageReady: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<PageSetting | null>(null);
  const value = (entry: PageEntry): PageSetting => settings.find(s => s.id === entry.id) ?? { id: entry.id, label: entry.label, menu_visible: true, active: true, sort_order: 0 };
  async function save(setting: PageSetting) {
    setBusy(setting.id); setMessage("");
    try {
      const result = await savePageSetting(setting);
      if (result.ok === false) { setMessage(result.error); return; }
      setSettings(previous => [...previous.filter(s => s.id !== setting.id), setting]);
      setMessage("Saved. Menu and activation changes are live."); setEditing(null);
    } catch { setMessage("Connection lost. Please try again."); }
    finally { setBusy(null); }
  }
  const matches = (entry: PageEntry): boolean => `${value(entry).label} ${entry.href ?? ""}`.toLowerCase().includes(query.toLowerCase()) || entries.some(e => e.parent === entry.id && matches(e));
  function render(parent?: string, depth = 0): React.ReactNode {
    return entries.filter(e => e.parent === parent && (!query || matches(e))).sort((a,b) => value(a).sort_order - value(b).sort_order).map(entry => {
      const setting = value(entry);
      const hasMenuLink = entry.kind !== "page" || navigationIds.has(entry.id);
      const children = entries.some(e => e.parent === entry.id);
      const path = entry.href?.split("#")[0];
      const draft = drafts.find(d => d.path === path);
      const live = published.find(p => p.path === path);
      const pending = draft && (!live || draft.updated_at > live.updated_at);
      return <div key={entry.id}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 hover:bg-slate-50" style={{ paddingLeft: 16 + depth * 24 }}>
          <button type="button" aria-label={`${collapsed.includes(entry.id) ? "Expand" : "Collapse"} ${setting.label}`} disabled={!children} className="w-5 text-slate-500 disabled:opacity-0" onClick={() => setCollapsed(old => old.includes(entry.id) ? old.filter(id => id !== entry.id) : [...old, entry.id])}>{collapsed.includes(entry.id) ? "▸" : "▾"}</button>
          <div className="min-w-40 flex-1">
            {path ? <Link className="font-semibold text-slate-900 hover:text-blue-600" href={`/admin/pages/editor?path=${encodeURIComponent(path)}`}>{setting.label}</Link> : <span className="font-semibold text-slate-900">{setting.label}</span>}
            <p className="text-xs text-slate-500">{entry.href || "Menu group"}{pending ? " · Draft changes" : live ? " · Published" : ""}{entry.kind === "anchor" ? " · Section link" : ""}</p>
            {path && !pageIsActive(path, settings) && setting.active && <p className="text-xs text-amber-700">Parent page is inactive</p>}
          </div>
          {hasMenuLink && <button type="button" disabled={!!busy || !storageReady} onClick={() => save({ ...setting, menu_visible: !setting.menu_visible })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${menuIsVisible(entry.id, settings) ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{setting.menu_visible ? "Menu visible" : "Menu hidden"}</button>}
          <button type="button" disabled={!!busy || !storageReady} onClick={() => save({ ...setting, active: !setting.active })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${setting.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{busy === entry.id ? "Saving…" : setting.active ? "Active" : "Inactive"}</button>
          {hasMenuLink && <button type="button" className="text-xs font-semibold text-slate-600" onClick={() => setEditing(setting)}>Menu settings</button>}
          {path && <Link className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white" href={`/admin/pages/editor?path=${encodeURIComponent(path)}`}>Edit page</Link>}
        </div>
        {children && (!collapsed.includes(entry.id) || query) && render(entry.id, depth + 1)}
      </div>;
    });
  }
  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
    <div><h1 className="text-3xl font-bold">Pages</h1><p className="mt-2 text-sm text-slate-500">Manage website menus and submenus. Open a page to edit its content and design.</p></div>
    {!storageReady && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Pages storage needs setup. Apply <code>20261001000000_site_pages_cms.sql</code> in Supabase before saving.</p>}
    <div className="flex flex-wrap gap-3"><input aria-label="Search pages" placeholder="Search pages or URLs…" value={query} onChange={e => setQuery(e.target.value)} className="min-w-60 flex-1 rounded-xl border border-slate-200 px-4 py-2" /><button onClick={() => setCollapsed([])} className="text-sm">Expand all</button><button onClick={() => setCollapsed(entries.map(e => e.id))} className="text-sm">Collapse all</button></div>
    <p className="text-xs text-slate-500">Menu hidden removes a navigation link. Inactive blocks the page and its detail URLs. Hiding a menu group hides its submenu links.</p>
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
    {editing && <form className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4" onSubmit={e => { e.preventDefault(); void save(editing); }}>
      <label className="text-sm">Menu label<input required maxLength={120} className="mt-1 block rounded-lg border px-3 py-2" value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} /></label>
      <label className="text-sm">Menu order<input type="number" min={-10000} max={10000} className="mt-1 block w-24 rounded-lg border px-3 py-2" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
      <button disabled={!!busy || !storageReady} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button><button type="button" onClick={() => setEditing(null)}>Cancel</button>
    </form>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{render()}</div>
  </div>;
}
