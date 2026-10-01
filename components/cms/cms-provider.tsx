"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { documentSchema, emptyDocument, type CmsDocument, type CmsSelection, type PageSetting } from "@/lib/cms/model";

type CmsContext = { document: CmsDocument; settings: PageSetting[]; preview: boolean; editing: boolean; selected: string | null; select: (selection: CmsSelection) => void };
const Context = createContext<CmsContext>({ document: emptyDocument(), settings: [], preview: false, editing: false, selected: null, select: () => {} });
export const useCms = () => useContext(Context);

export function CmsProvider({ path, initialDocument, settings, preview, children }: { path: string; initialDocument: CmsDocument; settings: PageSetting[]; preview: boolean; children: React.ReactNode }) {
  const [document, setDocument] = useState(initialDocument);
  const [editing, setEditing] = useState(preview);
  const [selected, setSelected] = useState<string | null>(null);
  const select = useCallback((selection: CmsSelection) => {
    setSelected(selection.id);
    window.parent.postMessage({ type: "cms:selection", path, selection }, window.location.origin);
  }, [path]);
  useEffect(() => {
    if (!preview) return;
    const preventSubmit = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const preventNavigation = (event: Event) => {
      if (!editing && (event.target as HTMLElement).closest("a,button,input,select,textarea")) preventSubmit(event);
    };
    window.addEventListener("submit", preventSubmit, true);
    window.addEventListener("click", preventNavigation, true);
    return () => { window.removeEventListener("submit", preventSubmit, true); window.removeEventListener("click", preventNavigation, true); };
  }, [preview, editing]);
  useEffect(() => {
    if (!preview || window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.path !== path) return;
      if (event.data.type === "cms:update") {
        const parsed = documentSchema.safeParse(event.data.document);
        if (parsed.success) setDocument(parsed.data);
        setEditing(event.data.editing !== false);
      }
      if (event.data.type === "cms:select-parent" && selected) {
        const element = Array.from(window.document.querySelectorAll<HTMLElement>("[data-cms-id]")).find(el => el.dataset.cmsId === selected);
        element?.parentElement?.closest<HTMLElement>("[data-cms-id]")?.click();
      }
      if (event.data.type === "cms:hello") window.parent.postMessage({ type: "cms:ready", path }, window.location.origin);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "cms:ready", path }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [path, preview, selected]);
  return <Context.Provider value={{ document, settings, preview, editing, selected, select }}>
    {preview && <style>{`[data-cms-id] { cursor: crosshair !important; } [data-cms-id]:hover { outline: 1px dashed #1685f8; outline-offset: -1px; } [data-cms-selected="true"] { outline: 3px solid #1685f8 !important; outline-offset: -3px; }`}</style>}
    <CmsBlocks position="before" document={document} />
    {children}
    <CmsBlocks position="after" document={document} />
  </Context.Provider>;
}

function CmsBlocks({ position, document }: { position: "before" | "after"; document: CmsDocument }) {
  return <>{document.blocks.filter(b => b.position === position && !b.hidden).map(block => <section key={block.id} className="px-6 py-16" style={block.style}>
    <div className="mx-auto max-w-6xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {block.image && <img src={block.image} alt={block.title} className="mb-6 max-h-96 w-full rounded-2xl object-cover" />}
      {block.title && <h2 className="mb-4 text-3xl font-bold">{block.title}</h2>}
      {block.body && <p className="whitespace-pre-wrap leading-relaxed">{block.body}</p>}
      {block.button && block.href && <a href={block.href} className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">{block.button}</a>}
    </div>
  </section>)}</>;
}
