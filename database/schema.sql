-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Analysis Records Table
CREATE TABLE public.analysis_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    image_filename TEXT NOT NULL,
    prediction TEXT,
    confidence NUMERIC,
    glioma_probability NUMERIC,
    meningioma_probability NUMERIC,
    pituitary_probability NUMERIC,
    none_probability NUMERIC,
    model_name TEXT,
    model_version TEXT,
    preprocessing_version TEXT,
    analysis_status TEXT DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Reports Table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES public.analysis_records(id) ON DELETE CASCADE,
    report_path TEXT NOT NULL,
    report_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Setup Row Level Security (RLS)

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Analysis Records
ALTER TABLE public.analysis_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analysis" ON public.analysis_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analysis" ON public.analysis_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analysis" ON public.analysis_records FOR DELETE USING (auth.uid() = user_id);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: Run the following in Supabase SQL Editor to create buckets
-- INSERT INTO storage.buckets (id, name, public) VALUES ('brain-scans', 'brain-scans', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

-- Storage RLS Policies
-- Users can only upload and view their own images
-- CREATE POLICY "User can upload their own scans" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brain-scans' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "User can view their own scans" ON storage.objects FOR SELECT USING (bucket_id = 'brain-scans' AND auth.uid()::text = (storage.foldername(name))[1]);
