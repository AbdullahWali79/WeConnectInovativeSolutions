/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectFile = {
  id: string;
  name: string;
  size: number; // in bytes
  type?: string;
  content: string; // full text content
  uploaded_at: string;
};

export type ClaudeProject = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  context_knowledge: string;
  files: ProjectFile[];
  model: string;
  category: string;
  tags: string;
  project_url?: string;
  is_favorite: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at?: string;
};

const CLAUDE_CATEGORY_PREFIX = "[Claude Project]";

/**
 * Fetch all Claude projects for current user.
 * Tries `admin_claude_projects` table first; if the table has not yet
 * been migrated in Supabase, falls back to `admin_personal_prompts`.
 */
export async function fetchClaudeProjects(): Promise<{
  success: boolean;
  projects?: ClaudeProject[];
  error?: string;
  usedFallback?: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  try {
    const { data, error } = await (supabase.from("admin_claude_projects" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }));

    if (!error && data) {
      return {
        success: true,
        projects: data.map((row: any) => ({
          id: row.id,
          name: row.name || row.title || "Untitled Project",
          description: row.description || "",
          instructions: row.instructions || "",
          context_knowledge: row.context_knowledge || "",
          files: Array.isArray(row.context_files) ? row.context_files : [],
          model: row.model || "Claude 3.7 Sonnet",
          category: row.category || "General",
          tags: row.tags || "",
          project_url: row.project_url || "",
          is_favorite: Boolean(row.is_favorite),
          is_pinned: Boolean(row.is_pinned),
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || row.created_at,
        })),
        usedFallback: false,
      };
    }

    // If table not found (code PGRST205 or 42P01), use fallback storage
    if (error && (error.code === "PGRST205" || error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
      return await fetchFromFallbackStorage(supabase, user.id);
    }

    return { success: false, error: error?.message || "Failed to load projects" };
  } catch (err: any) {
    return await fetchFromFallbackStorage(supabase, user.id, err?.message);
  }
}

async function fetchFromFallbackStorage(supabase: any, userId: string, initialError?: string) {
  try {
    const { data, error } = await (supabase.from("admin_personal_prompts" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }));

    if (error) {
      return { success: false, error: initialError || error.message };
    }

    // Filter rows categorized as Claude Projects
    const filtered = (data || []).filter((r: any) => 
      (r.category || "").startsWith(CLAUDE_CATEGORY_PREFIX) || 
      (r.tags || "").includes("claude-project")
    );

    const projects: ClaudeProject[] = filtered.map((r: any) => {
      const parsedCat = (r.category || "").replace(CLAUDE_CATEGORY_PREFIX, "").trim() || "General";
      const pData = Array.isArray(r.prompts_data) ? r.prompts_data : [];
      const instructionsItem = pData.find((p: any) => p.label === "Instructions" || p.label === "System Prompt");
      const contextItem = pData.find((p: any) => p.label === "Context" || p.label === "Knowledge");
      const filesItem = pData.find((p: any) => p.label === "Files");
      const metaItem = pData.find((p: any) => p.label === "Metadata");

      let meta: any = {};
      try {
        if (metaItem?.text) meta = JSON.parse(metaItem.text);
      } catch {}

      let files: ProjectFile[] = [];
      try {
        if (filesItem?.text) files = JSON.parse(filesItem.text);
      } catch {}

      return {
        id: r.id,
        name: r.title || "Untitled Project",
        description: meta.description || r.description || r.subtitle || "",
        instructions: instructionsItem?.text || "",
        context_knowledge: contextItem?.text || "",
        files: Array.isArray(files) ? files : [],
        model: meta.model || "Claude 3.7 Sonnet",
        category: parsedCat,
        tags: (r.tags || "").replace(/claude-project,?/g, "").trim(),
        project_url: meta.project_url || "",
        is_favorite: Boolean(r.is_favorite),
        is_pinned: Boolean(meta.is_pinned),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.created_at,
      };
    });

    return { success: true, projects, usedFallback: true };
  } catch (fallbackErr: any) {
    return { success: false, error: fallbackErr?.message || "Failed to load projects" };
  }
}

/**
 * Save or update a Claude project.
 */
