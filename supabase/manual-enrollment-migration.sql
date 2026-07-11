-- ============================================================
-- WeConnect: Manual Enrollment Module Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Manual Enrollments Table
-- For students who studied offline/manually and are added by admin
CREATE TABLE IF NOT EXISTS public.manual_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  father_name text,
  email text,
  phone text,
  course_name text NOT NULL,
  internship_role text,
  joining_date date,
  completion_date date,
  final_score numeric DEFAULT 0,
  grade text,
  attendance_marks numeric DEFAULT 5,
  technical_marks numeric DEFAULT 20,
  total_marks numeric DEFAULT 25,
  certificate_issued boolean DEFAULT false,
  show_on_completed_page boolean DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Manual Enrollment Comments Table
-- Students can leave exactly ONE comment (enforced via UNIQUE constraint)
CREATE TABLE IF NOT EXISTS public.manual_enrollment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.manual_enrollments(id) ON DELETE CASCADE,
  commenter_email text NOT NULL,
  commenter_name text NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, commenter_email)
);

-- 3. Admin Signature Settings Table
-- Stores signature and stamp image URLs for internship letters
CREATE TABLE IF NOT EXISTS public.admin_signature_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_url text,
  stamp_url text,
  hr_signature_url text,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS manual_enrollments_created_by_idx ON public.manual_enrollments (created_by);
CREATE INDEX IF NOT EXISTS manual_enrollments_show_public_idx ON public.manual_enrollments (show_on_completed_page) WHERE show_on_completed_page = true;
CREATE INDEX IF NOT EXISTS manual_enrollment_comments_enrollment_idx ON public.manual_enrollment_comments (enrollment_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.manual_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_enrollment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_signature_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Admins can manage manual enrollments" ON public.manual_enrollments;
DROP POLICY IF EXISTS "Public can read public manual enrollments" ON public.manual_enrollments;
DROP POLICY IF EXISTS "Anyone can read comments" ON public.manual_enrollment_comments;
DROP POLICY IF EXISTS "Anyone can submit one comment" ON public.manual_enrollment_comments;
DROP POLICY IF EXISTS "Admins can manage comments" ON public.manual_enrollment_comments;
DROP POLICY IF EXISTS "Admins can manage signature settings" ON public.admin_signature_settings;
DROP POLICY IF EXISTS "Public can read signature settings" ON public.admin_signature_settings;

-- manual_enrollments policies
CREATE POLICY "Admins can manage manual enrollments" ON public.manual_enrollments
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read public manual enrollments" ON public.manual_enrollments
  FOR SELECT USING (true); -- anyone can read (for public certificate pages)

-- manual_enrollment_comments policies
CREATE POLICY "Anyone can read comments" ON public.manual_enrollment_comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit one comment" ON public.manual_enrollment_comments
  FOR INSERT WITH CHECK (true); -- uniqueness enforced by DB constraint

CREATE POLICY "Admins can manage comments" ON public.manual_enrollment_comments
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- admin_signature_settings policies
CREATE POLICY "Admins can manage signature settings" ON public.admin_signature_settings
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read signature settings" ON public.admin_signature_settings
  FOR SELECT USING (true);

-- ============================================================
-- Storage Bucket for Signatures & Stamps
-- ============================================================
-- NOTE: Run this separately in Supabase Storage settings if it fails here
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view signatures" ON storage.objects;

CREATE POLICY "Admins can upload signatures" ON storage.objects
  FOR ALL USING (bucket_id = 'signatures' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'signatures' AND public.is_admin(auth.uid()));

CREATE POLICY "Public can view signatures" ON storage.objects
  FOR SELECT USING (bucket_id = 'signatures');
