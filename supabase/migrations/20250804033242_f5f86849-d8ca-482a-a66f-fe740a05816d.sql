-- Drop existing tables
DROP TABLE IF EXISTS public.gallery_images CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  language TEXT NOT NULL DEFAULT 'english',
  enable_doctor_reports BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_details table
CREATE TABLE public.doctor_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pulse_readings table
CREATE TABLE public.pulse_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
  signal_strength INTEGER NOT NULL CHECK (signal_strength >= 0 AND signal_strength <= 100),
  health_status TEXT NOT NULL CHECK (health_status IN ('normal', 'risk_a', 'risk_b', 'risk_c', 'emergency')),
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health_reports table
CREATE TABLE public.health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly')),
  report_date DATE NOT NULL,
  avg_bpm NUMERIC(5,2),
  min_bpm INTEGER,
  max_bpm INTEGER,
  total_readings INTEGER NOT NULL DEFAULT 0,
  emergency_count INTEGER NOT NULL DEFAULT 0,
  abnormal_readings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_type, report_date)
);

-- Create emergency_alerts table
CREATE TABLE public.emergency_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pulse_reading_id UUID NOT NULL REFERENCES public.pulse_readings(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_bpm', 'low_bpm', 'irregular', 'device_error')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for emergency_contacts
CREATE POLICY "Users can view their own emergency contacts" ON public.emergency_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency contacts" ON public.emergency_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts" ON public.emergency_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts" ON public.emergency_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for doctor_details
CREATE POLICY "Users can view their own doctor details" ON public.doctor_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own doctor details" ON public.doctor_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doctor details" ON public.doctor_details
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for pulse_readings
CREATE POLICY "Users can view their own pulse readings" ON public.pulse_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pulse readings" ON public.pulse_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for health_reports
CREATE POLICY "Users can view their own health reports" ON public.health_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health reports" ON public.health_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health reports" ON public.health_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for emergency_alerts
CREATE POLICY "Users can view their own emergency alerts" ON public.emergency_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency alerts" ON public.emergency_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency alerts" ON public.emergency_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_details_updated_at
  BEFORE UPDATE ON public.doctor_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_reports_updated_at
  BEFORE UPDATE ON public.health_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();