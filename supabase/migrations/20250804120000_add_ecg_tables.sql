-- Create ECG readings table
CREATE TABLE IF NOT EXISTS public.ecg_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_data JSONB NOT NULL,
  duration_seconds INTEGER NOT NULL,
  sample_rate INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disease predictions table
CREATE TABLE IF NOT EXISTS public.disease_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ecg_reading_id UUID NOT NULL REFERENCES public.ecg_readings(id) ON DELETE CASCADE,
  prediction_result JSONB NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  predicted_conditions TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ecg_readings_user_id ON public.ecg_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_ecg_readings_created_at ON public.ecg_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disease_predictions_user_id ON public.disease_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_disease_predictions_ecg_reading_id ON public.disease_predictions(ecg_reading_id);

-- Enable RLS
ALTER TABLE public.ecg_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own ECG readings" ON public.ecg_readings;
DROP POLICY IF EXISTS "Users can create their own ECG readings" ON public.ecg_readings;
DROP POLICY IF EXISTS "Users can view their own disease predictions" ON public.disease_predictions;
DROP POLICY IF EXISTS "Users can create their own disease predictions" ON public.disease_predictions;
DROP POLICY IF EXISTS "Service role can manage all ECG readings" ON public.ecg_readings;
DROP POLICY IF EXISTS "Service role can manage all disease predictions" ON public.disease_predictions;

-- RLS policies for authenticated users
CREATE POLICY "Users can view their own ECG readings" ON public.ecg_readings
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own ECG readings" ON public.ecg_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own disease predictions" ON public.disease_predictions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own disease predictions" ON public.disease_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role policies (for device API key access)
CREATE POLICY "Service role can manage all ECG readings" ON public.ecg_readings
  FOR ALL USING (true);

CREATE POLICY "Service role can manage all disease predictions" ON public.disease_predictions
  FOR ALL USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ecg_readings_updated_at
  BEFORE UPDATE ON public.ecg_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
