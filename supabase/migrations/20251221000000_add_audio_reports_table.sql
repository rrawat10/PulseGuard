-- Create audio_reports table for storing generated audio reports
CREATE TABLE IF NOT EXISTS public.audio_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('english', 'hindi', 'punjabi')),
  audio_url TEXT, -- Supabase Storage URL (optional for future implementation)
  transcript TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audio_reports_user_id ON public.audio_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_reports_report_date ON public.audio_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_audio_reports_language ON public.audio_reports(language);
CREATE INDEX IF NOT EXISTS idx_audio_reports_user_date ON public.audio_reports(user_id, report_date DESC);

-- Enable RLS
ALTER TABLE public.audio_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own audio reports" ON public.audio_reports;
DROP POLICY IF EXISTS "Users can create their own audio reports" ON public.audio_reports;
DROP POLICY IF EXISTS "Users can update their own audio reports" ON public.audio_reports;
DROP POLICY IF EXISTS "Users can delete their own audio reports" ON public.audio_reports;

-- RLS policies for authenticated users
CREATE POLICY "Users can view their own audio reports" ON public.audio_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audio reports" ON public.audio_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio reports" ON public.audio_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio reports" ON public.audio_reports
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_audio_reports_updated_at
  BEFORE UPDATE ON public.audio_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.audio_reports IS 'Stores generated audio health reports for users in multiple languages';
