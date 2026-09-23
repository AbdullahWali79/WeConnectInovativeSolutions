CREATE TABLE simulation_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE simulations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES simulation_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    html_script TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE simulation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone for categories and published simulations
CREATE POLICY "Public simulation_categories are viewable by everyone." ON simulation_categories FOR SELECT USING (true);
CREATE POLICY "Public simulations are viewable by everyone." ON simulations FOR SELECT USING (is_published = true);

-- Allow full access to admins (assuming admin role or bypassing RLS for server side, but usually next.js admin uses service_role key or specific policies. For now we just add standard ones, service_role bypasses RLS anyway).
