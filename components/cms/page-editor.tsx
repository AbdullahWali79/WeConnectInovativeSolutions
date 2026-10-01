"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { savePageDocument } from "@/app/admin/pages/actions";
import { emptyDocument, type CmsBlock, type CmsDocument, type CmsElementOverride, type CmsSelection, type CmsStyle } from "@/lib/cms/model";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
export function PageEditor({ path, label, source, initialDocument, publishedDocument, storageReady }: { path: string; label: string; source?: string; initialDocument: CmsDocument; publishedDocument: CmsDocument; storageReady: boolean }) {
  const [document, setDocument] = useState(initialDocument);
  const [published, setPublished] = useState(publishedDocument);
  const [selection, setSelection] = useState<CmsSelection | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [tab, setTab] = useState<"element" | "sections">("element");
  const [width, setWidth] = useState("100%");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(JSON.stringify(initialDocument));
  const [undo, setUndo] = useState<CmsDocument[]>([]);
  const [redo, setRedo] = useState<CmsDocument[]>([]);
  const iframe = useRef<HTMLIFrameElement>(null);
  const documentRef = useRef(document);
  documentRef.current = document;
  const dragId = useRef<string | null>(null);
  const dirty = JSON.stringify(document) !== saved;
  const update = (next: CmsDocument) => {
    setUndo(history => [...history.slice(-49), document]); setRedo([]); setDocument(next);
  };
  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    iframe.current?.contentWindow?.postMessage({ type, path, ...payload }, window.location.origin);
  }, [path]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow || event.data?.path !== path) return;
      if (event.data.type === "cms:ready") { setReady(true); send("cms:update", { document: documentRef.current, editing: mode === "edit" }); }
      if (event.data.type === "cms:selection") { setSelection(event.data.selection); setTab("element"); }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [mode, path, send]);
  useEffect(() => { if (ready) send("cms:update", { document, editing: mode === "edit" }); }, [document, mode, ready, send]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const warnNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.href === window.location.href) return;
      if (!window.confirm("Leave without saving your changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    window.document.addEventListener("click", warnNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); window.document.removeEventListener("click", warnNavigation, true); };
  }, [dirty]);
  async function save(publish: boolean) {
    setBusy(true); setMessage("");
    const snapshot = document;
    try {
      const result = await savePageDocument(path, snapshot, publish);
      if (result.ok === false) { setMessage(result.error); return; }
      setSaved(JSON.stringify(snapshot));
      if (publish) setPublished(snapshot);
      setMessage(publish ? "Published. Your changes are live." : "Draft saved. Visitors still see the published version.");
    } catch { setMessage("Connection lost. Your changes are still here; retry saving."); }
    finally { setBusy(false); }
  }
  function patchElement(patch: CmsElementOverride) {
    if (!selection) return;
    update({ ...document, elements: { ...document.elements, [selection.id]: { ...document.elements[selection.id], ...patch } } });
  }
  function patchBlock(id: string, patch: Partial<CmsBlock>) {
    update({ ...document, blocks: document.blocks.map(b => b.id === id ? { ...b, ...patch } : b) });
  }
  function moveOriginal(offset: number) {
    if (!selection?.parentId || !selection.siblings) return;
    const order = [...(document.order?.[selection.parentId] ?? selection.siblings)];
    const from = order.indexOf(selection.id); const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    update({ ...document, order: { ...document.order, [selection.parentId]: order } });
  }
  function moveBlock(id: string, offset: number) {
    const blocks = [...document.blocks];
    const from = blocks.findIndex(b => b.id === id); const to = from + offset;
    if (to < 0 || to >= blocks.length) return;
    [blocks[from], blocks[to]] = [blocks[to], blocks[from]]; update({ ...document, blocks });
  }
  const current = selection ? document.elements[selection.id] ?? {} : {};
  return <div className="space-y-4 p-4 text-slate-900 md:p-6">
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/admin/pages" className="text-sm text-slate-500">← Pages</Link>
      <div className="flex-1"><h1 className="text-xl font-bold">{label}</h1><p className="text-xs text-slate-500">{path} · {dirty ? "Unsaved changes" : "Saved"}</p></div>
      <button disabled={!undo.length || busy} className="text-sm disabled:opacity-30" onClick={() => { setRedo(h => [...h, document]); setDocument(undo[undo.length - 1]); setUndo(h => h.slice(0, -1)); }}>Undo</button>
      <button disabled={!redo.length || busy} className="text-sm disabled:opacity-30" onClick={() => { setUndo(h => [...h, document]); setDocument(redo[redo.length - 1]); setRedo(h => h.slice(0, -1)); }}>Redo</button>
      <button onClick={() => setMode(mode === "edit" ? "preview" : "edit")} className="rounded-lg border px-3 py-2 text-sm">{mode === "edit" ? "Preview" : "Edit mode"}</button>
      <button disabled={busy || !storageReady} onClick={() => save(false)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Save draft</button>
      <button disabled={busy || !storageReady} onClick={() => save(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Publish"}</button>
    </div>
    {!storageReady && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">Apply the Pages database migration before saving or publishing.</p>}
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm">{message}</p>}
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <p className="flex-1">Click any editable part of the page, then change its content or style. Use “Select parent” for its container.</p>
      <select aria-label="Preview size" value={width} onChange={e => setWidth(e.target.value)} className="rounded-lg border bg-white px-2 py-1"><option value="100%">Desktop</option><option value="768px">Tablet</option><option value="390px">Mobile</option></select>
      <a href={path} target="_blank" rel="noreferrer" className="text-blue-600">View live ↗</a>
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 overflow-auto rounded-xl border bg-slate-200 p-2">
        {!ready && <p role="status" className="p-3 text-sm">Loading editable page… If it does not load, sign in again or reload the preview.</p>}
        <iframe ref={iframe} title={`${label} visual editor`} src={`${path}?cms-preview=1`} onLoad={() => send("cms:hello")} className="mx-auto h-[75vh] min-h-[500px] border-0 bg-white" style={{ width, maxWidth: "100%" }} />
      </div>
      <aside className="max-h-[85vh] space-y-4 overflow-auto rounded-xl border bg-white p-4">
        <div className="flex gap-2 border-b pb-3"><button className={`flex-1 rounded-lg p-2 text-sm ${tab === "element" ? "bg-blue-50 text-blue-700" : ""}`} onClick={() => setTab("element")}>Selected element</button><button className={`flex-1 rounded-lg p-2 text-sm ${tab === "sections" ? "bg-blue-50 text-blue-700" : ""}`} onClick={() => setTab("sections")}>Sections</button></div>
        {tab === "element" && (!selection ? <p className="text-sm text-slate-500">Click a heading, paragraph, image, button or section in the preview to begin.</p> : <div className="space-y-4">
          <div className="flex justify-between text-xs"><strong className="uppercase">{selection.tag}</strong><button className="text-blue-600" onClick={() => send("cms:select-parent")}>Select parent ↑</button></div>
          {selection.parentId && (selection.siblings?.length ?? 0) > 1 && <div className="flex gap-3 text-xs text-blue-600"><button onClick={() => moveOriginal(-1)}>Move section ↑</button><button onClick={() => moveOriginal(1)}>Move section ↓</button></div>}
          {Object.entries(selection.texts).map(([key, text], index) => <label key={key} className="block text-xs font-semibold">Text {Object.keys(selection.texts).length > 1 ? index + 1 : ""}<textarea rows={3} className={field} value={current.texts?.[key] ?? text} onChange={e => patchElement({ texts: { ...current.texts, [key]: e.target.value } })} /></label>)}
          {selection.href !== undefined && <label className="block text-xs font-semibold">Button / link URL<input className={field} value={current.href ?? selection.href} onChange={e => patchElement({ href: e.target.value })} /></label>}
          {selection.src !== undefined && <><label className="block text-xs font-semibold">Image URL<input className={field} value={current.src ?? selection.src} onChange={e => patchElement({ src: e.target.value })} /></label><label className="block text-xs font-semibold">Image description<input className={field} value={current.alt ?? selection.alt ?? ""} onChange={e => patchElement({ alt: e.target.value })} /></label></>}
          <StyleFields value={current.style ?? {}} onChange={style => patchElement({ style })} />
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!current.hidden} onChange={e => patchElement({ hidden: e.target.checked })} />Hide this element</label>
          <button className="text-xs text-red-600" onClick={() => { const elements = { ...document.elements }; delete elements[selection.id]; update({ ...document, elements }); }}>Reset this element to original</button>
          {source && <p className="text-xs text-slate-500">For the full record and rich content, <Link href={source} target="_blank" className="text-blue-600">open its content manager ↗</Link>.</p>}
        </div>)}
        {tab === "sections" && <div className="space-y-4">
          <p className="text-xs text-slate-500">Add sections above or below the existing page. Drag to reorder, or use the arrow buttons. Select existing sections in the preview to style or hide them.</p>
          <button className="w-full rounded-lg bg-blue-600 p-2 text-sm font-semibold text-white" onClick={() => update({ ...document, blocks: [...document.blocks, { id: crypto.randomUUID(), title: "New section", body: "Add your content here.", image: "", button: "", href: "", position: "after", hidden: false, style: { backgroundColor: "#ffffff", color: "#172554", padding: 48 } }] })}>+ Add section</button>
          {document.blocks.map((block, index) => <details key={block.id} className="rounded-lg border p-3" draggable onDragStart={() => { dragId.current = block.id; }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const from = document.blocks.findIndex(b => b.id === dragId.current); if (from >= 0) moveBlock(dragId.current!, index - from); dragId.current = null; }}>
            <summary className="cursor-pointer text-sm font-semibold">☷ {block.title || "Untitled section"}{block.hidden ? " (hidden)" : ""}</summary>
            <div className="mt-3 space-y-3">
              <div className="flex gap-3 text-xs"><button disabled={index === 0} onClick={() => moveBlock(block.id, -1)}>Move ↑</button><button disabled={index === document.blocks.length - 1} onClick={() => moveBlock(block.id, 1)}>Move ↓</button><button className="ml-auto text-red-600" onClick={() => update({ ...document, blocks: document.blocks.filter(b => b.id !== block.id) })}>Remove</button></div>
              <label className="block text-xs">Position<select className={field} value={block.position} onChange={e => patchBlock(block.id, { position: e.target.value as "before" | "after" })}><option value="before">Above existing page</option><option value="after">Below existing page</option></select></label>
              <label className="block text-xs">Heading<input className={field} value={block.title} onChange={e => patchBlock(block.id, { title: e.target.value })} /></label>
              <label className="block text-xs">Content<textarea className={field} rows={4} value={block.body} onChange={e => patchBlock(block.id, { body: e.target.value })} /></label>
              <label className="block text-xs">Image URL<input className={field} value={block.image} onChange={e => patchBlock(block.id, { image: e.target.value })} /></label>
              <label className="block text-xs">Button text<input className={field} value={block.button} onChange={e => patchBlock(block.id, { button: e.target.value })} /></label>
              <label className="block text-xs">Button URL<input className={field} value={block.href} onChange={e => patchBlock(block.id, { href: e.target.value })} /></label>
              <StyleFields value={block.style} onChange={style => patchBlock(block.id, { style })} />
              <label className="flex gap-2 text-xs"><input type="checkbox" checked={block.hidden} onChange={e => patchBlock(block.id, { hidden: e.target.checked })} />Hide section</label>
            </div>
          </details>)}
          {Object.entries(document.elements).some(([, item]) => item.hidden) && <div className="space-y-2"><h3 className="text-xs font-semibold">Hidden original elements</h3>{Object.entries(document.elements).filter(([, item]) => item.hidden).map(([id, item], i) => <button key={id} className="block text-xs text-blue-600" onClick={() => update({ ...document, elements: { ...document.elements, [id]: { ...item, hidden: false } } })}>Restore element {i + 1}</button>)}</div>}
        </div>}
        <div className="space-y-2 border-t pt-4 text-xs"><button className="block text-slate-500" onClick={() => { if (window.confirm("Replace this draft with the published version? You can undo this.")) update(published); }}>Restore published version</button><button className="block text-red-600" onClick={() => { if (window.confirm("Reset all page edits to the original design? Publish to apply this to the live page.")) update(emptyDocument()); }}>Reset page to original</button></div>
      </aside>
    </div>
  </div>;
}

function StyleFields({ value, onChange }: { value: CmsStyle; onChange: (style: CmsStyle) => void }) {
  return <div className="space-y-3 border-t pt-3">
    <h3 className="text-xs font-semibold uppercase text-slate-500">Style</h3>
    <div className="grid grid-cols-2 gap-3">{([ ["color", "Text color"], ["backgroundColor", "Background"] ] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<div className="mt-1 flex items-center gap-2"><input aria-label={label} type="color" value={value[key] || (key === "color" ? "#172554" : "#ffffff")} onChange={e => onChange({ ...value, [key]: e.target.value })} /><button className="text-slate-400" title="Use original color" onClick={() => { const next = { ...value }; delete next[key]; onChange(next); }}>↺</button></div></label>)}</div>
    <div className="grid grid-cols-2 gap-3">{([ ["fontSize", "Font size", 8, 160], ["padding", "Padding", 0, 200], ["borderRadius", "Corners", 0, 100] ] as const).map(([key, label, min, max]) => <label key={key} className="text-xs">{label} (px)<input type="number" min={min} max={max} placeholder="Original" className={field} value={value[key] ?? ""} onChange={e => { const next = { ...value }; if (!e.target.value) delete next[key]; else next[key] = Number(e.target.value); onChange(next); }} /></label>)}</div>
    <label className="block text-xs">Alignment<select className={field} value={value.textAlign ?? ""} onChange={e => onChange({ ...value, textAlign: e.target.value ? e.target.value as CmsStyle["textAlign"] : undefined })}><option value="">Original</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
    <label className="block text-xs">Font weight<select className={field} value={value.fontWeight ?? ""} onChange={e => onChange({ ...value, fontWeight: e.target.value ? e.target.value as CmsStyle["fontWeight"] : undefined })}><option value="">Original</option>{["400", "500", "600", "700", "800", "900"].map(v => <option key={v}>{v}</option>)}</select></label>
  </div>;
}
