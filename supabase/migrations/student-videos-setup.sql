-- Create the student_videos table
CREATE TABLE public.student_videos (
    id uuid not null default gen_random_uuid (),
    student_id uuid not null,
    title text not null,
    description text null,
    video_url text not null,
    status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'revision_required')),
    admin_feedback text null,
    reviewed_at timestamp with time zone null,
    reviewed_by uuid null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint student_videos_pkey primary key (id),
    constraint student_videos_student_id_fkey foreign key (student_id) references profiles (id) on delete cascade
);

-- Enable RLS
ALTER TABLE public.student_videos ENABLE ROW LEVEL SECURITY;

-- Policies for Students (can view their own, insert their own, update their own if not approved)
CREATE POLICY "Students can view their own videos" ON public.student_videos
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own videos" ON public.student_videos
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own videos if not approved" ON public.student_videos
    FOR UPDATE USING (auth.uid() = student_id AND status != 'approved');

CREATE POLICY "Students can delete their own videos if not approved" ON public.student_videos
    FOR DELETE USING (auth.uid() = student_id AND status != 'approved');

-- Policy for Public (can view approved videos)
CREATE POLICY "Public can view approved videos" ON public.student_videos
    FOR SELECT USING (status = 'approved');

-- Policies for Admins (can do everything)
CREATE POLICY "Admins can view all student videos" ON public.student_videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'teacher')
        )
    );

CREATE POLICY "Admins can insert student videos" ON public.student_videos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'teacher')
        )
    );

CREATE POLICY "Admins can update all student videos" ON public.student_videos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'teacher')
        )
    );

CREATE POLICY "Admins can delete all student videos" ON public.student_videos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'teacher')
        )
    );