export async function saveClaudeProject(project: {
  id?: string;
  name: string;
  description?: string;
  instructions?: string;
  context_knowledge?: string;
  files?: ProjectFile[];
  model?: string;
  category?: string;
  tags?: string;
  project_url?: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const payload: any = {
    name: project.name.trim(),
    description: (project.description || "").trim(),
    instructions: project.instructions || "",
    context_knowledge: project.context_knowledge || "",
    context_files: project.files || [],
    model: project.model || "Claude 3.7 Sonnet",
    category: (project.category || "General").trim(),
    tags: project.tags || "",
    project_url: (project.project_url || "").trim(),
    is_favorite: Boolean(project.is_favorite),
    is_pinned: Boolean(project.is_pinned),
    updated_at: new Date().toISOString(),
  };

  try {
    if (project.id) {
      // Update
      const { error } = await (supabase.from("admin_claude_projects" as any)
        .update(payload)
        .eq("id", project.id)
        .eq("user_id", user.id));

      if (!error) return { success: true, id: project.id };

      // If context_files column doesn't exist, try without it
      if (error.message?.includes("context_files") || error.code === "42703") {
        delete payload.context_files;
        const retry = await (supabase.from("admin_claude_projects" as any)
          .update(payload)
          .eq("id", project.id)
          .eq("user_id", user.id));
        if (!retry.error) return { success: true, id: project.id };
      }

      if (error.code === "PGRST205" || error.message?.includes("does not exist") || error.message?.includes("schema cache")) {
        return await saveToFallbackStorage(supabase, user.id, project);
      }
      return { success: false, error: error.message };
    } else {
      // Insert
      const { data, error } = await (supabase.from("admin_claude_projects" as any)
        .insert({ ...payload, user_id: user.id })
        .select("id")
        .single());

      if (!error && data) return { success: true, id: data.id };

      // If context_files column doesn't exist, try without it
      if (error?.message?.includes("context_files") || error?.code === "42703") {
        delete payload.context_files;
        const retry = await (supabase.from("admin_claude_projects" as any)
          .insert({ ...payload, user_id: user.id })
          .select("id")
          .single());
        if (!retry.error && retry.data) return { success: true, id: retry.data.id };
      }

      if (error && (error.code === "PGRST205" || error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
        return await saveToFallbackStorage(supabase, user.id, project);
      }
      return { success: false, error: error?.message || "Failed to save project" };
    }
  } catch {
    return await saveToFallbackStorage(supabase, user.id, project);
  }
}

async function saveToFallbackStorage(supabase: any, userId: string, project: any) {
  const fallbackCategory = `${CLAUDE_CATEGORY_PREFIX} ${project.category || "General"}`.trim();
  const meta = {
    description: project.description || "",
    model: project.model || "Claude 3.7 Sonnet",
    project_url: project.project_url || "",
    is_pinned: project.is_pinned || false,
  };

  const prompts_data = [
    { label: "Instructions", text: project.instructions || "" },
    { label: "Context", text: project.context_knowledge || "" },
    { label: "Files", text: JSON.stringify(project.files || []) },
    { label: "Metadata", text: JSON.stringify(meta) },
  ];

  const payload: any = {
    user_id: userId,
    title: project.name,
    category: fallbackCategory,
    tags: `${project.tags || ""}, claude-project`.trim(),
    is_favorite: Boolean(project.is_favorite),
    prompts_data,
  };

  if (project.id) {
    const { error } = await (supabase.from("admin_personal_prompts" as any)
      .update(payload)
      .eq("id", project.id)
      .eq("user_id", userId));
    return { success: !error, id: project.id, error: error?.message };
  } else {
    const { data, error } = await (supabase.from("admin_personal_prompts" as any)
      .insert(payload)
      .select("id")
      .single());
    return { success: !error, id: data?.id, error: error?.message };
  }
}

/**
 * Delete a project.
 */
export async function deleteClaudeProject(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  try {
    await (supabase.from("admin_claude_projects" as any).delete().eq("id", id).eq("user_id", user.id));
    await (supabase.from("admin_personal_prompts" as any).delete().eq("id", id).eq("user_id", user.id));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete project" };
  }
}

/**
 * Toggle favorite.
 */
export async function toggleFavoriteClaudeProject(id: string, is_favorite: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  try {
    const { error } = await (supabase.from("admin_claude_projects" as any)
      .update({ is_favorite })
      .eq("id", id)
      .eq("user_id", user.id));

    if (!error) return { success: true };

    const { error: fErr } = await (supabase.from("admin_personal_prompts" as any)
      .update({ is_favorite })
      .eq("id", id)
      .eq("user_id", user.id));

    return { success: !fErr, error: fErr?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
