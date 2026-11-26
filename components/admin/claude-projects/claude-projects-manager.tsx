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
  type ProjectFile,
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
  files: [
    {
      id: "demo-sample-quiz-spec",
      name: "quiz-guidelines.txt",
      size: 485,
      type: "text/plain",
      content: "Guidelines for Quiz Questions:\n- Avoid repetitive 'None of the above' options.\n- Keep question stems concise and clear.\n- Ensure each question tests practical understanding.",
      uploaded_at: new Date().toISOString(),
    },
  ],
  model: "Claude 3.5 Sonnet",
  category: "Quiz & Assessment",
  tags: "github, quiz, mcqs, evaluation",
  is_favorite: true,
};

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "txt":
      return "description";
    case "md":
    case "markdown":
      return "article";
    case "json":
    case "csv":
      return "data_object";
    case "py":
    case "js":
    case "ts":
    case "tsx":
    case "html":
    case "css":
    case "sql":
      return "code";
    default:
      return "draft";
  }
}

export function ClaudeProjectsManager() {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ClaudeProject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<ClaudeProject> | null>(null);

  // File Preview Modal
  const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedModel, setSelectedModel] = useState("All");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "favorites" | "files">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Track which cards are expanded (collapsed by default for compact space-saving layout)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  // Track inner box expansions (instructions, context, files)
  const [expandedSections, setExpandedSections] = useState<Record<string, { instructions?: boolean; context?: boolean; files?: boolean }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<{ input: HTMLInputElement | null; projectId: string | null }>({ input: null, projectId: null });

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
    let filesText = "";
    if (p.files && p.files.length > 0) {
      filesText = "\n\n[ATTACHED TEXT FILES / KNOWLEDGE DOCS]\n" + p.files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join("\n\n");
    }
    const bundle = `=== CLAUDE PROJECT: ${p.name} ===\n\n[DESCRIPTION]\n${p.description || "N/A"}\n\n[CUSTOM INSTRUCTIONS / SYSTEM PROMPT]\n${p.instructions || "N/A"}\n\n[PROJECT CONTEXT / KNOWLEDGE]\n${p.context_knowledge || "N/A"}${filesText}\n\n[MODEL]\n${p.model || "Claude 3.5 Sonnet"}`;
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
      files: (p.files || []).map(f => ({ ...f, id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}` })),
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

  // Direct quick file upload to a project from its card
  const handleQuickFileUpload = async (projectId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newFiles: ProjectFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const content = await f.text();
        newFiles.push({
          id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          name: f.name,
          size: f.size,
          type: f.type || "text/plain",
          content,
          uploaded_at: new Date().toISOString(),
        });
      } catch (err: any) {
        setToast({ type: "error", message: `Failed to read file ${f.name}: ${err?.message}` });
      }
    }

    if (newFiles.length === 0) return;

    const updatedFiles = [...(project.files || []), ...newFiles];
    const res = await saveClaudeProject({
      ...project,
      files: updatedFiles,
    });

    if (res.success) {
      setToast({ type: "success", message: `Uploaded ${newFiles.length} file(s) to "${project.name}"!` });
      loadProjects();
    } else {
      setToast({ type: "error", message: res.error || "Failed to upload file(s)" });
    }
  };

  const handleDeleteFileFromProject = async (project: ClaudeProject, fileId: string) => {
    if (!confirm("Remove this file from project?")) return;
    const updatedFiles = (project.files || []).filter(f => f.id !== fileId);
    const res = await saveClaudeProject({
      ...project,
      files: updatedFiles,
    });
    if (res.success) {
      setToast({ type: "success", message: "File removed!" });
      loadProjects();
    } else {
      setToast({ type: "error", message: res.error || "Failed to remove file" });
    }
  };

  // Download a file
  const handleDownloadFile = (f: ProjectFile) => {
    const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
              files: Array.isArray(item.files) ? item.files : [],
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
          const filesMatch = (p.files || []).some(f => f.name.toLowerCase().includes(q) || f.content.toLowerCase().includes(q));
          const tagsMatch = (p.tags || "").toLowerCase().includes(q);
          const catMatch = (p.category || "").toLowerCase().includes(q);
          const modelMatch = (p.model || "").toLowerCase().includes(q);
          return nameMatch || descMatch || instMatch || contextMatch || filesMatch || tagsMatch || catMatch || modelMatch;
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
        if (sortBy === "files") {
          return (b.files?.length || 0) - (a.files?.length || 0);
        }
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
  }, [projects, search, selectedCategory, selectedModel, favoriteOnly, sortBy]);

  const favoritesCount = useMemo(() => projects.filter(p => p.is_favorite).length, [projects]);
  const totalFilesCount = useMemo(() => projects.reduce((acc, p) => acc + (p.files?.length || 0), 0), [projects]);

  // Auto-expand cards that match search query so the user can see what matched
  useEffect(() => {
    if (search.trim().length > 1) {
      const matchMap: Record<string, boolean> = {};
      filteredProjects.forEach(p => {
        matchMap[p.id] = true;
      });
      setExpandedCards(matchMap);
    }
  }, [search]);

  const areAllExpanded = filteredProjects.length > 0 && filteredProjects.every(p => Boolean(expandedCards[p.id]));

  const handleToggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedCards({});
    } else {
      const all: Record<string, boolean> = {};
      filteredProjects.forEach(p => {
        all[p.id] = true;
      });
      setExpandedCards(all);
    }
  };

  const handleToggleCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAnyFilterActive = search.trim() !== "" || selectedCategory !== "All" || selectedModel !== "All" || favoriteOnly;

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedModel("All");
    setFavoriteOnly(false);
  };

  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-3 max-w-7xl mx-auto">
      <Toast toast={toast} onClear={() => setToast(null)} />

      {/* Hidden card file input for quick direct upload */}
      <input
        type="file"
        multiple
        accept=".txt,.md,.markdown,.json,.csv,.py,.js,.ts,.tsx,.html,.css,.sql,.yaml,.yml,.xml,.log,.sh,.bat,text/*"
        ref={(el) => { cardFileInputRef.current.input = el; }}
        className="hidden"
        onChange={(e) => {
          if (cardFileInputRef.current.projectId && e.target.files) {
            handleQuickFileUpload(cardFileInputRef.current.projectId, e.target.files);
          }
          e.target.value = "";
        }}
      />

      {/* Top Banner - Compact Claude Aesthetic */}
      <div className="rounded-xl bg-gradient-to-r from-[#1c1917] via-[#292524] to-[#1e1b4b] border border-amber-950/40 p-3 sm:p-3.5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm shadow-amber-900/30 shrink-0">
              <Icon name="psychology" className="text-white text-[20px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Claude Projects Manager
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Icon name="upload_file" className="text-[11px]" />
                  Knowledge & Files Enabled
                </span>
              </div>
              {/* Inline Compact Stats */}
              <div className="flex items-center gap-2 text-[11px] text-stone-300 mt-1 flex-wrap">
                <span className="flex items-center gap-1 bg-stone-900/70 px-2 py-0.5 rounded-md border border-stone-800">
                  <Icon name="folder_open" className="text-amber-400 text-[13px]" />
                  Projects: <strong className="text-white ml-0.5">{projects.length}</strong>
                </span>
                <span className="flex items-center gap-1 bg-stone-900/70 px-2 py-0.5 rounded-md border border-stone-800">
                  <Icon name="attach_file" className="text-amber-400 text-[13px]" />
                  Files: <strong className="text-white ml-0.5">{totalFilesCount}</strong>
                </span>
                <span className="flex items-center gap-1 bg-stone-900/70 px-2 py-0.5 rounded-md border border-stone-800">
                  <Icon name="star" className="text-amber-400 text-[13px]" />
                  Starred: <strong className="text-white ml-0.5">{favoritesCount}</strong>
                </span>
                <span className="flex items-center gap-1 bg-stone-900/70 px-2 py-0.5 rounded-md border border-stone-800">
                  <Icon name="filter_alt" className="text-amber-400 text-[13px]" />
                  Showing: <strong className="text-white ml-0.5">{filteredProjects.length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="Add example quiz maker project from Claude"
            >
              <Icon name="auto_awesome" className="text-[14px] text-amber-400" />
              <span>Load Example</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="Backup all projects to JSON"
            >
              <Icon name="download" className="text-[14px] text-blue-300" />
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
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="Import projects from JSON file"
            >
              <Icon name="upload" className="text-[14px] text-emerald-300" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => { setEditProject(null); setIsModalOpen(true); }}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <Icon name="add" className="text-[16px]" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Toolbar - Compact */}
      <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-2.5 text-gray-400 text-[16px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name, instructions, context notes, text files, or tags..."
              className="w-full bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-lg py-1.5 pl-9 pr-8 text-xs text-gray-900 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <Icon name="close" className="text-[15px]" />
              </button>
            )}
          </div>

          {/* Dropdown Filters & Controls */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-amber-600 cursor-pointer"
            >
              <option value="All">All Categories ({projects.length})</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({projects.filter(p => (p.category || "").toLowerCase() === cat.toLowerCase()).length})
                </option>
              ))}
            </select>

            {/* Model Filter */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-amber-600 cursor-pointer"
            >
              <option value="All">All Models</option>
              {allModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-amber-600 cursor-pointer"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">Name (A–Z)</option>
              <option value="favorites">Favorites First</option>
              <option value="files">Most Files</option>
            </select>

            {/* Favorite Star Filter Button */}
            <button
              type="button"
              onClick={() => setFavoriteOnly(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer shrink-0 ${
                favoriteOnly
                  ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
              }`}
              title="Show only starred projects"
            >
              <Icon name={favoriteOnly ? "star" : "star_outline"} className={`text-[15px] ${favoriteOnly ? "text-white" : "text-amber-500"}`} />
              <span className="hidden sm:inline">Starred</span>
              <span className={`text-[10px] px-1 rounded-full font-bold ${
                favoriteOnly ? "bg-white/30 text-white" : "bg-amber-100 text-amber-800"
              }`}>
                {favoritesCount}
              </span>
            </button>

            {/* Expand All / Collapse All Button */}
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer shrink-0 ${
                areAllExpanded
                  ? "bg-stone-800 text-white border-stone-900 shadow-2xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-stone-100"
              }`}
              title={areAllExpanded ? "Collapse all project cards" : "Expand all project cards"}
            >
              <Icon name={areAllExpanded ? "unfold_less" : "unfold_more"} className="text-[15px]" />
              <span>{areAllExpanded ? "Collapse All" : "Expand All"}</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-500 hover:text-gray-800"}`}
                title="Grid View"
              >
                <Icon name="grid_view" className="text-[16px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "compact" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-500 hover:text-gray-800"}`}
                title="Compact List View"
              >
                <Icon name="view_list" className="text-[16px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Category Pills & Reset */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { setSelectedCategory("All"); setFavoriteOnly(false); }}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "All" && !favoriteOnly
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Projects ({projects.length})
          </button>

          <button
            type="button"
            onClick={() => setFavoriteOnly(prev => !prev)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              favoriteOnly
                ? "bg-amber-500 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            <Icon name="star" className={`text-[12px] ${favoriteOnly ? "text-white" : "text-amber-500"}`} />
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
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2.5 py-0.5 rounded-full text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0 ml-auto"
              title="Reset all search & filters"
            >
              <Icon name="close" className="text-[12px]" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects List / Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-2xs">
          <div className="inline-block animate-spin text-amber-600 mb-3">
            <Icon name="progress_activity" className="text-[32px]" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Loading your Claude Projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon name="psychology" className="text-[36px]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">No Claude Projects Found</h3>
            <p className="text-xs text-gray-500 mt-1">
              {search || selectedCategory !== "All" || favoriteOnly
                ? "Try clearing your filters or search term to see other projects."
                : "You have not saved any Claude projects yet. Click below to add an example project with text files or create your own!"}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {search || selectedCategory !== "All" || favoriteOnly ? (
              <button
                type="button"
                onClick={handleClearFilters}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isExpanded={Boolean(expandedCards[p.id])}
              onToggleExpand={() => handleToggleCard(p.id)}
              isExpandedInstructions={Boolean(expandedSections[p.id]?.instructions)}
              isExpandedContext={Boolean(expandedSections[p.id]?.context)}
              isExpandedFiles={Boolean(expandedSections[p.id]?.files)}
              onToggleInstructions={() => setExpandedSections(prev => ({
                ...prev,
                [p.id]: { ...prev[p.id], instructions: !prev[p.id]?.instructions }
              }))}
              onToggleContext={() => setExpandedSections(prev => ({
                ...prev,
                [p.id]: { ...prev[p.id], context: !prev[p.id]?.context }
              }))}
              onToggleFiles={() => setExpandedSections(prev => ({
                ...prev,
                [p.id]: { ...prev[p.id], files: !prev[p.id]?.files }
              }))}
              onCopy={handleCopy}
              onCopyBundle={() => handleCopyBundle(p)}
              onToggleFavorite={() => handleToggleFavorite(p)}
              onEdit={() => { setEditProject(p); setIsModalOpen(true); }}
              onDuplicate={() => handleDuplicate(p)}
              onDelete={() => handleDelete(p.id, p.name)}
              onViewFile={(file) => setViewingFile(file)}
              onDownloadFile={handleDownloadFile}
              onDeleteFile={(fileId) => handleDeleteFileFromProject(p, fileId)}
              onTriggerUpload={() => {
                cardFileInputRef.current.projectId = p.id;
                cardFileInputRef.current.input?.click();
              }}
              onTagClick={(tag) => setSearch(tag)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-2xs overflow-hidden">
          {filteredProjects.map((p) => (
            <CompactProjectRow
              key={p.id}
              project={p}
              isExpanded={Boolean(expandedCards[p.id])}
              onToggleExpand={() => handleToggleCard(p.id)}
              onCopy={handleCopy}
              onCopyBundle={() => handleCopyBundle(p)}
              onToggleFavorite={() => handleToggleFavorite(p)}
              onEdit={() => { setEditProject(p); setIsModalOpen(true); }}
              onDuplicate={() => handleDuplicate(p)}
              onDelete={() => handleDelete(p.id, p.name)}
              onViewFile={(file) => setViewingFile(file)}
              onDownloadFile={handleDownloadFile}
              onDeleteFile={(fileId) => handleDeleteFileFromProject(p, fileId)}
              onTriggerUpload={() => {
                cardFileInputRef.current.projectId = p.id;
                cardFileInputRef.current.input?.click();
              }}
              onTagClick={(tag) => setSearch(tag)}
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
          onViewFile={(file) => setViewingFile(file)}
        />
      )}

      {/* File Preview Modal */}
      {viewingFile && (
        <FilePreviewModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onCopy={handleCopy}
          onDownload={handleDownloadFile}
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
  isExpanded,
  onToggleExpand,
  isExpandedInstructions,
  isExpandedContext,
  isExpandedFiles,
  onToggleInstructions,
  onToggleContext,
  onToggleFiles,
  onCopy,
  onCopyBundle,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onViewFile,
  onDownloadFile,
  onDeleteFile,
  onTriggerUpload,
  onTagClick,
}: {
  project: ClaudeProject;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isExpandedInstructions: boolean;
  isExpandedContext: boolean;
  isExpandedFiles: boolean;
  onToggleInstructions: () => void;
  onToggleContext: () => void;
  onToggleFiles: () => void;
  onCopy: (text: string, msg?: string) => void;
  onCopyBundle: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewFile: (file: ProjectFile) => void;
  onDownloadFile: (file: ProjectFile) => void;
  onDeleteFile: (fileId: string) => void;
  onTriggerUpload: () => void;
  onTagClick?: (tag: string) => void;
}) {
  const instructionLines = (project.instructions || "").split("\n").length;
  const contextLines = (project.context_knowledge || "").split("\n").length;
  const filesCount = project.files?.length || 0;

  return (
    <div className={`bg-white rounded-xl border transition-all flex flex-col overflow-hidden group shadow-2xs hover:shadow-xs ${
      isExpanded ? "border-amber-400 ring-1 ring-amber-400/40" : "border-gray-200 hover:border-amber-300"
    }`}>
      {/* Top Header & Collapsed Summary */}
      <div className="p-3 bg-gradient-to-b from-stone-50/70 to-white flex flex-col gap-1.5">
        {/* Category, Model & Card Quick Actions */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/90 text-amber-900 border border-amber-200">
              {project.category || "General"}
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1">
              <Icon name="smart_toy" className="text-[12px] text-stone-500" />
              {project.model || "Claude 3.5 Sonnet"}
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Star Favorite Button */}
            <button
              type="button"
              onClick={onToggleFavorite}
              className="p-1 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
              title={project.is_favorite ? "Unstar project" : "Star as favorite"}
            >
              <Icon
                name={project.is_favorite ? "star" : "star_outline"}
                className={`text-[18px] ${project.is_favorite ? "text-amber-500 fill-amber-500" : ""}`}
              />
            </button>

            {/* Quick Copy Bundle */}
            <button
              type="button"
              onClick={onCopyBundle}
              className="p-1 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
              title="Copy complete bundle to paste into Claude"
            >
              <Icon name="bolt" className="text-[16px]" />
            </button>

            {/* Quick Edit */}
            <button
              type="button"
              onClick={onEdit}
              className="p-1 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit project"
            >
              <Icon name="edit" className="text-[14px]" />
            </button>

            {/* Quick Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete project"
            >
              <Icon name="delete" className="text-[14px]" />
            </button>
          </div>
        </div>

        {/* Project Title & Click-to-Expand trigger */}
        <div
          onClick={onToggleExpand}
          className="cursor-pointer select-none group/title pt-0.5"
          title={isExpanded ? "Click to collapse" : "Click to expand details"}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover/title:text-amber-800 transition-colors">
              {project.name}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-md border transition-all shrink-0 cursor-pointer ${
                isExpanded
                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                  : "bg-white text-stone-700 border-stone-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
              }`}
            >
              <Icon name={isExpanded ? "expand_less" : "expand_more"} className="text-[14px]" />
              <span>{isExpanded ? "Collapse" : "Expand"}</span>
            </button>
          </div>

          {project.description && (
            <p className={`text-[11px] text-gray-500 mt-0.5 leading-relaxed ${
              isExpanded ? "bg-stone-50 p-2 rounded-lg border border-stone-100" : "line-clamp-1"
            }`}>
              {project.description}
            </p>
          )}
        </div>

        {/* Quick Stats Summary Chips & Clickable Tags */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-gray-100 text-[10px] text-gray-500 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onCopy(project.instructions, `Instructions for "${project.name}" copied!`)}
              className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded text-stone-700 font-medium cursor-pointer transition-colors"
              title="Click to copy instructions"
            >
              <Icon name="format_list_bulleted" className="text-[11px] text-amber-600" />
              <span>{instructionLines} lines</span>
              <Icon name="content_copy" className="text-[10px] text-stone-400" />
            </button>

            {contextLines > 0 && project.context_knowledge && (
              <button
                type="button"
                onClick={() => onCopy(project.context_knowledge, `Context for "${project.name}" copied!`)}
                className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded text-stone-700 font-medium cursor-pointer transition-colors"
                title="Click to copy context knowledge"
              >
                <Icon name="menu_book" className="text-[11px] text-orange-600" />
                <span>{contextLines} lines ctx</span>
                <Icon name="content_copy" className="text-[10px] text-stone-400" />
              </button>
            )}

            <button
              type="button"
              onClick={onTriggerUpload}
              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-medium cursor-pointer transition-colors border border-amber-200/50"
              title="Attach text file"
            >
              <Icon name="attach_file" className="text-[11px] text-amber-700" />
              <span>{filesCount} {filesCount === 1 ? "file" : "files"}</span>
            </button>
          </div>

          {project.tags && (
            <div className="flex items-center gap-1">
              {project.tags.split(",").slice(0, 3).map((t, idx) => {
                const tag = t.trim();
                if (!tag) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onTagClick?.(tag)}
                    className="px-1.5 py-0.2 bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-800 rounded text-[9px] font-medium cursor-pointer transition-colors"
                    title={`Filter by tag #${tag}`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Body: Instructions, Context & Files (Visible ONLY when isExpanded is true!) */}
      {isExpanded && (
        <div className="p-3 space-y-2.5 text-xs border-t border-gray-100 bg-stone-50/20 animate-in fade-in duration-150 flex-1">
          {/* Instructions Box */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-2.5 py-1.5 bg-stone-100/70 flex items-center justify-between border-b border-gray-200/60">
              <span className="font-bold text-stone-800 flex items-center gap-1.5 text-[11px]">
                <Icon name="format_list_bulleted" className="text-[13px] text-amber-600" />
                Instructions ({instructionLines} lines)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onCopy(project.instructions, `Instructions for "${project.name}" copied!`)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy instructions to clipboard"
                >
                  <Icon name="content_copy" className="text-[11px]" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={onToggleInstructions}
                  className="p-0.5 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  title={isExpandedInstructions ? "Collapse text" : "Expand text"}
                >
                  <Icon name={isExpandedInstructions ? "expand_less" : "expand_more"} className="text-[15px]" />
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
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-2.5 py-1.5 bg-stone-100/70 flex items-center justify-between border-b border-gray-200/60">
              <span className="font-bold text-stone-800 flex items-center gap-1.5 text-[11px]">
                <Icon name="menu_book" className="text-[13px] text-orange-600" />
                Context Notes ({contextLines} lines)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onCopy(project.context_knowledge, `Context for "${project.name}" copied!`)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy context knowledge to clipboard"
                >
                  <Icon name="content_copy" className="text-[11px]" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={onToggleContext}
                  className="p-0.5 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  title={isExpandedContext ? "Collapse text" : "Expand text"}
                >
                  <Icon name={isExpandedContext ? "expand_less" : "expand_more"} className="text-[15px]" />
                </button>
              </div>
            </div>
            <div className={`p-2.5 font-mono text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap select-text overflow-y-auto ${
              isExpandedContext ? "max-h-60" : "max-h-16"
            }`}>
              {project.context_knowledge ? project.context_knowledge : <span className="text-gray-400 italic">No context/knowledge notes</span>}
            </div>
          </div>

          {/* Attached Text Files Section */}
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/20 overflow-hidden">
            <div className="px-2.5 py-1.5 bg-amber-100/60 flex items-center justify-between border-b border-amber-200/60">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
                <Icon name="attach_file" className="text-[14px] text-amber-700" />
                Knowledge Files ({filesCount})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onTriggerUpload}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Upload text file directly into this project"
                >
                  <Icon name="upload" className="text-[11px] text-amber-700" />
                  + Add File
                </button>
                {filesCount > 0 && (
                  <button
                    type="button"
                    onClick={onToggleFiles}
                    className="p-0.5 rounded text-amber-800 hover:text-amber-950 transition-colors cursor-pointer"
                    title={isExpandedFiles ? "Collapse list" : "Expand list"}
                  >
                    <Icon name={isExpandedFiles ? "expand_less" : "expand_more"} className="text-[15px]" />
                  </button>
                )}
              </div>
            </div>

            <div className={`p-2 space-y-1 ${isExpandedFiles ? "max-h-60 overflow-y-auto" : "max-h-24 overflow-hidden"}`}>
              {filesCount === 0 ? (
                <p className="text-[10px] text-stone-500 italic p-1">
                  No text files attached. Click &quot;+ Add File&quot; to upload .txt, .md, code, etc.
                </p>
              ) : (
                project.files?.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-1.5 p-1.5 bg-white rounded-md border border-amber-100 text-stone-800 hover:border-amber-300 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onViewFile(file)}
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer group/file"
                      title={`Click to preview "${file.name}"`}
                    >
                      <Icon name={getFileIcon(file.name)} className="text-amber-600 text-[15px] shrink-0" />
                      <span className="font-semibold text-xs truncate group-hover/file:text-amber-700">
                        {file.name}
                      </span>
                      <span className="text-[9px] text-stone-400 shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onCopy(file.content, `Copied "${file.name}" content!`)}
                        className="p-1 rounded text-stone-500 hover:text-amber-700 hover:bg-stone-100 cursor-pointer"
                        title="Copy file text"
                      >
                        <Icon name="content_copy" className="text-[12px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadFile(file)}
                        className="p-1 rounded text-stone-500 hover:text-blue-600 hover:bg-stone-100 cursor-pointer"
                        title="Download file"
                      >
                        <Icon name="download" className="text-[12px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteFile(file.id)}
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-stone-100 cursor-pointer"
                        title="Remove file"
                      >
                        <Icon name="close" className="text-[12px]" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tags */}
          {project.tags && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              <Icon name="tag" className="text-gray-400 text-[11px]" />
              {project.tags.split(",").map((t, idx) => {
                const tag = t.trim();
                if (!tag) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onTagClick?.(tag)}
                    className="px-1.5 py-0.5 bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 rounded text-[10px] cursor-pointer transition-colors"
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Card Action Footer */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCopyBundle}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Copy entire project bundle"
              >
                <Icon name="bolt" className="text-[13px]" />
                <span>Copy All</span>
              </button>

              {project.project_url && (
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Open direct link in Claude.ai"
                >
                  <Icon name="open_in_new" className="text-[12px] text-amber-600" />
                  <span>Claude</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDuplicate}
                className="p-1 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Duplicate project"
              >
                <Icon name="content_copy" className="text-[14px]" />
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Edit project"
              >
                <Icon name="edit" className="text-[14px]" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete project"
              >
                <Icon name="delete" className="text-[14px]" />
              </button>
              <button
                type="button"
                onClick={onToggleExpand}
                className="px-2 py-0.5 rounded text-[10px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer ml-1"
                title="Collapse card"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// COMPACT ROW COMPONENT (List View with Expandable Drawer)
// -------------------------------------------------------------
function CompactProjectRow({
  project,
  isExpanded,
  onToggleExpand,
  onCopy,
  onCopyBundle,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onViewFile,
  onDownloadFile,
  onDeleteFile,
  onTriggerUpload,
  onTagClick,
}: {
  project: ClaudeProject;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopy: (text: string, msg?: string) => void;
  onCopyBundle: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewFile: (file: ProjectFile) => void;
  onDownloadFile: (file: ProjectFile) => void;
  onDeleteFile: (fileId: string) => void;
  onTriggerUpload: () => void;
  onTagClick?: (tag: string) => void;
}) {
  const filesCount = project.files?.length || 0;
  const instructionLines = (project.instructions || "").split("\n").length;
  const contextLines = (project.context_knowledge || "").split("\n").length;

  return (
    <div className={`transition-colors ${isExpanded ? "bg-amber-50/20" : "hover:bg-stone-50/80"}`}>
      <div className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Expand Chevron Toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
              isExpanded ? "bg-amber-200/80 text-amber-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
            title={isExpanded ? "Collapse row" : "Expand details"}
          >
            <Icon name={isExpanded ? "expand_less" : "expand_more"} className="text-[18px]" />
          </button>

          {/* Star Button */}
          <button
            type="button"
            onClick={onToggleFavorite}
            className="mt-0.5 text-gray-400 hover:text-amber-500 cursor-pointer shrink-0"
            title={project.is_favorite ? "Unstar" : "Star"}
          >
            <Icon
              name={project.is_favorite ? "star" : "star_outline"}
              className={`text-[18px] ${project.is_favorite ? "text-amber-500 fill-amber-500" : ""}`}
            />
          </button>

          <div className="min-w-0 flex-1" onClick={onToggleExpand}>
            <div className="flex items-center gap-1.5 flex-wrap cursor-pointer">
              <h4 className="text-xs font-bold text-gray-900 hover:text-amber-800 transition-colors truncate">
                {project.name}
              </h4>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                {project.category || "General"}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                {project.model}
              </span>
              {filesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-100 text-orange-800 flex items-center gap-0.5">
                  <Icon name="attach_file" className="text-[11px]" />
                  {filesCount}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            title="Upload Text File"
          >
            <Icon name="upload" className="text-[11px]" />
            + File
          </button>
          <button
            type="button"
            onClick={() => onCopy(project.instructions, "Instructions copied!")}
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            title="Copy Instructions"
          >
            <Icon name="content_copy" className="text-[11px]" />
            Instructions
          </button>
          <button
            type="button"
            onClick={onCopyBundle}
            className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Copy Complete Project Bundle"
          >
            <Icon name="bolt" className="text-[11px]" />
            Copy All
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 rounded text-gray-500 hover:bg-gray-100 cursor-pointer"
            title="Duplicate"
          >
            <Icon name="content_copy" className="text-[14px]" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
            title="Edit"
          >
            <Icon name="edit" className="text-[14px]" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
            title="Delete"
          >
            <Icon name="delete" className="text-[14px]" />
          </button>
        </div>
      </div>

      {/* Expandable Drawer in List View */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 bg-stone-50/50 space-y-2 animate-in fade-in duration-150 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Instructions */}
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-100">
                <span className="font-bold text-gray-800 text-[11px] flex items-center gap-1">
                  <Icon name="format_list_bulleted" className="text-amber-600 text-[12px]" />
                  Instructions ({instructionLines} lines)
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(project.instructions, "Copied instructions!")}
                  className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                >
                  <Icon name="content_copy" className="text-[10px]" />
                  Copy
                </button>
              </div>
              <div className="font-mono text-[11px] text-gray-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                {project.instructions || <span className="text-gray-400 italic">No instructions set</span>}
              </div>
            </div>

            {/* Context Knowledge */}
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-100">
                <span className="font-bold text-gray-800 text-[11px] flex items-center gap-1">
                  <Icon name="menu_book" className="text-orange-600 text-[12px]" />
                  Context Notes ({contextLines} lines)
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(project.context_knowledge, "Copied context!")}
                  className="text-[10px] text-orange-700 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                >
                  <Icon name="content_copy" className="text-[10px]" />
                  Copy
                </button>
              </div>
              <div className="font-mono text-[11px] text-gray-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                {project.context_knowledge || <span className="text-gray-400 italic">No context notes</span>}
              </div>
            </div>
          </div>

          {/* Attached Files List (if any) */}
          {filesCount > 0 && (
            <div className="bg-white p-2.5 rounded-lg border border-amber-200/80">
              <div className="font-bold text-amber-950 text-[11px] mb-1.5 flex items-center gap-1">
                <Icon name="attach_file" className="text-amber-700 text-[13px]" />
                Attached Files ({filesCount})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.files?.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1 bg-amber-50/70 border border-amber-200 px-2 py-1 rounded text-[11px] text-stone-800"
                  >
                    <Icon name={getFileIcon(file.name)} className="text-amber-700 text-[13px]" />
                    <button
                      type="button"
                      onClick={() => onViewFile(file)}
                      className="font-semibold hover:underline cursor-pointer truncate max-w-[150px]"
                      title="Preview file"
                    >
                      {file.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopy(file.content, `Copied "${file.name}"!`)}
                      className="text-stone-500 hover:text-amber-700 ml-1 cursor-pointer"
                      title="Copy content"
                    >
                      <Icon name="content_copy" className="text-[11px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadFile(file)}
                      className="text-stone-500 hover:text-blue-600 cursor-pointer"
                      title="Download"
                    >
                      <Icon name="download" className="text-[11px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file.id)}
                      className="text-stone-400 hover:text-red-600 cursor-pointer"
                      title="Delete file"
                    >
                      <Icon name="close" className="text-[11px]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags in drawer */}
          {project.tags && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              <span className="text-[10px] text-gray-400">Tags:</span>
              {project.tags.split(",").map((t, idx) => {
                const tag = t.trim();
                if (!tag) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onTagClick?.(tag)}
                    className="px-1.5 py-0.2 bg-gray-200/80 hover:bg-amber-100 text-gray-700 hover:text-amber-900 rounded text-[10px] cursor-pointer"
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// CREATE / EDIT PROJECT MODAL (With Drag & Drop File Upload)
// -------------------------------------------------------------
function ProjectModal({
  initialData,
  categories,
  models,
  onClose,
  onSaved,
  onViewFile,
}: {
  initialData: Partial<ClaudeProject> | null;
  categories: string[];
  models: string[];
  onClose: () => void;
  onSaved: () => void;
  onViewFile: (file: ProjectFile) => void;
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

  // Attached files list
  const [files, setFiles] = useState<ProjectFile[]>(initialData?.files || []);
  const [isDragging, setIsDragging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Process uploaded files
  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: ProjectFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      try {
        const text = await f.text();
        added.push({
          id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          name: f.name,
          size: f.size,
          type: f.type || "text/plain",
          content: text,
          uploaded_at: new Date().toISOString(),
        });
      } catch (err: any) {
        setErrorMsg(`Could not read file ${f.name}: ${err?.message}`);
      }
    }

    if (added.length > 0) {
      setFiles(prev => [...prev, ...added]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

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
      files,
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
                Save your project name, custom instructions, and text files / knowledge context.
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
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Paste instructions given to Claude here (e.g. Jab user koi link ya topic de, to pehle us ka content parho...)"
              className="w-full font-mono bg-stone-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all leading-relaxed select-text"
            />
          </div>

          {/* Project Knowledge & Context Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Icon name="menu_book" className="text-[14px] text-orange-600" />
                Project Context / Knowledge Notes
              </label>
              <span className="text-[10px] text-gray-400">
                {contextKnowledge.length} chars
              </span>
            </div>
            <textarea
              rows={3}
              value={contextKnowledge}
              onChange={(e) => setContextKnowledge(e.target.value)}
              placeholder="Paste reference text, templates, guidelines, or quick notes here..."
              className="w-full font-mono bg-stone-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-amber-600 focus:bg-white transition-all leading-relaxed select-text"
            />
          </div>

          {/* Upload Text Files (Claude Context Knowledge Files) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Icon name="attach_file" className="text-[15px] text-amber-700" />
                Attach Text Files / Documents ({files.length})
              </label>
              <span className="text-[10px] text-gray-500">
                Supports .txt, .md, .csv, .json, .py, .js, .html, and all text files
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                isDragging
                  ? "border-amber-600 bg-amber-50"
                  : "border-gray-300 hover:border-amber-400 bg-stone-50/50"
              }`}
            >
              <input
                type="file"
                multiple
                accept=".txt,.md,.markdown,.json,.csv,.py,.js,.ts,.tsx,.html,.css,.sql,.yaml,.yml,.xml,.log,.sh,.bat,text/*"
                ref={modalFileInputRef}
                onChange={(e) => {
                  processFiles(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Icon name="cloud_upload" className="text-[28px] text-amber-600" />
                <p className="text-xs font-bold text-stone-800">
                  Drag and drop text files here, or{" "}
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="text-amber-700 hover:text-amber-800 underline font-extrabold cursor-pointer"
                  >
                    browse from computer
                  </button>
                </p>
                <p className="text-[10px] text-stone-500">
                  Files are stored directly in your Claude Project knowledge base for instant reference & copying.
                </p>
              </div>
            </div>

            {/* Attached Files List */}
            {files.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-2 p-2 bg-stone-100 rounded-xl border border-stone-200"
                  >
                    <button
                      type="button"
                      onClick={() => onViewFile(file)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group/item"
                      title="Preview file"
                    >
                      <Icon name={getFileIcon(file.name)} className="text-amber-600 text-[18px] shrink-0" />
                      <span className="font-bold text-xs truncate group-hover/item:text-amber-800">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-stone-500 shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onViewFile(file)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-stone-200 text-stone-700 border border-stone-300 cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Remove file"
                      >
                        <Icon name="delete" className="text-[15px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

// -------------------------------------------------------------
// FILE PREVIEW MODAL
// -------------------------------------------------------------
function FilePreviewModal({
  file,
  onClose,
  onCopy,
  onDownload,
}: {
  file: ProjectFile;
  onClose: () => void;
  onCopy: (text: string, msg?: string) => void;
  onDownload: (file: ProjectFile) => void;
}) {
  const lineCount = file.content.split("\n").length;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-300 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name={getFileIcon(file.name)} className="text-amber-400 text-[20px] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate">{file.name}</h3>
              <p className="text-[10px] text-stone-400">
                {formatFileSize(file.size)} · {lineCount} lines · {file.type || "text/plain"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onCopy(file.content, `"${file.name}" copied!`)}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Copy text"
            >
              <Icon name="content_copy" className="text-[13px]" />
              Copy
            </button>
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Download file"
            >
              <Icon name="download" className="text-[13px]" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer ml-1"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-950 font-mono text-xs text-stone-200 leading-relaxed whitespace-pre-wrap select-text selection:bg-amber-800">
          {file.content}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <span>Click anywhere to select or copy lines.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded-lg font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
