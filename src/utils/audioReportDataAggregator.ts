import { supabase } from '@/integrations/supabase/client';

// Normal conditions classification (same as Reports page)
const NORMAL_CONDITIONS = [
  "Normal ECG",
  "Sinus rhythm",
  "Atrial rhythm",
  "Sinus tachycardia",
  "Sinus bradycardia",
  "Sinus irregularity",
  "Early repolarization",
  "Dominant rhythm present",
  "Paced rhythm",
];

const isNormalCondition = (conditions: string[]) => {
  return conditions.some(condition => 
    NORMAL_CONDITIONS.some(c => condition.toLowerCase().includes(c.toLowerCase()))
  );
};

export interface AudioReportData {
  date: string;
  patientName: string;
  
  // BPM Statistics
  avgBPM: number;
  minBPM: number;
  maxBPM: number;
  totalReadings: number;
  
  // ECG Predictions Summary
  totalPredictions: number;
  uniqueConditionsDetected: string[];
  mostFrequentCondition: {
    name: string;
    count: number;
    avgConfidence: number;
  } | null;
  
  // Severity Breakdown
  normalPredictions: number;
  abnormalPredictions: number;
  criticalConditions: Array<{
    condition: string;
    occurrences: number;
    maxConfidence: number;
  }>;
  
  // Emergency Summary
  emergencyCount: number;
  emergencyTimes: string[];
  
  // Overall Assessment
  healthStatus: 'excellent' | 'good' | 'caution' | 'concerning' | 'critical';
}

export async function generateAudioReportData(
  userId: string,
  date: string
): Promise<AudioReportData> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch user profile for patient name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single();

  // Fetch last 60 pulse readings for BPM data (same as Reports page)
  const { data: pulseReadings, error: pulseError } = await supabase
    .from('pulse_readings')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(60);

  if (pulseError) throw pulseError;

  // Fetch last 100 ECG predictions for abnormal count (same as Reports page)
  const { data: recentPredictions, error: predError } = await supabase
    .from('disease_predictions')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (predError) throw predError;

  // Fetch total predictions count for the day
  const { count: totalPredictionsCount, error: countError } = await supabase
    .from('disease_predictions')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${userId},user_id.is.null`)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString());

  if (countError) throw countError;

  // Calculate BPM statistics from last 60 readings
  const bpmValues = pulseReadings?.map(r => r.bpm) || [];
  const avgBPM = bpmValues.length > 0 
    ? Math.round(bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length)
    : 0;
  const minBPM = bpmValues.length > 0 ? Math.min(...bpmValues) : 0;
  const maxBPM = bpmValues.length > 0 ? Math.max(...bpmValues) : 0;

  // Calculate emergency statistics (from last 60 readings)
  const emergencyReadings = pulseReadings?.filter(r => r.is_emergency) || [];
  const emergencyTimes = emergencyReadings.map(r => 
    new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );

  // Process predictions using NORMAL_CONDITIONS classification (same as Reports page)
  const normalPredictions = recentPredictions?.filter(p => {
    const conditions = Array.isArray(p.predicted_conditions) 
      ? p.predicted_conditions 
      : [p.predicted_conditions];
    return isNormalCondition(conditions);
  }).length || 0;

  const abnormalPredictions = (recentPredictions?.length || 0) - normalPredictions;

  // Get unique conditions (excluding normal)
  const conditionCounts = new Map<string, { count: number; confidences: number[] }>();
  
  recentPredictions?.forEach(p => {
    const conditions = Array.isArray(p.predicted_conditions) 
      ? p.predicted_conditions 
      : [p.predicted_conditions];
    
    conditions.forEach((condition: string) => {
      if (!isNormalCondition([condition])) {
        const existing = conditionCounts.get(condition) || { count: 0, confidences: [] };
        existing.count++;
        existing.confidences.push(p.confidence_score);
        conditionCounts.set(condition, existing);
      }
    });
  });

  const uniqueConditionsDetected = Array.from(conditionCounts.keys());

  // Find most frequent condition
  let mostFrequentCondition = null;
  if (uniqueConditionsDetected.length > 0) {
    const sorted = Array.from(conditionCounts.entries()).sort((a, b) => b[1].count - a[1].count);
    const [name, data] = sorted[0];
    mostFrequentCondition = {
      name,
      count: data.count,
      avgConfidence: data.confidences.reduce((sum, c) => sum + c, 0) / data.confidences.length
    };
  }

  // Get critical conditions (high confidence, high occurrence)
  const criticalConditions = Array.from(conditionCounts.entries())
    .filter(([_, data]) => data.count >= 2) // Occurred at least twice
    .map(([condition, data]) => ({
      condition,
      occurrences: data.count,
      maxConfidence: Math.max(...data.confidences)
    }))
    .sort((a, b) => b.maxConfidence - a.maxConfidence)
    .slice(0, 3); // Top 3 critical

  // Determine overall health status
  let healthStatus: AudioReportData['healthStatus'] = 'excellent';
  
  if (emergencyReadings.length > 0 || criticalConditions.length > 0) {
    healthStatus = 'critical';
  } else if (abnormalPredictions > 5) {
    healthStatus = 'concerning';
  } else if (abnormalPredictions > 2) {
    healthStatus = 'caution';
  } else if (abnormalPredictions > 0) {
    healthStatus = 'good';
  }

  return {
    date,
    patientName: profile?.full_name || 'User',
    avgBPM,
    minBPM,
    maxBPM,
    totalReadings: pulseReadings?.length || 0,
    totalPredictions: totalPredictionsCount || 0,
    uniqueConditionsDetected,
    mostFrequentCondition,
    normalPredictions,
    abnormalPredictions,
    criticalConditions,
    emergencyCount: emergencyReadings.length,
    emergencyTimes,
    healthStatus
  };
}
