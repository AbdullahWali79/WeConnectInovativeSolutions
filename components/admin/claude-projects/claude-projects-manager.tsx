/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { Icon } from "@/components/icon";
import {
  fetchClaudeProjects,
  saveClaudeProject,
  deleteClaudeProject,
  toggleFavoriteClaudeProject,
  type ClaudeProject,
} from "@/app/admin/claude-projects/actions";

const POPULAR_MODELS = [
  "Claude 3.7 Sonnet",
  "Claude 3.5 Sonnet",
  "Claude 3.5 Haiku",
  "Claude 3 Opus",
  "GPT-4o",
  "Gemini 2.5 Pro",
];

const DEFAULT_CATEGORIES = [
  "Quiz & Assessment",
  "Coding & Dev",
  "Content & Writing",
  "Education & Training",
  "Automation & Bot",
  "Research & Analysis",
  "Customer Support",
  "General",
];

const DEMO_PROJECT: Partial<ClaudeProject> = {
  name: "Github Repo Quiz Maker",
  description:
    "Jab main koi GitHub repo link ya topic paste karun, to us par exactly 5 multiple-choice quiz questions banao. Quiz bilkul pattern-free hona chahiye, taake jawab andaze se na nikal sakay.",
  instructions:
    "Jab user koi link ya topic de, to pehle us ka content parho (link ho to open karo), phir exactly 5 MCQs banao.\n\nRules:\n1. 5 multiple-choice questions (A, B, C, D options).\n2. Quiz pattern-free hona chahiye: correct option random order mein ho.\n3. Har option realistic lagna chahiye taake guesswork se solve na ho.\n4. End par answer key aur brief 1-line explanation shamil karo.",
  context_knowledge:
    "Reference Format:\nQuestion [1-5]: [Problem / Scenario based on repo or code]\nA) [Option A]\nB) [Option B]\nC) [Option C]\nD) [Option D]\n\nCorrect Answer: [Letter]\nExplanation: [Why this is correct]",
  model: "Claude 3.5 Sonnet",
  category: "Quiz & Assessment",
  tags: "github, quiz, mcqs, evaluation",
  is_favorite: true,
};

