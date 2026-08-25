"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import type { AITool } from "@/lib/ai-tools";
import { normalizeImageUrl } from "@/lib/image-url";

type TutorialFilter = "all" | "with-video" | "without-video";
type SortOption = "newest" | "oldest" | "name";

export function AIToolsGrid({ tools, showStatus = false, renderActions }: { tools: AITool[]; showStatus?: boolean; renderActions?: (tool: AITool) => ReactNode }) {
  const [query, setQuery] = useState("");
  const [tutorialFilter, setTutorialFilter] = useState<TutorialFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [selected, setSelected] = useState<AITool | null>(null);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [selected]);

  const filteredTools = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tools
      .filter((tool) => !term || `${tool.name} ${tool.benefits}`.toLowerCase().includes(term))
      .filter((tool) => tutorialFilter === "all" || (tutorialFilter === "with-video" ? Boolean(tool.youtube_url) : !tool.youtube_url))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        const difference = new Date(a.published_at ?? a.created_at).getTime() - new Date(b.published_at ?? b.created_at).getTime();
        return sort === "oldest" ? difference : -difference;
      });
  }, [query, sort, tools, tutorialFilter]);

  return <div className="space-y-6">
    <div className="wc-card sticky top-24 z-20 grid gap-3 p-4 shadow-lg backdrop-blur-xl md:grid-cols-[minmax(240px,1fr)_auto_auto]">
      <label className="relative block">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
        <input className="wc-input w-full pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search AI tools or benefits..." aria-label="Search AI tools" />
      </label>
      <select className="wc-input min-w-48" value={tutorialFilter} onChange={(event) => setTutorialFilter(event.target.value as TutorialFilter)} aria-label="Filter by tutorial availability">
        <option value="all">All tools</option><option value="with-video">With YouTube tutorial</option><option value="without-video">Without tutorial</option>
      </select>
      <select className="wc-input min-w-40" value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="Sort AI tools">
        <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option>
      </select>
    </div>

    <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-on-surface-variant">Showing {filteredTools.length} of {tools.length} tools</p>{(query || tutorialFilter !== "all" || sort !== "newest") && <button type="button" className="text-sm font-black text-secondary" onClick={() => { setQuery(""); setTutorialFilter("all"); setSort("newest"); }}>Clear filters</button>}</div>

    {filteredTools.length ? <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3">{filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} showStatus={showStatus} onSelect={() => setSelected(tool)} />)}</div> : <EmptyState hasTools={tools.length > 0} />}
    {selected && <ToolDetailsModal tool={selected} showStatus={showStatus} actions={renderActions?.(selected)} onClose={() => setSelected(null)} />}
  </div>;
}

function ToolCard({ tool, showStatus, onSelect }: { tool: AITool; showStatus: boolean; onSelect: () => void }) {
  const imageUrl = normalizeImageUrl(tool.image_url) ?? tool.image_url;
  return <article className="wc-card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl" onClick={onSelect}>
    <div className="relative aspect-[16/9] overflow-hidden bg-surface-container p-2">
      <Image src={imageUrl} alt={`${tool.name} preview`} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain p-2 transition duration-500 group-hover:scale-[1.02]" unoptimized />
      {tool.youtube_url && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-3 py-1.5 text-xs font-black text-white backdrop-blur"><Icon name="play_circle" className="text-base" /> Tutorial</span>}
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 text-xl font-black leading-tight text-on-surface">{tool.name}</h2><StatusBadge status={showStatus ? tool.status : "approved"} /></div>
      <button type="button" className="mt-5 flex w-full items-center justify-center gap-1 rounded-lg border border-outline-variant py-2.5 text-sm font-black transition hover:border-secondary hover:bg-secondary hover:text-on-primary">View Details <Icon name="arrow_forward" /></button>
    </div>
  </article>;
}

function ToolDetailsModal({ tool, showStatus, actions, onClose }: { tool: AITool; showStatus: boolean; actions?: ReactNode; onClose: () => void }) {
  const imageUrl = normalizeImageUrl(tool.image_url) ?? tool.image_url;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ai-tool-title">
    <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface/95 p-5 backdrop-blur-xl sm:p-6">
        <div className="min-w-0"><div className="mb-1 flex items-center gap-2"><p className="text-[10px] font-black uppercase tracking-widest text-secondary">AI Tool Details</p>{showStatus && <StatusBadge status={tool.status} />}</div><h2 id="ai-tool-title" className="truncate text-2xl font-black text-on-surface">{tool.name}</h2></div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface transition hover:scale-110 hover:bg-secondary hover:text-on-primary" aria-label="Close tool details"><Icon name="close" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container p-3"><Image src={imageUrl} alt={`${tool.name} preview`} fill sizes="(max-width: 896px) 100vw, 896px" className="object-contain p-3" unoptimized />{tool.youtube_url && <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-2 text-xs font-black text-white"><Icon name="play_circle" /> Tutorial available</span>}</div>
        <section><h3 className="mb-4 text-xl font-black text-on-surface">Benefits & Description</h3><div className="whitespace-pre-line rounded-2xl border border-outline-variant bg-surface-container p-5 text-sm leading-7 text-on-surface-variant sm:p-6">{tool.benefits}</div></section>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><a href={tool.url} target="_blank" rel="noopener noreferrer" className="wc-primary-btn justify-center py-3"><Icon name="open_in_new" /> Open AI Tool</a>{tool.youtube_url && <a href={tool.youtube_url} target="_blank" rel="noopener noreferrer" className="wc-secondary-btn justify-center py-3"><Icon name="play_circle" /> Learn on YouTube</a>}</div>
        {actions && <div className="mt-6 flex flex-wrap gap-2 border-t border-outline-variant pt-6">{actions}</div>}
      </div>
    </div>
  </div>;
}

function StatusBadge({ status }: { status: AITool["status"] }) {
  const style = status === "approved" ? "bg-green-100 text-green-800" : status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style}`}>{status === "approved" ? "Verified" : status}</span>;
}

function EmptyState({ hasTools }: { hasTools: boolean }) {
  return <div className="wc-card py-16 text-center"><Icon name={hasTools ? "search_off" : "smart_toy"} className="text-5xl text-secondary" /><h2 className="mt-4 text-2xl font-black">{hasTools ? "No matching tools" : "AI tools are coming soon"}</h2><p className="mt-2 text-on-surface-variant">{hasTools ? "Try another search or clear the selected filters." : "Our students and research team are curating useful tools."}</p></div>;
}
