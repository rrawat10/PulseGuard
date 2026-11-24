import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useUserProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });
};

export const useCreateUserProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profileData: any) => {
      if (!user) throw new Error('No user found');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          ...profileData
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: "Profile Created",
        description: "Your profile has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useEmergencyContacts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['emergency-contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
};

export const useCreateEmergencyContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contactData: any) => {
      if (!user) throw new Error('No user found');
      
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
          user_id: user.id,
          ...contactData
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast({
        title: "Contact Added",
        description: "Emergency contact has been added successfully."
      });
    }
  });
};

export const useDoctorDetails = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctor-details', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('doctor_details')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });
};

export const useCreateDoctorDetails = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (doctorData: any) => {
      if (!user) throw new Error('No user found');
      
      const { data, error } = await supabase
        .from('doctor_details')
        .upsert({
          user_id: user.id,
          ...doctorData
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-details'] });
      toast({
        title: "Doctor Details Saved",
        description: "Doctor details have been saved successfully."
      });
    }
  });
};

export const usePulseReadings = (limit = 100) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pulse-readings', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('pulse_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000 // Refetch every 5 seconds
  });
};

export const useHealthReports = (reportType?: 'daily' | 'weekly') => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['health-reports', user?.id, reportType],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('health_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false });
      
      if (reportType) {
        query = query.eq('report_type', reportType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
};

export const useEmergencyAlerts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['emergency-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*, pulse_readings(*)')
        .eq('user_id', user.id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 10000 // Refetch every 10 seconds for alerts
  });
};