export function ClaudeProjectsManager() {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ClaudeProject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<ClaudeProject> | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedModel, setSelectedModel] = useState("All");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "favorites">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Collapsed sections map
  const [expandedCards, setExpandedCards] = useState<Record<string, { instructions?: boolean; context?: boolean }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const res = await fetchClaudeProjects();
    if (res.success && res.projects) {
      setProjects(res.projects);
    } else {
      setToast({ type: "error", message: res.error || "Failed to load Claude projects" });
    }
    setLoading(false);
  }

  const handleCopy = (text: string, label: string = "Copied to clipboard!") => {
    if (!text) {
      setToast({ type: "info", message: "Nothing to copy" });
      return;
    }
    navigator.clipboard.writeText(text);
    setToast({ type: "success", message: label });
  };

  const handleCopyBundle = (p: ClaudeProject) => {
    const bundle = `=== CLAUDE PROJECT: ${p.name} ===\n\n[DESCRIPTION]\n${p.description || "N/A"}\n\n[CUSTOM INSTRUCTIONS / SYSTEM PROMPT]\n${p.instructions || "N/A"}\n\n[PROJECT CONTEXT / KNOWLEDGE]\n${p.context_knowledge || "N/A"}\n\n[MODEL]\n${p.model || "Claude 3.5 Sonnet"}`;
    handleCopy(bundle, `Full project "${p.name}" bundle copied!`);
  };

  const handleToggleFavorite = async (p: ClaudeProject) => {
    const nextState = !p.is_favorite;
    setProjects(prev => prev.map(item => item.id === p.id ? { ...item, is_favorite: nextState } : item));
    const res = await toggleFavoriteClaudeProject(p.id, nextState);
    if (!res.success) {
      setToast({ type: "error", message: "Failed to update favorite" });
      loadProjects();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    const res = await deleteClaudeProject(id);
    if (res.success) {
      setToast({ type: "success", message: "Project deleted!" });
      loadProjects();
    } else {
      setToast({ type: "error", message: res.error || "Failed to delete" });
    }
  };

  const handleDuplicate = (p: ClaudeProject) => {
    const clone: Partial<ClaudeProject> = {
      ...p,
      id: undefined,
      name: `${p.name} (Copy)`,
    };
    setEditProject(clone);
    setIsModalOpen(true);
  };

  const handleLoadDemo = async () => {
    const res = await saveClaudeProject(DEMO_PROJECT as any);
    if (res.success) {
      setToast({ type: "success", message: "Example 'Github Repo Quiz Maker' project added!" });
      loadProjects();
    } else {
      setToast({ type: "error", message: res.error || "Failed to add demo project" });
    }
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `claude-projects-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToast({ type: "success", message: "Exported Claude projects to JSON!" });
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!Array.isArray(imported)) {
          throw new Error("File must contain an array of projects");
        }
        let count = 0;
        for (const item of imported) {
          if (item.name) {
            await saveClaudeProject({
              name: item.name,
              description: item.description,
              instructions: item.instructions,
              context_knowledge: item.context_knowledge,
              model: item.model,
              category: item.category,
              tags: item.tags,
              project_url: item.project_url,
              is_favorite: Boolean(item.is_favorite),
            });
            count++;
          }
        }
        setToast({ type: "success", message: `Imported ${count} project(s) successfully!` });
        loadProjects();
      } catch (err: any) {
        setToast({ type: "error", message: err?.message || "Invalid JSON file" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Category list
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    projects.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [projects]);

  // Models list
  const allModels = useMemo(() => {
    const set = new Set<string>(POPULAR_MODELS);
    projects.forEach(p => {
      if (p.model) set.add(p.model);
    });
    return Array.from(set);
  }, [projects]);

  // Filtering
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        if (favoriteOnly && !p.is_favorite) return false;
        if (selectedCategory !== "All" && (p.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
        if (selectedModel !== "All" && (p.model || "").toLowerCase() !== selectedModel.toLowerCase()) {
          return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const nameMatch = (p.name || "").toLowerCase().includes(q);
          const descMatch = (p.description || "").toLowerCase().includes(q);
          const instMatch = (p.instructions || "").toLowerCase().includes(q);
          const contextMatch = (p.context_knowledge || "").toLowerCase().includes(q);
          const tagsMatch = (p.tags || "").toLowerCase().includes(q);
          const catMatch = (p.category || "").toLowerCase().includes(q);
          return nameMatch || descMatch || instMatch || contextMatch || tagsMatch || catMatch;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }
        if (sortBy === "favorites") {
          return Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite)) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
  }, [projects, search, selectedCategory, selectedModel, favoriteOnly, sortBy]);

  const favoritesCount = useMemo(() => projects.filter(p => p.is_favorite).length, [projects]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <Toast toast={toast} onClear={() => setToast(null)} />

      {/* Top Banner - Claude Aesthetic */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1c1917] via-[#292524] to-[#1e1b4b] border border-amber-950/40 p-4 sm:p-5 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-900/30 shrink-0">
              <Icon name="psychology" className="text-white text-[24px]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Claude Projects Manager
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AI Workspace Hub
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                Save, name, and categorize your Claude.ai Projects with their Custom Instructions & Context Knowledge. Easily filter and copy setups directly back into Claude.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="Add example quiz maker project from Claude"
            >
              <Icon name="auto_awesome" className="text-[16px] text-amber-400" />
              <span>Load Example</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="Backup all projects to JSON"
            >
              <Icon name="download" className="text-[16px] text-blue-300" />
              <span>Export</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="Import projects from JSON file"
            >
              <Icon name="upload" className="text-[16px] text-emerald-300" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => { setEditProject(null); setIsModalOpen(true); }}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Icon name="add" className="text-[18px]" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-stone-800/80 text-xs text-stone-300">
          <div className="flex items-center gap-2 bg-stone-900/60 rounded-lg px-3 py-1.5">
            <Icon name="folder_open" className="text-amber-400 text-[18px]" />
            <span>Total Projects: <strong className="text-white">{projects.length}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-stone-900/60 rounded-lg px-3 py-1.5">
            <Icon name="star" className="text-amber-400 text-[18px]" />
            <span>Starred: <strong className="text-white">{favoritesCount}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-stone-900/60 rounded-lg px-3 py-1.5">
            <Icon name="category" className="text-amber-400 text-[18px]" />
            <span>Categories: <strong className="text-white">{allCategories.length}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-stone-900/60 rounded-lg px-3 py-1.5">
            <Icon name="filter_alt" className="text-amber-400 text-[18px]" />
            <span>Showing: <strong className="text-white">{filteredProjects.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-2.5 text-gray-400 text-[18px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name, description, instructions, context, or tags..."
              className="w-full bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-9 text-xs text-gray-900 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Category Dropdown */}
            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold text-gray-800 outline-none focus:border-amber-600 cursor-pointer"
              >
                <option value="All">All Categories ({projects.length})</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat} ({projects.filter(p => (p.category || "").toLowerCase() === cat.toLowerCase()).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Model Filter */}
            <div className="min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold text-gray-800 outline-none focus:border-amber-600 cursor-pointer"
              >
                <option value="All">All Models</option>
                {allModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-w-[130px] bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold text-gray-800 outline-none focus:border-amber-600 cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">Project Name (A–Z)</option>
              <option value="favorites">Favorites First</option>
            </select>

            {/* Favorite Star Filter Button */}
            <button
              type="button"
              onClick={() => setFavoriteOnly(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer shrink-0 ${
                favoriteOnly
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
              }`}
              title="Show only starred projects"
            >
              <Icon name={favoriteOnly ? "star" : "star_outline"} className={`text-[16px] ${favoriteOnly ? "text-white" : "text-amber-500"}`} />
              <span>Starred</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                favoriteOnly ? "bg-white/30 text-white" : "bg-amber-100 text-amber-800"
              }`}>
                {favoritesCount}
              </span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-gray-200 p-0.5 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-500 hover:text-gray-800"}`}
                title="Grid View"
              >
                <Icon name="grid_view" className="text-[17px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${viewMode === "compact" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-500 hover:text-gray-800"}`}
                title="Compact List View"
              >
                <Icon name="view_list" className="text-[17px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { setSelectedCategory("All"); setFavoriteOnly(false); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "All" && !favoriteOnly
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Projects ({projects.length})
          </button>

          <button
            type="button"
            onClick={() => setFavoriteOnly(prev => !prev)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              favoriteOnly
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            <Icon name="star" className={`text-[13px] ${favoriteOnly ? "text-white" : "text-amber-500"}`} />
            Starred ({favoritesCount})
          </button>

          {allCategories.map(cat => {
            const count = projects.filter(p => (p.category || "").toLowerCase() === cat.toLowerCase()).length;
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase() && !favoriteOnly;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setSelectedCategory(cat); setFavoriteOnly(false); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects List / Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <div className="inline-block animate-spin text-amber-600 mb-3">
            <Icon name="progress_activity" className="text-[32px]" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Loading your Claude Projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon name="psychology" className="text-[36px]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">No Claude Projects Found</h3>
            <p className="text-xs text-gray-500 mt-1">
              {search || selectedCategory !== "All" || favoriteOnly
                ? "Try clearing your filters or search term to see other projects."
                : "You have not saved any Claude projects yet. Click below to add an example project or create your own!"}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {search || selectedCategory !== "All" || favoriteOnly ? (
              <button
                type="button"
                onClick={() => { setSearch(""); setSelectedCategory("All"); setSelectedModel("All"); setFavoriteOnly(false); }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Icon name="auto_awesome" className="text-[16px]" />
                  Load &quot;Github Repo Quiz Maker&quot; Example
                </button>
                <button
                  type="button"
                  onClick={() => { setEditProject(null); setIsModalOpen(true); }}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Icon name="add" className="text-[16px]" />
                  Create First Project
                </button>
              </>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isExpandedInstructions={Boolean(expandedCards[p.id]?.instructions)}
              isExpandedContext={Boolean(expandedCards[p.id]?.context)}
              onToggleInstructions={() => setExpandedCards(prev => ({
                ...prev,
                [p.id]: { ...prev[p.id], instructions: !prev[p.id]?.instructions }
              }))}
              onToggleContext={() => setExpandedCards(prev => ({
                ...prev,
                [p.id]: { ...prev[p.id], context: !prev[p.id]?.context }
              }))}
              onCopy={handleCopy}
              onCopyBundle={() => handleCopyBundle(p)}
              onToggleFavorite={() => handleToggleFavorite(p)}
              onEdit={() => { setEditProject(p); setIsModalOpen(true); }}
              onDuplicate={() => handleDuplicate(p)}
              onDelete={() => handleDelete(p.id, p.name)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
          {filteredProjects.map((p) => (
            <CompactProjectRow
              key={p.id}
              project={p}
              onCopy={handleCopy}
              onCopyBundle={() => handleCopyBundle(p)}
              onToggleFavorite={() => handleToggleFavorite(p)}
              onEdit={() => { setEditProject(p); setIsModalOpen(true); }}
              onDuplicate={() => handleDuplicate(p)}
              onDelete={() => handleDelete(p.id, p.name)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <ProjectModal
          initialData={editProject}
          categories={allCategories}
          models={allModels}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            loadProjects();
            setToast({ type: "success", message: editProject?.id ? "Project updated!" : "Project saved successfully!" });
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// PROJECT CARD COMPONENT (Grid View)
// -------------------------------------------------------------
function ProjectCard({
  project,
  isExpandedInstructions,
  isExpandedContext,
  onToggleInstructions,
  onToggleContext,
  onCopy,
  onCopyBundle,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  project: ClaudeProject;
  isExpandedInstructions: boolean;
  isExpandedContext: boolean;
  onToggleInstructions: () => void;
  onToggleContext: () => void;
  onCopy: (text: string, msg?: string) => void;
  onCopyBundle: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const instructionLines = (project.instructions || "").split("\n").length;
  const contextLines = (project.context_knowledge || "").split("\n").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
      {/* Top Header */}
      <div className="p-4 pb-3 border-b border-gray-100 bg-gradient-to-b from-stone-50/50 to-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/80 text-amber-900 border border-amber-200">
                {project.category || "General"}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1">
                <Icon name="smart_toy" className="text-[12px] text-stone-500" />
                {project.model || "Claude 3.5 Sonnet"}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-amber-800 transition-colors" title={project.name}>
              {project.name}
            </h3>
          </div>

          {/* Star Favorite Button */}
          <button
            type="button"
            onClick={onToggleFavorite}
            className="p-1 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
            title={project.is_favorite ? "Unstar project" : "Star as favorite"}
          >
            <Icon
              name={project.is_favorite ? "star" : "star_outline"}
              className={`text-[20px] ${project.is_favorite ? "text-amber-500 fill-amber-500" : ""}`}
            />
          </button>
        </div>

        {/* Project Description / Goal */}
        {project.description && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed bg-stone-50/70 p-2 rounded-lg border border-stone-100">
            {project.description}
          </p>
        )}
      </div>

      {/* Body: Instructions & Context preview */}
      <div className="p-4 space-y-3 flex-1 text-xs">
        {/* Instructions Box */}
        <div className="rounded-xl border border-gray-200/90 bg-stone-50/40 overflow-hidden">
          <div className="px-3 py-2 bg-stone-100/70 flex items-center justify-between border-b border-gray-200/60">
            <span className="font-bold text-stone-800 flex items-center gap-1.5 text-[11px]">
              <Icon name="format_list_bulleted" className="text-[14px] text-amber-600" />
              Instructions ({instructionLines} lines)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onCopy(project.instructions, `Instructions for "${project.name}" copied!`)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy instructions to clipboard"
              >
                <Icon name="content_copy" className="text-[12px]" />
                Copy
              </button>
              <button
                type="button"
                onClick={onToggleInstructions}
                className="p-0.5 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title={isExpandedInstructions ? "Collapse" : "Expand"}
              >
                <Icon name={isExpandedInstructions ? "expand_less" : "expand_more"} className="text-[16px]" />
              </button>
            </div>
          </div>
          <div className={`p-2.5 font-mono text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap select-text overflow-y-auto ${
            isExpandedInstructions ? "max-h-60" : "max-h-20"
          }`}>
            {project.instructions ? project.instructions : <span className="text-gray-400 italic">No instructions set</span>}
          </div>
        </div>

        {/* Context / Knowledge Box */}
        <div className="rounded-xl border border-gray-200/90 bg-stone-50/40 overflow-hidden">
          <div className="px-3 py-2 bg-stone-100/70 flex items-center justify-between border-b border-gray-200/60">
            <span className="font-bold text-stone-800 flex items-center gap-1.5 text-[11px]">
              <Icon name="menu_book" className="text-[14px] text-orange-600" />
              Project Context / Knowledge ({contextLines} lines)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onCopy(project.context_knowledge, `Context for "${project.name}" copied!`)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy context knowledge to clipboard"
              >
                <Icon name="content_copy" className="text-[12px]" />
                Copy
              </button>
              <button
                type="button"
                onClick={onToggleContext}
                className="p-0.5 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title={isExpandedContext ? "Collapse" : "Expand"}
              >
                <Icon name={isExpandedContext ? "expand_less" : "expand_more"} className="text-[16px]" />
              </button>
            </div>
          </div>
          <div className={`p-2.5 font-mono text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap select-text overflow-y-auto ${
            isExpandedContext ? "max-h-60" : "max-h-16"
          }`}>
            {project.context_knowledge ? project.context_knowledge : <span className="text-gray-400 italic">No context/knowledge docs added</span>}
          </div>
        </div>

        {/* Tags */}
        {project.tags && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            <Icon name="tag" className="text-gray-400 text-[12px]" />
            {project.tags.split(",").map((t, idx) => {
              const tag = t.trim();
              if (!tag) return null;
              return (
                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCopyBundle}
            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            title="Copy entire project bundle (instructions + context) to paste into Claude"
          >
            <Icon name="bolt" className="text-[14px]" />
            <span>Copy All</span>
          </button>

          {project.project_url && (
            <a
              href={project.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Open direct link in Claude.ai"
            >
              <Icon name="open_in_new" className="text-[13px] text-amber-600" />
              <span>Claude</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Duplicate project"
          >
            <Icon name="content_copy" className="text-[15px]" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Edit project"
          >
            <Icon name="edit" className="text-[15px]" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete project"
          >
            <Icon name="delete" className="text-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// COMPACT ROW COMPONENT (List View)
// -------------------------------------------------------------
function CompactProjectRow({
  project,
  onCopy,
  onCopyBundle,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  project: ClaudeProject;
  onCopy: (text: string, msg?: string) => void;
  onCopyBundle: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3.5 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleFavorite}
          className="mt-0.5 text-gray-400 hover:text-amber-500 cursor-pointer shrink-0"
        >
          <Icon
            name={project.is_favorite ? "star" : "star_outline"}
            className={`text-[19px] ${project.is_favorite ? "text-amber-500" : ""}`}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-gray-900 truncate">{project.name}</h4>
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {project.category || "General"}
            </span>
            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
              {project.model}
            </span>
          </div>
          {project.description && (
            <p className="text-[11px] text-gray-500 truncate mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onCopy(project.instructions, "Instructions copied!")}
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
          title="Copy Instructions"
        >
          <Icon name="content_copy" className="text-[12px]" />
          Instructions
        </button>
        <button
          type="button"
          onClick={onCopyBundle}
          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
          title="Copy Complete Project Bundle"
        >
          <Icon name="bolt" className="text-[12px]" />
          Copy All
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 cursor-pointer"
          title="Duplicate"
        >
          <Icon name="content_copy" className="text-[15px]" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
          title="Edit"
        >
          <Icon name="edit" className="text-[15px]" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
          title="Delete"
        >
          <Icon name="delete" className="text-[15px]" />
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// CREATE / EDIT PROJECT MODAL
// -------------------------------------------------------------
function ProjectModal({
  initialData,
  categories,
  models,
  onClose,
  onSaved,
}: {
  initialData: Partial<ClaudeProject> | null;
  categories: string[];
  models: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState(initialData?.category || "General");
  const [customCategory, setCustomCategory] = useState("");
  const [model, setModel] = useState(initialData?.model || "Claude 3.5 Sonnet");
  const [customModel, setCustomModel] = useState("");
  const [projectUrl, setProjectUrl] = useState(initialData?.project_url || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [contextKnowledge, setContextKnowledge] = useState(initialData?.context_knowledge || "");
  const [tags, setTags] = useState(initialData?.tags || "");
  const [isFavorite, setIsFavorite] = useState(Boolean(initialData?.is_favorite));

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a Project Name.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const finalCategory = customCategory.trim() ? customCategory.trim() : category;
    const finalModel = customModel.trim() ? customModel.trim() : model;

    const res = await saveClaudeProject({
      id: initialData?.id,
      name,
      description,
      instructions,
      context_knowledge: contextKnowledge,
      model: finalModel,
      category: finalCategory,
      tags,
      project_url: projectUrl,
      is_favorite: isFavorite,
    });

    if (res.success) {
      onSaved();
    } else {
      setErrorMsg(res.error || "Failed to save project.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-stone-900 to-stone-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <Icon name="psychology" className="text-white text-[20px]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {initialData?.id ? "Edit Claude Project" : "New Claude Project"}
              </h2>
              <p className="text-[11px] text-stone-300">
                Save your project name, custom instructions, and context knowledge.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700/60 transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
              <Icon name="error" className="text-[16px] text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Github Repo Quiz Maker"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Category
              </label>
              <div className="flex gap-1.5">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== "Custom") setCustomCategory("");
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Custom">+ Add Custom Category</option>
                </select>
                {category === "Custom" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="New category..."
                    className="w-full bg-white border border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Target Model & Claude Project URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Preferred AI Model
              </label>
              <div className="flex gap-1.5">
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    if (e.target.value !== "Custom") setCustomModel("");
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600 cursor-pointer font-medium"
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="Custom">+ Other Model</option>
                </select>
                {model === "Custom" && (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. Claude 4, Grok 3"
                    className="w-full bg-white border border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Claude Project URL (Optional)
              </label>
              <input
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://claude.ai/project/..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Description / Summary */}
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Project Description / Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this project do? e.g. Jab main koi GitHub repo link ya topic paste karun, to us par exactly 5 multiple-choice quiz questions banao..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all leading-relaxed"
            />
          </div>

          {/* Custom Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Icon name="format_list_bulleted" className="text-[14px] text-amber-600" />
                Custom Instructions (System Prompt for Claude)
              </label>
              <span className="text-[10px] text-gray-400">
                {instructions.length} chars · {instructions.split("\n").filter(Boolean).length} lines
              </span>
            </div>
            <textarea
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Paste instructions given to Claude here (e.g. Jab user koi link ya topic de, to pehle us ka content parho...)"
              className="w-full font-mono bg-stone-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all leading-relaxed select-text"
            />
          </div>

          {/* Project Knowledge & Context */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Icon name="menu_book" className="text-[14px] text-orange-600" />
                Project Context / Knowledge Docs
              </label>
              <span className="text-[10px] text-gray-400">
                {contextKnowledge.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={contextKnowledge}
              onChange={(e) => setContextKnowledge(e.target.value)}
              placeholder="Paste reference documents, templates, rules, code snippets, or notes that Claude should reference in this project..."
              className="w-full font-mono bg-stone-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all leading-relaxed select-text"
            />
          </div>

          {/* Tags & Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center pt-1">
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. github, quiz, mcqs, sonnet"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                />
                <span className="font-bold text-gray-800 flex items-center gap-1">
                  <Icon name="star" className="text-[15px] text-amber-500" />
                  Mark as Starred / Favorite Project
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Icon name="progress_activity" className="text-[16px] animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon name="check" className="text-[16px]" />
                  <span>{initialData?.id ? "Update Project" : "Save Project"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
