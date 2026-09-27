-- Create Talent Profiles Table
CREATE TABLE talent_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    whatsapp_number TEXT,
    profile_picture_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Talent Services Table
CREATE TABLE talent_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    skills TEXT[],
    image_url TEXT,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Talent Reviews Table
CREATE TABLE talent_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES talent_services(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for talent_profiles
CREATE POLICY "Public profiles are viewable by everyone." ON talent_profiles FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can view their own talent profile." ON talent_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own talent profile." ON talent_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own talent profile." ON talent_profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for talent_services
CREATE POLICY "Public services are viewable by everyone." ON talent_services FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view their own services." ON talent_services FOR SELECT USING (auth.uid() = talent_id);
CREATE POLICY "Users can insert their own services." ON talent_services FOR INSERT WITH CHECK (auth.uid() = talent_id);
CREATE POLICY "Users can update their own services." ON talent_services FOR UPDATE USING (auth.uid() = talent_id);
CREATE POLICY "Users can delete their own services." ON talent_services FOR DELETE USING (auth.uid() = talent_id);

-- Policies for talent_reviews
CREATE POLICY "Public reviews are viewable by everyone." ON talent_reviews FOR SELECT USING (true);
CREATE POLICY "Clients can insert reviews." ON talent_reviews FOR INSERT WITH CHECK (true);
