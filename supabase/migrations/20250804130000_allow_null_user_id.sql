-- Allow NULL user_id in existing tables for device-based ECG readings
ALTER TABLE public.ecg_readings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.disease_predictions ALTER COLUMN user_id DROP NOT NULL;
