"use client";
import { CmsElement, CmsInstance } from "@/components/cms/cms-element";
import { useMemo, useState, useEffect } from "react";
import { Icon } from "@/components/icon";
import { driveId, driveThumbnail, fillPrompt, promptVariables, type Prompt } from "@/lib/prompts";

function Lightbox({ urls, initialIndex, onClose, title }: { urls: string[]; initialIndex: number; onClose: () => void; title: string }) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setIndex((prev) => (prev + 1) % urls.length); setScale(1); setPosition({ x: 0, y: 0 }); }
      if (e.key === "ArrowLeft") { setIndex((prev) => (prev - 1 + urls.length) % urls.length); setScale(1); setPosition({ x: 0, y: 0 }); }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [urls.length, onClose]);

  const currentUrl = urls[index];
  const src = driveThumbnail(currentUrl, 2000);

  if (!src) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setPositionStart({ ...position });
      setHasDragged(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setHasDragged(true);
      }
      setPosition({
        x: positionStart.x + dx,
        y: positionStart.y + dy
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2);
    } else {
      if (!hasDragged) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  return (
    <CmsElement cmsId="d80dc3cb-0" as="div" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <CmsElement cmsId="d80dc3cb-1" as="div" className="absolute top-4 right-4 flex gap-4 z-50 text-white">
        <CmsElement cmsId="d80dc3cb-2" as="button" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition-colors" onClick={(e) => { e.stopPropagation(); setScale(s => s === 1 ? 2 : 1); setPosition({ x: 0, y: 0 }); }}>
          {scale === 1 ? "Zoom In" : "Zoom Out"}
        </CmsElement>
        <CmsElement cmsId="d80dc3cb-3" as="button" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition-colors" onClick={onClose}>
          Close
        </CmsElement>
      </CmsElement>

      {urls.length > 1 && (
        <CmsElement cmsId="d80dc3cb-4" as="button" className="absolute left-4 z-50 p-4 text-4xl text-white/70 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setIndex((prev) => (prev - 1 + urls.length) % urls.length); setScale(1); setPosition({ x: 0, y: 0 }); }}>
          ‹
        </CmsElement>
      )}

      <CmsElement cmsId="d80dc3cb-5" as="div" className="relative flex h-full w-full items-center justify-center overflow-hidden p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
        <CmsElement cmsId="d80dc3cb-6" as="img"
          src={src}
          alt={`${title} - view ${index + 1}`}
          className="max-h-full max-w-full object-contain transition-transform"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            transitionDuration: isDragging ? "0ms" : "300ms",
            touchAction: "none"
          }}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          draggable={false}
          loading="lazy"
        />
      </CmsElement>

      {urls.length > 1 && (
        <CmsElement cmsId="d80dc3cb-7" as="button" className="absolute right-4 z-50 p-4 text-4xl text-white/70 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setIndex((prev) => (prev + 1) % urls.length); setScale(1); setPosition({ x: 0, y: 0 }); }}>
          ›
        </CmsElement>
      )}

      <CmsElement cmsId="d80dc3cb-8" as="div" className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/50 pointer-events-none">
        {index + 1} / {urls.length}
      </CmsElement>
    </CmsElement>
  );
}

function PromptThumbnail({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const [cdnAttempt, setCdnAttempt] = useState(0);
  const id = driveId(url);
  const thumbnail = driveThumbnail(url, 800);

  if (!url) return null;

  const imgSrc = (() => {
    if (!id) return url;
    if (cdnAttempt === 1) return `https://lh3.googleusercontent.com/d/${id}=s800`;
    if (cdnAttempt === 2) return `https://drive.google.com/uc?export=view&id=${id}`;
    return thumbnail || url;
  })();

  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-surface-container-low p-4 text-center">
        <Icon name="image_not_supported" className="text-3xl text-on-surface-variant/40" />
        <span className="line-clamp-1 text-xs font-semibold text-on-surface-variant">{title}</span>
        {id && (
          <a
            href={`https://drive.google.com/file/d/${id}/view`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm hover:border-primary"
          >
            <Icon name="open_in_new" className="text-[12px]" /> Open in Drive
          </a>
        )}
      </div>
    );
  }

  return (
    <CmsElement cmsId="d80dc3cb-9" as="div" className="overflow-hidden bg-surface-container-low">
      <CmsElement cmsId="d80dc3cb-10" as="img"
        src={imgSrc}
        alt={`${title} - output preview`}
        className="aspect-video w-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (id && cdnAttempt < 2) {
            setCdnAttempt((prev) => prev + 1);
          } else {
            setFailed(true);
          }
        }}
      />
    </CmsElement>
  );
}

