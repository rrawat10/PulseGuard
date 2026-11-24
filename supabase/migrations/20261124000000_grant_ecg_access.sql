-- RLS limits rows to each signed-in user; these grants allow the API role
-- to reach the policies for uploaded ECG readings and their predictions.
GRANT SELECT, INSERT ON public.ecg_readings TO authenticated;
GRANT SELECT, INSERT ON public.disease_predictions TO authenticated;
