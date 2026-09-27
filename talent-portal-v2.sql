-- Run this in your Supabase SQL Editor

CREATE TABLE public.talent_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid REFERENCES public.talent_services(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_whatsapp text NOT NULL,
  project_details text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.talent_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clients can insert requests." ON public.talent_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can view requests." ON public.talent_requests FOR SELECT USING (true);
CREATE POLICY "Admin can update requests." ON public.talent_requests FOR UPDATE USING (true);
CREATE POLICY "Admin can delete requests." ON public.talent_requests FOR DELETE USING (true);
