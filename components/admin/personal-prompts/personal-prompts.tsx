/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { fetchPersonalPrompts, addPersonalPrompt, updatePersonalPrompt, deletePersonalPrompt } from "@/app/admin/personal-prompts/actions";
import { Icon } from "@/components/icon";

export function PersonalPrompts() {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [favoriteFilter, setFavoriteFilter] = useState(false);

  const [editData, setEditData] = useState<any>(null);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetchPersonalPrompts();
    if (res.success) {
      const loadedPrompts = res.prompts || [];
      setPrompts(loadedPrompts);
      // Topics should open as compact tiles whenever the page is entered.
      const initialCollapsed: Record<string, boolean> = {};
      loadedPrompts.forEach((p: any) => { initialCollapsed[p.id] = true; });
      setCollapsedMap(initialCollapsed);
    } else {
      setToast({ type: "error", message: res.error || "Failed to load data" });
    }
    setLoading(false);
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ type: "success", message: "Copied to clipboard!" });
  };

  const handleDuplicatePrompt = (p: any) => {
    const clone = {
      ...p,
      id: undefined,
      title: `${p.title} (Copy)`,
      prompts_data: JSON.parse(JSON.stringify(p.prompts_data || []))
    };
    setEditData(clone);
    setIsModalOpen(true);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    const map: Record<string, boolean> = {};
    prompts.forEach(p => { map[p.id] = true; });
    setCollapsedMap(map);
  };

  const expandAll = () => {
    setCollapsedMap({});
  };

  const favoriteCount = prompts.filter(p => p.is_favorite).length;

  const filteredPrompts = prompts.filter(p => {
    if (favoriteFilter && !p.is_favorite) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || 
             p.category.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = Array.from(new Set(["Tricky", ...prompts.map(p => p.category).filter(Boolean)]));

  return (
    <div className="p-4 md:p-6 space-y-3.5 max-w-7xl mx-auto">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Header section - Modern & Compact */}
      <div className="rounded-xl bg-primary px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Icon name="stars" className="text-amber-400 text-[20px]" />
            My Personal Prompts
          </h1>
          <p className="text-xs text-blue-100/90 mt-0.5">Save, customize template variables, and quickly copy or share prompts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            type="button" 
            onClick={expandAll}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Expand all topics"
          >
            <Icon name="unfold_more" className="text-[15px]" />
            Expand All
          </button>
          <button 
            type="button" 
            onClick={collapseAll}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Collapse all topics"
          >
            <Icon name="unfold_less" className="text-[15px]" />
            Collapse All
          </button>
          <button 
            onClick={() => { setEditData(null); setIsModalOpen(true); }} 
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Icon name="add" className="text-[16px]" />
            Add Prompt
          </button>
        </div>
      </div>
      
      {/* Search and Filters - Sleek Single-Line Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 items-center shadow-2xs">
        <div className="relative flex-1 w-full">
          <Icon name="search" className="absolute left-3 top-2 text-gray-400 text-[18px]" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts by title or category..." 
            className="w-full bg-gray-50/70 hover:bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <div className="relative min-w-[130px] flex-1 sm:flex-initial">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="w-full bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setFavoriteFilter(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer shrink-0 ${
              favoriteFilter 
                ? "bg-amber-500 text-white border-amber-600 shadow-2xs" 
                : "bg-gray-50 hover:bg-amber-50/60 text-gray-700 border-gray-200 hover:border-amber-300"
            }`}
            title="Filter favorite prompts"
          >
            <Icon name={favoriteFilter ? "star" : "star_outline"} className={`text-[16px] ${favoriteFilter ? "text-white" : "text-amber-500"}`} />
            <span>Favorites</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              favoriteFilter ? "bg-white/30 text-white" : "bg-amber-100 text-amber-800"
            }`}>
              {favoriteCount}
            </span>
          </button>
        </div>
      </div>
      
      {/* Category Quick Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
        <button
          type="button"
          onClick={() => { setCategoryFilter("All"); setFavoriteFilter(false); }}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            categoryFilter === "All" && !favoriteFilter
              ? "bg-primary text-white shadow-2xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All ({prompts.length})
        </button>

        <button
          type="button"
          onClick={() => setFavoriteFilter(prev => !prev)}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
            favoriteFilter
              ? "bg-amber-500 text-white shadow-2xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-amber-50/50 hover:border-amber-300"
          }`}
        >
          <Icon name="star" className={`text-[13px] ${favoriteFilter ? "text-white" : "text-amber-500"}`} />
          Favorites ({favoriteCount})
        </button>

        {categories.map(c => {
          const count = prompts.filter(p => (p.category || "").toLowerCase() === c.toLowerCase()).length;
          const isActive = categoryFilter.toLowerCase() === c.toLowerCase() && !favoriteFilter;
          return (
            <button
              key={c}
              type="button"
              onClick={() => { setCategoryFilter(c); setFavoriteFilter(false); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      {/* Prompts List - Grid with items-start to prevent blank vertical stretching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
        {loading ? (
          <div className="col-span-full text-center py-10 text-gray-400 text-xs">Loading prompts...</div>
        ) : filteredPrompts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Icon name={favoriteFilter ? "star_outline" : "search_off"} className="text-4xl text-amber-400 mb-2 inline-block" />
            <p className="font-semibold text-gray-700 text-sm">
              {favoriteFilter ? "No favorite prompts found." : "No prompts found."}
            </p>
            {favoriteFilter && (
              <button 
                onClick={() => setFavoriteFilter(false)} 
                className="mt-2 text-xs text-primary hover:underline font-bold inline-block cursor-pointer"
              >
                Show all prompts
              </button>
            )}
          </div>
        ) : (
          filteredPrompts.map(p => {
            const isCollapsed = Boolean(collapsedMap[p.id]);
            const promptCount = (p.prompts_data || []).length;

            return (
              <div key={p.id} className="bg-white border border-gray-200/90 rounded-xl p-4 flex flex-col relative shadow-2xs hover:shadow-xs transition-shadow">
                {/* Card Header Row */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className="text-[10px] font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 uppercase">
                        {p.category.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                        {promptCount} {promptCount === 1 ? "Prompt" : "Prompts"}
                      </span>
                      {p.is_favorite && (
                        <span className="flex items-center text-amber-600 text-[11px] font-semibold gap-0.5">
                          <Icon name="star" className="text-[14px]" /> Favorite
                        </span>
                      )}
                    </div>

                    <div 
                      onClick={() => toggleCollapse(p.id)} 
                      className="cursor-pointer group select-none"
                    >
                      <h3 className="text-base font-bold leading-snug text-gray-900 group-hover:text-primary transition-colors">
                        {p.title}
                      </h3>
                      {(p.prompts_data || []).some((pt: any) => pt.label?.trim()) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(p.prompts_data || []).map((pt: any, i: number) => (
                            <span key={i} className="max-w-full truncate rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-100">
                              {pt.label?.trim() || `Prompt ${i + 1}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Favorite & Expand/Collapse */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button"
                      onClick={async () => {
                        const newFav = !p.is_favorite;
                        await updatePersonalPrompt(p.id, { is_favorite: newFav });
                        loadData();
                      }} 
                      title={p.is_favorite ? "Unmark Favorite" : "Mark as Favorite"}
                      className="p-1 rounded-md text-gray-400 hover:text-amber-500 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <Icon name={p.is_favorite ? "star" : "star_outline"} className={`text-[19px] ${p.is_favorite ? "text-amber-500" : ""}`} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => toggleCollapse(p.id)}
                      className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title={isCollapsed ? "Expand Box" : "Collapse Box"}
                    >
                      <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                      <Icon name={isCollapsed ? "expand_more" : "expand_less"} className="text-[17px]" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Body */}
                {!isCollapsed && (
                  <>
                    <div className="space-y-2.5 flex-1 my-3 pt-3 border-t border-gray-100">
                      {(p.prompts_data || []).map((pt: any, i: number) => (
                        <PromptItemViewer
                          key={i}
                          pt={pt}
                          index={i}
                          onCopy={handleCopy}
                        />
                      ))}
                    </div>

                    <div className="flex gap-1.5 justify-end border-t border-gray-100 pt-2.5 mt-auto">
                      <button 
                        onClick={() => handleDuplicatePrompt(p)} 
                        className="px-2.5 py-1 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-100 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Clone / Duplicate this prompt"
                      >
                        <Icon name="content_copy" className="text-[13px] text-gray-500" /> Duplicate
                      </button>
                      <button 
                        onClick={() => { setEditData(p); setIsModalOpen(true); }} 
                        className="px-2.5 py-1 rounded-md text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer">
                        <Icon name="edit" className="text-[14px]" /> Edit
                      </button>
                      <button 
                        onClick={async () => {
                          if(confirm("Delete this prompt?")) {
                            await deletePersonalPrompt(p.id);
                            loadData();
                          }
                        }} 
                        className="px-2.5 py-1 rounded-md text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 flex items-center gap-1 transition-colors cursor-pointer">
                        <Icon name="delete" className="text-[14px]" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <AddPromptModal 
          editData={editData} 
          categories={categories}
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { setIsModalOpen(false); loadData(); setToast({type:'success', message: editData ? 'Updated!' : 'Saved!'}); }} 
        />
      )}
    </div>
  );
}

function PromptItemViewer({ 
  pt, 
  index, 
  onCopy 
}: { 
  pt: { label?: string; text: string }; 
  index: number; 
  onCopy: (text: string) => void;
}) {
  const variables = useMemo(() => {
    const matches = Array.from((pt.text || "").matchAll(/\{\{\s*([^}]+?)\s*\}\}/g), m => m[1].trim());
    return [...new Set(matches.filter(Boolean))];
  }, [pt.text]);

  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const filledText = useMemo(() => {
    return (pt.text || "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (original, key: string) => {
      const trimmed = key.trim();
      return varValues[trimmed] && varValues[trimmed].trim() !== "" ? varValues[trimmed].trim() : original;
    });
  }, [pt.text, varValues]);

  const handleCopyClick = () => {
    onCopy(filledText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChatGPT = () => {
    onCopy(filledText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open("https://chatgpt.com", "_blank");
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(filledText)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-3 transition-all hover:border-gray-300 space-y-2.5">
      {/* Header with Title and Action buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-[11px] font-bold text-gray-700 tracking-wider uppercase flex items-center gap-1.5">
          <Icon name="description" className="text-[14px] text-gray-500" />
          {pt.label || `Prompt Text ${index + 1}`}
        </h4>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Copy Button with micro-interaction */}
          <button 
            type="button"
            onClick={handleCopyClick} 
            title="Copy filled prompt"
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
              copied 
                ? "bg-emerald-50 border-emerald-300 text-emerald-700" 
                : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            <Icon name={copied ? "check" : "content_copy"} className={`text-[13px] ${copied ? "text-emerald-600" : "text-gray-500"}`} />
            {copied ? "Copied!" : "Copy"}
          </button>

          {/* Launch ChatGPT Button */}
          <button 
            type="button"
            onClick={handleOpenChatGPT} 
            title="Copy & Open in ChatGPT"
            className="px-2.5 py-1 rounded-md border border-gray-200 bg-white hover:bg-emerald-50/60 hover:border-emerald-300 text-gray-700 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
          >
            <Icon name="smart_toy" className="text-[14px] text-emerald-600" />
            ChatGPT
          </button>

          {/* Share via WhatsApp */}
          <button 
            type="button"
            onClick={handleShareWhatsApp} 
            title="Share via WhatsApp"
            className="px-2.5 py-1 rounded-md border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
          >
            <Icon name="chat" className="text-[13px]" />
            Share
          </button>
        </div>
      </div>

      {/* Template Variables Section if any */}
      {variables.length > 0 && (
        <div className="rounded-lg border border-blue-200/70 bg-blue-50/50 p-2.5 space-y-2">
          <div className="text-[10px] font-bold text-blue-900 tracking-wider uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Icon name="tune" className="text-[13px] text-blue-600" />
              Template Variables
            </span>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setVarValues({})}
                title="Clear all variable inputs"
                className="text-[10px] text-blue-700 hover:text-red-600 font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                <Icon name="restart_alt" className="text-[13px]" />
                Reset
              </button>
              <span className="text-[10px] font-normal text-blue-500 hidden sm:inline">
                (Type values to fill live)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {variables.map(v => (
              <div key={v}>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5 truncate" title={v}>
                  {v}
                </label>
                <input 
                  type="text" 
                  value={varValues[v] || ""} 
                  onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                  placeholder={`Enter ${v}...`} 
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rendered prompt preview text */}
      <div className="rounded-md border border-gray-200/80 bg-white p-2.5 shadow-2xs">
        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed select-all font-normal">
          {filledText}
        </p>
      </div>
    </div>
  );
}

function AddPromptModal({ 
  editData, 
  categories = [], 
  onClose, 
  onSave 
}: { 
  editData: any; 
  categories: string[]; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const [form, setForm] = useState({ 
    category: editData?.category || "Tricky", 
    title: editData?.title || "", 
    tags: editData?.tags || "", 
    is_favorite: editData?.is_favorite || false 
  });
  const [promptsData, setPromptsData] = useState<any[]>(editData?.prompts_data || [{ label: "", text: "" }]);
  const [saving, setSaving] = useState(false);

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const dataToSave = { ...form, prompts_data: promptsData.filter(p => p.text.trim() !== "") };

    let res;
    if (editData?.id) {
      res = await updatePersonalPrompt(editData.id, dataToSave);
    } else {
      res = await addPersonalPrompt(dataToSave);
    }
    
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  const addPromptText = () => {
    setPromptsData([...promptsData, { label: "", text: "" }]);
  };

  const updatePromptText = (index: number, field: string, value: string) => {
    const newData = [...promptsData];
    newData[index][field] = value;
    setPromptsData(newData);
  };

  const removePromptText = (index: number) => {
    if (promptsData.length > 1) {
      setPromptsData(promptsData.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="auto_awesome" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">{editData ? "Edit Prompt" : "Add Prompt"}</h2>
              <p className="text-xs text-gray-500">Same topic ke liye multiple prompts save karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="prompt-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="relative" ref={categoryDropdownRef}>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">Category</label>
                {/* Quick Select Category Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categories.slice(0, 5).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, category: c }));
                        setShowCategoryDropdown(false);
                      }}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                        form.category.trim().toLowerCase() === c.toLowerCase() 
                          ? "bg-primary text-white shadow-sm" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input 
                  required 
                  type="text" 
                  value={form.category} 
                  onFocus={() => setShowCategoryDropdown(true)}
                  onChange={e => {
                    setForm(f => ({ ...f, category: e.target.value }));
                    setShowCategoryDropdown(true);
                  }} 
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 pr-10 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" 
                  placeholder="Select or type new category..." 
                />
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(v => !v)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700 p-0.5"
                >
                  <Icon name={showCategoryDropdown ? "expand_less" : "expand_more"} className="text-[20px]" />
                </button>
              </div>

              {showCategoryDropdown && categories.length > 0 && (
                <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl py-1">
                  {categories
                    .filter(c => !form.category || c.toLowerCase().includes(form.category.toLowerCase()))
                    .map(c => (
                      <div 
                        key={c}
                        onClick={() => {
                          setForm(f => ({ ...f, category: c }));
                          setShowCategoryDropdown(false);
                        }}
                        className="cursor-pointer px-3.5 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-primary transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium">{c}</span>
                        {form.category.trim().toLowerCase() === c.toLowerCase() && (
                          <Icon name="check" className="text-primary text-[16px]" />
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Topic / Title</label>
              <input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" placeholder="Same topic par multiple prompts save kar sakte hain" />
              <p className="text-xs text-gray-500 mt-1">Ek hi topic ke neeche multiple prompts allowed hain.</p>
            </div>

            
            <label className="flex items-center gap-2 cursor-pointer w-max">
              <input type="checkbox" checked={form.is_favorite} onChange={e=>setForm({...form, is_favorite: e.target.checked})} className="rounded bg-white border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm font-bold text-gray-700">Mark as favorite</span>
            </label>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Prompt Texts</h3>
                  <p className="text-xs text-gray-500">Aik hi topic ke neeche jitne prompt texts chahen add ya edit kar sakte hain.</p>
                </div>
                <button type="button" onClick={addPromptText} className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                  <Icon name="add" className="text-[16px]" /> Add Prompt Text
                </button>
              </div>

              <div className="space-y-4">
                {promptsData.map((pt, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                    {promptsData.length > 1 && (
                      <button type="button" onClick={() => removePromptText(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 transition-colors">
                        <Icon name="close" className="text-[18px]" />
                      </button>
                    )}
                    <label className="mb-1 block text-xs font-bold text-gray-700">Prompt {index + 1} Title / Subtitle</label>
                    <input 
                      type="text" 
                      value={pt.label} 
                      onChange={e=>updatePromptText(index, "label", e.target.value)} 
                      className="mb-3 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-medium text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" 
                      placeholder={`e.g. ${index === 3 ? "Complete Advanced Web Technologies Project Portal" : "Lecture Slides / Website Copy"}`} 
                    />
                    <label className="mb-1 block text-xs font-bold text-gray-600">Prompt Instructions</label>
                    <textarea 
                      required
                      value={pt.text} 
                      onChange={e=>updatePromptText(index, "text", e.target.value)} 
                      rows={4} 
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 mb-3 resize-none" 
                      placeholder="Write the full prompt here. Example: Write feedback for {{student_name}} on {{assignment_name}}."
                    ></textarea>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="prompt-form" disabled={saving} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 flex items-center gap-2">
            <Icon name="save" className="text-[18px]" /> {saving ? "Saving..." : "Save Prompt"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 flex items-center gap-2">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
