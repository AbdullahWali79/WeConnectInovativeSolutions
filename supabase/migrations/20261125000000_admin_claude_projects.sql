-- ============================================================
-- Admin Claude Projects Manager
-- Store, organize, tag, and filter Claude.ai Projects, instructions,
-- knowledge context snippets, and text files for quick retrieval.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_claude_projects (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    instructions      TEXT,
    context_knowledge TEXT,
    context_files     JSONB DEFAULT '[]'::jsonb,
    model             TEXT DEFAULT 'Claude 3.7 Sonnet',
    category          TEXT DEFAULT 'General',
    tags              TEXT DEFAULT '',
    project_url       TEXT,
    is_favorite       BOOLEAN NOT NULL DEFAULT false,
    is_pinned         BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_claude_projects_user_idx ON public.admin_claude_projects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_claude_projects_category_idx ON public.admin_claude_projects(category);

ALTER TABLE public.admin_claude_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claude projects are owned by user." ON public.admin_claude_projects;
CREATE POLICY "Claude projects are owned by user." ON public.admin_claude_projects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
