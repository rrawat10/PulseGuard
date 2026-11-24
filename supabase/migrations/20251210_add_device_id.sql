-- Add device_id column to ecg_readings table
ALTER TABLE public.ecg_readings 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create index for device_id lookups
CREATE INDEX IF NOT EXISTS idx_ecg_readings_device_id ON public.ecg_readings(device_id);
