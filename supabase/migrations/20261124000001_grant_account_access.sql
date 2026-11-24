-- RLS policies still restrict each table to the signed-in user's rows.
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT SELECT, INSERT ON public.pulse_readings TO authenticated;