export function PromptMedia({ urls, title }: { urls: string[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <CmsElement cmsId="d80dc3cb-11" as="div" className="grid gap-4 md:grid-cols-2">
        {urls.map((url, index) => {
          const thumbnail = driveThumbnail(url, 800);
          return thumbnail ? (
            <CmsElement cmsId="d80dc3cb-12" as="div" instance={String(`${url}-${index}`)}
              key={`${url}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-outline-variant bg-black cursor-zoom-in"
              onClick={() => setLightboxIndex(index)}
            >
              <CmsElement cmsId="d80dc3cb-13" as="img"
                src={thumbnail}
                alt={`${title} — preview ${index + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="aspect-video w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
              <CmsElement cmsId="d80dc3cb-14" as="div" className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <CmsElement cmsId="d80dc3cb-15" as="span" className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                  Expand
                </CmsElement>
              </CmsElement>
            </CmsElement>
          ) : null;
        })}
      </CmsElement>
      {lightboxIndex !== null && (
        <Lightbox urls={urls} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} title={title} />
      )}
    </>
  );
}

function PromptDetail({ prompt }: { prompt: Prompt }) {
  const variables = promptVariables(prompt.template);
  const [values, setValues] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState("");
  const [message, setMessage] = useState("");
  return <CmsElement cmsId="d80dc3cb-16" as="article" className="mt-5 space-y-6 border-t border-outline-variant pt-6">
    <PromptMedia urls={prompt.media_urls} title={prompt.title} />
    <CmsElement cmsId="d80dc3cb-17" as="p" className="whitespace-pre-wrap text-on-surface-variant">{prompt.description}</CmsElement>
    {Number(prompt.price) > 0 ? <CmsElement cmsId="d80dc3cb-18" as="div" className="rounded-2xl bg-primary-container p-6 text-on-primary-container"><CmsElement cmsId="d80dc3cb-19" as="h3" className="text-xl font-bold">Premium prompt · PKR {Number(prompt.price).toLocaleString()}</CmsElement>{prompt.purchase_url ? <><CmsElement cmsId="d80dc3cb-20" as="p" className="my-3">Purchase and delivery are handled by the creator through the link below.</CmsElement><CmsElement cmsId="d80dc3cb-21" as="a" href={prompt.purchase_url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-primary px-6 py-3 font-bold text-on-primary">Get this prompt ↗</CmsElement></> : <CmsElement cmsId="d80dc3cb-22" as="p" className="my-3">Purchase link has not been added yet.</CmsElement>}</CmsElement> : <>
    <form onSubmit={(event) => { event.preventDefault(); setGenerated(fillPrompt(prompt.template, values)); setMessage(""); }} className="rounded-2xl border border-outline-variant bg-background p-5 md:p-7"><CmsElement cmsId="d80dc3cb-23" as="h3" className="mb-5 text-lg font-bold">{variables.length ? "Fill in the variables" : "Ready to create?"}</CmsElement><CmsElement cmsId="d80dc3cb-24" as="div" className="grid gap-4 md:grid-cols-2">{variables.map((key) => <CmsElement cmsId="d80dc3cb-25" as="label" instance={String(key)} key={key} className="text-sm font-semibold">{key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}<input required maxLength={2000} value={values[key] ?? ""} onChange={(e) => { setValues({ ...values, [key]: e.target.value }); setGenerated(""); setMessage(""); }} placeholder={`e.g. ${key.replace(/([a-z])([A-Z])/g, "$1 $2")}`} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface p-3 font-normal" /></CmsElement>)}</CmsElement><CmsElement cmsId="d80dc3cb-26" as="button" className="mt-5 rounded-full bg-primary px-6 py-3 font-bold text-on-primary">✧ Generate prompt</CmsElement></form>
    <CmsElement cmsId="d80dc3cb-27" as="section"><CmsElement cmsId="d80dc3cb-28" as="h3" className="mb-3 text-lg font-bold">{generated ? "Your personalized prompt" : "Prompt template"}</CmsElement><CmsElement cmsId="d80dc3cb-29" as="div" className="rounded-2xl border border-outline-variant bg-background p-5"><pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7">{generated || prompt.template}</pre><CmsElement cmsId="d80dc3cb-30" as="button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(generated || prompt.template); setMessage("Prompt copied!"); } catch { setMessage("Copy unavailable. Select the prompt text above and copy it manually."); } }} className="mt-5 rounded-full bg-primary px-6 py-3 font-bold text-on-primary">Copy {generated ? "prompt" : "template"}</CmsElement><CmsElement cmsId="d80dc3cb-31" as="p" role="status" className="mt-2 text-sm">{message}</CmsElement></CmsElement></CmsElement></>}
  </CmsElement>;
}

export function PromptLibrary({ prompts, renderAdminControls }: { prompts: Prompt[]; renderAdminControls?: (prompt: Prompt) => React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [pricing, setPricing] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(prompts.map((p) => p.category))].filter(Boolean).sort(), [prompts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of prompts) {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    }
    return counts;
  }, [prompts]);

  const filtered = useMemo(() => prompts.filter((p) => `${p.title} ${p.description} ${p.category} ${p.model}`.toLowerCase().includes(search.toLowerCase()) && (!category || p.category === category) && (!pricing || (pricing === "free" ? Number(p.price) === 0 : Number(p.price) > 0))).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [prompts, search, category, pricing, sort]);
  const field = "rounded-xl border border-outline-variant bg-surface p-3";

  return <>
    <CmsElement cmsId="d80dc3cb-32" as="div" className="space-y-4">
      <div className="grid gap-3 rounded-2xl bg-surface p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr]">
        <input aria-label="Search prompts" placeholder="Search prompts, ideas, or AI models…" value={search} onChange={(e) => setSearch(e.target.value)} className={field} />
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
          <option value="">All categories ({prompts.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c} ({categoryCounts[c] ?? 0})
            </option>
          ))}
        </select>
        <select aria-label="Pricing" value={pricing} onChange={(e) => setPricing(e.target.value)} className={field}>
          <option value="">Free &amp; premium</option>
          <option value="free">Free</option>
          <option value="paid">Premium</option>
        </select>
        <select aria-label="Sort prompts" value={sort} onChange={(e) => setSort(e.target.value)} className={field}>
          <option value="newest">Newest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm no-scrollbar">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              !category
                ? "bg-primary text-on-primary shadow-sm"
                : "border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            All ({prompts.length})
          </button>
          {categories.map((c) => {
            const isSelected = category === c;
            const count = categoryCounts[c] ?? 0;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(isSelected ? "" : c)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      )}
    </CmsElement>

    <CmsElement cmsId="d80dc3cb-33" as="p" className="my-5 text-sm text-on-surface-variant">
      Showing <span className="font-bold text-on-background">{filtered.length}</span> {filtered.length === 1 ? "prompt" : "prompts"}
      {category && (
        <> in <span className="font-bold text-primary">{category}</span></>
      )}
    </CmsElement>

    {!filtered.length && <CmsElement cmsId="d80dc3cb-34" as="div" className="rounded-2xl border border-dashed border-outline-variant p-12 text-center"><CmsElement cmsId="d80dc3cb-35" as="h2" className="text-xl font-bold">{prompts.length ? "No matching prompts" : "Fresh ideas are on their way"}</CmsElement><CmsElement cmsId="d80dc3cb-36" as="p" className="mt-2 text-on-surface-variant">{prompts.length ? "Try a different search or clear your filters." : "Approved community prompts will appear here."}</CmsElement>{prompts.length > 0 && <CmsElement cmsId="d80dc3cb-37" as="button" onClick={() => { setSearch(""); setCategory(""); setPricing(""); }} className="mt-4 text-primary">Clear filters</CmsElement>}</CmsElement>}
    <CmsElement cmsId="d80dc3cb-38" as="div" className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((prompt) => { const coverUrl = prompt.media_urls[0]; return <CmsElement cmsId="d80dc3cb-39" as="div" instance={String(prompt.id)} key={prompt.id} className={`flex flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm ${selected === prompt.id ? "md:col-span-2 lg:col-span-3" : ""}`}>{selected !== prompt.id && coverUrl && <CmsInstance key={coverUrl} instance={String(coverUrl)}><PromptThumbnail key={coverUrl} url={coverUrl} title={prompt.title} /></CmsInstance>}<CmsElement cmsId="d80dc3cb-40" as="div" className="flex flex-1 flex-col p-6">{selected === prompt.id && <CmsElement cmsId="d80dc3cb-41" as="div" className="flex items-center justify-between gap-3 text-xs font-bold"><CmsElement cmsId="d80dc3cb-42" as="span" className="rounded-full bg-secondary-container px-3 py-1 text-on-secondary-container">{prompt.category}</CmsElement><CmsElement cmsId="d80dc3cb-43" as="span" className="text-primary">{Number(prompt.price) === 0 ? "FREE" : `PKR ${Number(prompt.price).toLocaleString()}`}</CmsElement></CmsElement>}<CmsElement cmsId="d80dc3cb-44" as="h2" className={`font-bold ${selected === prompt.id ? "mb-2 mt-5 text-2xl md:text-3xl" : "flex-1 text-lg md:text-xl"}`}>{prompt.title}</CmsElement>{selected === prompt.id && <CmsElement cmsId="d80dc3cb-45" as="p" className="text-sm text-on-surface-variant">{prompt.model}</CmsElement>}<CmsElement cmsId="d80dc3cb-46" as="button" aria-expanded={selected === prompt.id} onClick={() => setSelected(selected === prompt.id ? null : prompt.id)} className={`flex w-full items-center justify-between text-left font-bold text-primary ${selected === prompt.id ? "mt-6" : "mt-4"}`}>{selected === prompt.id ? "Close prompt ↑" : "Use prompt ↓"}</CmsElement>{selected === prompt.id && <PromptDetail prompt={prompt} />}{renderAdminControls?.(prompt)}</CmsElement></CmsElement>; })}</CmsElement></>;
}
