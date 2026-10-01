"use client";
import { CmsElement, CmsInstance, CmsImage } from "@/components/cms/cms-element";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import type { AITool } from "@/lib/ai-tools";
import { normalizeImageUrl } from "@/lib/image-url";

type TutorialFilter = "all" | "with-video" | "without-video";
type SortOption = "newest" | "oldest" | "name";

export function AIToolsGrid({ tools, showStatus = false, renderActions }: { tools: AITool[]; showStatus?: boolean; renderActions?: (tool: AITool, closeModal: () => void) => ReactNode }) {
  const [query, setQuery] = useState("");
  const [tutorialFilter, setTutorialFilter] = useState<TutorialFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
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

  const categories = useMemo(() => {
    const cats = new Set(tools.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [tools]);

  const filteredTools = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tools
      .filter((tool) => !term || `${tool.name} ${tool.benefits}`.toLowerCase().includes(term))
      .filter((tool) => tutorialFilter === "all" || (tutorialFilter === "with-video" ? Boolean(tool.youtube_url) : !tool.youtube_url))
      .filter((tool) => categoryFilter === "all" || tool.category === categoryFilter)
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        const difference = new Date(a.published_at ?? a.created_at).getTime() - new Date(b.published_at ?? b.created_at).getTime();
        return sort === "oldest" ? difference : -difference;
      });
  }, [query, sort, tools, tutorialFilter, categoryFilter]);

  return <CmsElement cmsId="80711f07-0" as="div" className="space-y-6">
    <CmsElement cmsId="80711f07-1" as="div" className="wc-card sticky top-24 z-20 grid gap-3 p-4 shadow-lg backdrop-blur-xl md:grid-cols-[minmax(240px,1fr)_auto_auto_auto]">
      <CmsElement cmsId="80711f07-2" as="label" className="relative block">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
        <input className="wc-input w-full pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search AI tools or benefits..." aria-label="Search AI tools" />
      </CmsElement>
      <select className="wc-input min-w-40" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="wc-input min-w-40" value={tutorialFilter} onChange={(event) => setTutorialFilter(event.target.value as TutorialFilter)} aria-label="Filter by tutorial availability">
        <option value="all">All tools</option><option value="with-video">With YouTube tutorial</option><option value="without-video">Without tutorial</option>
      </select>
      <select className="wc-input min-w-40" value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="Sort AI tools">
        <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option>
      </select>
    </CmsElement>

    <CmsElement cmsId="80711f07-3" as="div" className="flex items-center justify-between gap-3"><CmsElement cmsId="80711f07-4" as="p" className="text-sm font-bold text-on-surface-variant">Showing {filteredTools.length} of {tools.length} tools</CmsElement>{(query || tutorialFilter !== "all" || categoryFilter !== "all" || sort !== "newest") && <CmsElement cmsId="80711f07-5" as="button" type="button" className="text-sm font-black text-secondary" onClick={() => { setQuery(""); setTutorialFilter("all"); setCategoryFilter("all"); setSort("newest"); }}>Clear filters</CmsElement>}</CmsElement>

    {filteredTools.length ? <CmsElement cmsId="80711f07-6" as="div" className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3">{filteredTools.map((tool) => <CmsInstance key={tool.id} instance={String(tool.id)}><ToolCard key={tool.id} tool={tool} showStatus={showStatus} onSelect={() => setSelected(tool)} /></CmsInstance>)}</CmsElement> : <EmptyState hasTools={tools.length > 0} />}
    {selected && <ToolDetailsModal tool={selected} showStatus={showStatus} actions={renderActions?.(selected, () => setSelected(null))} onClose={() => setSelected(null)} />}
  </CmsElement>;
}

