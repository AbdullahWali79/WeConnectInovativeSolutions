
CREATE TABLE simulation_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_name TEXT,
    email TEXT,
    topic TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE simulation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert simulation_requests" ON simulation_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view simulation_requests" ON simulation_requests FOR SELECT USING (true);