function ToolCard({ tool, showStatus, onSelect }: { tool: AITool; showStatus: boolean; onSelect: () => void }) {
  const imageUrl = normalizeImageUrl(tool.image_url) ?? tool.image_url;
  return <CmsElement cmsId="80711f07-7" as="article" className="wc-card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl" onClick={onSelect}>
    <CmsElement cmsId="80711f07-8" as="div" className="relative aspect-[16/9] overflow-hidden bg-surface-container p-2">
      <CmsImage cmsId="80711f07-9" src={imageUrl} alt={`${tool.name} preview`} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain p-2 transition duration-500 group-hover:scale-[1.02]" unoptimized />
      {tool.youtube_url && <CmsElement cmsId="80711f07-10" as="span" className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-3 py-1.5 text-xs font-black text-white backdrop-blur"><Icon name="play_circle" className="text-base" /> Tutorial</CmsElement>}
    </CmsElement>
    <CmsElement cmsId="80711f07-11" as="div" className="p-5">
      <CmsElement cmsId="80711f07-12" as="div" className="flex items-start justify-between gap-3"><CmsElement cmsId="80711f07-13" as="h2" className="min-w-0 text-xl font-black leading-tight text-on-surface">{tool.name}</CmsElement><StatusBadge status={showStatus ? tool.status : "approved"} /></CmsElement>
      {tool.category && <CmsElement cmsId="80711f07-14" as="p" className="mt-1 text-xs font-black uppercase tracking-widest text-secondary">{tool.category}</CmsElement>}
      <CmsElement cmsId="80711f07-15" as="button" type="button" className="mt-5 flex w-full items-center justify-center gap-1 rounded-lg border border-outline-variant py-2.5 text-sm font-black transition hover:border-secondary hover:bg-secondary hover:text-on-primary">View Details <Icon name="arrow_forward" /></CmsElement>
    </CmsElement>
  </CmsElement>;
}

function ToolDetailsModal({ tool, showStatus, actions, onClose }: { tool: AITool; showStatus: boolean; actions?: ReactNode; onClose: () => void }) {
  const imageUrl = normalizeImageUrl(tool.image_url) ?? tool.image_url;
  return <CmsElement cmsId="80711f07-16" as="div" className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ai-tool-title">
    <CmsElement cmsId="80711f07-17" as="div" className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <CmsElement cmsId="80711f07-18" as="div" className="flex items-center justify-between border-b border-outline-variant bg-surface/95 p-5 backdrop-blur-xl sm:p-6">
        <CmsElement cmsId="80711f07-19" as="div" className="min-w-0"><CmsElement cmsId="80711f07-20" as="div" className="mb-1 flex items-center gap-2"><CmsElement cmsId="80711f07-21" as="p" className="text-[10px] font-black uppercase tracking-widest text-secondary">AI Tool Details {tool.category ? `• ${tool.category}` : ""}</CmsElement>{showStatus && <StatusBadge status={tool.status} />}</CmsElement><CmsElement cmsId="80711f07-22" as="h2" id="ai-tool-title" className="truncate text-2xl font-black text-on-surface">{tool.name}</CmsElement></CmsElement>
        <CmsElement cmsId="80711f07-23" as="button" type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface transition hover:scale-110 hover:bg-secondary hover:text-on-primary" aria-label="Close tool details"><Icon name="close" /></CmsElement>
      </CmsElement>
      <CmsElement cmsId="80711f07-24" as="div" className="flex-1 overflow-y-auto p-5 sm:p-8">
        <CmsElement cmsId="80711f07-25" as="div" className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container p-3"><CmsImage cmsId="80711f07-26" src={imageUrl} alt={`${tool.name} preview`} fill sizes="(max-width: 896px) 100vw, 896px" className="object-contain p-3" unoptimized />{tool.youtube_url && <CmsElement cmsId="80711f07-27" as="span" className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-2 text-xs font-black text-white"><Icon name="play_circle" /> Tutorial available</CmsElement>}</CmsElement>
        <CmsElement cmsId="80711f07-28" as="section"><CmsElement cmsId="80711f07-29" as="h3" className="mb-4 text-xl font-black text-on-surface">Benefits & Description</CmsElement><CmsElement cmsId="80711f07-30" as="div" className="whitespace-pre-line rounded-2xl border border-outline-variant bg-surface-container p-5 text-sm leading-7 text-on-surface-variant sm:p-6">{tool.benefits}</CmsElement></CmsElement>
        <CmsElement cmsId="80711f07-31" as="div" className="mt-8 grid gap-3 sm:grid-cols-2"><CmsElement cmsId="80711f07-32" as="a" href={tool.url} target="_blank" rel="noopener noreferrer" className="wc-primary-btn justify-center py-3"><Icon name="open_in_new" /> Open AI Tool</CmsElement>{tool.youtube_url && <CmsElement cmsId="80711f07-33" as="a" href={tool.youtube_url} target="_blank" rel="noopener noreferrer" className="wc-secondary-btn justify-center py-3"><Icon name="play_circle" /> Learn on YouTube</CmsElement>}</CmsElement>
        {actions && <CmsElement cmsId="80711f07-34" as="div" className="mt-6 flex flex-wrap gap-2 border-t border-outline-variant pt-6">{actions}</CmsElement>}
      </CmsElement>
    </CmsElement>
  </CmsElement>;
}

function StatusBadge({ status }: { status: AITool["status"] }) {
  const style = status === "approved" ? "bg-green-100 text-green-800" : status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
  return <CmsElement cmsId="80711f07-35" as="span" className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style}`}>{status === "approved" ? "Verified" : status}</CmsElement>;
}

function EmptyState({ hasTools }: { hasTools: boolean }) {
  return <CmsElement cmsId="80711f07-36" as="div" className="wc-card py-16 text-center"><Icon name={hasTools ? "search_off" : "smart_toy"} className="text-5xl text-secondary" /><CmsElement cmsId="80711f07-37" as="h2" className="mt-4 text-2xl font-black">{hasTools ? "No matching tools" : "AI tools are coming soon"}</CmsElement><CmsElement cmsId="80711f07-38" as="p" className="mt-2 text-on-surface-variant">{hasTools ? "Try another search or clear the selected filters." : "Our students and research team are curating useful tools."}</CmsElement></CmsElement>;
}
