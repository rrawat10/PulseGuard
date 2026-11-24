import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface ECGSample {
  value: number;
  timestamp: number;
}

interface DiseasePrediction {
  disease_name: string;
  probability: number;
  class_id: number;
}

interface ECGReading {
  id: string;
  created_at: string;
  reading_data: {
    raw: number[];
    processed: number[];
    timestamp: string;
    device_id?: string;
  };
  duration_seconds: number;
  sample_rate: number;
}

interface PredictionData {
  id: string;
  created_at: string;
  prediction_result: {
    predictions: DiseasePrediction[];
  };
  confidence_score: number;
  predicted_conditions: string[];
}

interface ECGData {
  samples: ECGSample[];
  predictions: DiseasePrediction[];
  ecg_reading_id?: string;
  processing: boolean;
  lastUpdate: Date | null;
}

export const useECGData = () => {
  const [ecgData, setEcgData] = useState<ECGData>({
    samples: [],
    predictions: [],
    processing: false,
    lastUpdate: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLatestECG = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch only this user's ECG readings.
      const { data: readings, error: readingError } = await supabase
        .from('ecg_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (readingError) throw readingError;

      if (readings && readings.length > 0) {
        const reading = readings[0] as unknown as ECGReading;
        
        // Convert raw ECG data to samples for chart
        // Use 'raw' field (edge function saves as raw, not processed)
        const rawData = reading.reading_data?.raw || reading.reading_data?.processed || [];
        const samples: ECGSample[] = rawData
          .slice(-500) // Display last 500 points
          .map((value, idx) => ({
            value,
            timestamp: idx,
          }));

        // Fetch the LATEST prediction (not tied to this specific reading)
        // Predictions are only created every 10 chunks, so we get the most recent one
        const { data: predictions, error: predError } = await supabase
          .from('disease_predictions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (predError) throw predError;

        // Also fetch multiple recent readings for better BPM calculation
        const { data: recentReadings } = await supabase
          .from('ecg_readings')
          .select('reading_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10); // Get last 10 chunks (10 seconds)

        // Combine samples from recent readings for BPM calculation
        let combinedSamples: ECGSample[] = [];
        if (recentReadings && recentReadings.length > 0) {
          // Reverse to get oldest first, then combine
          const reversedReadings = [...recentReadings].reverse();
          let idx = 0;
          for (const r of reversedReadings) {
            const data = (r.reading_data as any)?.raw || [];
            for (const value of data) {
              combinedSamples.push({ value, timestamp: idx++ });
            }
          }
          // Keep last 2000 samples for display (4 seconds)
          combinedSamples = combinedSamples.slice(-2000);
        }

        if (predictions && predictions.length > 0) {
          const prediction = predictions[0] as unknown as PredictionData;
          
          console.log("Raw prediction data:", prediction);
          console.log("Prediction result:", prediction.prediction_result);
          console.log("Predictions array:", prediction.prediction_result.predictions);
          
          setEcgData({
            samples: combinedSamples.length > 0 ? combinedSamples : samples,
            predictions: prediction.prediction_result.predictions,
            ecg_reading_id: reading.id,
            processing: false,
            lastUpdate: new Date(reading.created_at),
          });

          // Conditions that are normal/benign - no popup needed
          const NORMAL_CONDITIONS = [
            "Normal ECG",
            "Sinus rhythm",
            "Atrial rhythm", 
            "Sinus tachycardia",
            "Sinus bradycardia",
            "Sinus irregularity",
            "Early repolarization",
            "Dominant rhythm present",
          ];
          
          const isNormalCondition = (name: string) => {
            return NORMAL_CONDITIONS.some(c => name.toLowerCase().includes(c.toLowerCase()));
          };

          // Check for critical conditions - only alert for truly abnormal ones
          const criticalConditions = prediction.prediction_result.predictions.filter(
            (p: DiseasePrediction) => !isNormalCondition(p.disease_name) && p.probability > 0.98
          );

          if (criticalConditions.length > 0) {
            // Check if we've already alerted for this reading (persists across page refreshes)
            const alertedReadings = sessionStorage.getItem('alertedECGReadings');
            const alertedIds = alertedReadings ? JSON.parse(alertedReadings) : [];
            
            if (!alertedIds.includes(reading.id)) {
              toast({
                title: "⚠️ Abnormal ECG Detected",
                description: `${criticalConditions[0].disease_name} (${(criticalConditions[0].probability * 100).toFixed(1)}% confidence)`,
                variant: "destructive",
              });
              // Store this reading ID so we don't alert again
              alertedIds.push(reading.id);
              sessionStorage.setItem('alertedECGReadings', JSON.stringify(alertedIds));
            }
          }
        } else {
          // No predictions yet, just show samples
          setEcgData({
            samples: combinedSamples.length > 0 ? combinedSamples : samples,
            predictions: [],
            ecg_reading_id: reading.id,
            processing: false,
            lastUpdate: new Date(reading.created_at),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching ECG data:', error);
      toast({
        title: "Error",
        description: "Failed to load ECG data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription for instant updates + 1-second polling fallback
  useEffect(() => {
    if (!user) return;

    fetchLatestECG(); // Initial fetch

    // Subscribe to real-time ECG reading inserts
    const channel = supabase
      .channel('ecg-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ecg_readings' },
        () => {
          console.log('📡 New ECG reading received');
          fetchLatestECG();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'disease_predictions' },
        () => {
          console.log('🔮 New prediction received');
          fetchLatestECG();
        }
      )
      .subscribe();

    // Fallback polling every 1 second (for graph/BPM updates)
    const interval = setInterval(() => {
      fetchLatestECG();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  return {
    ecgData,
    isLoading,
    refresh: fetchLatestECG,
  };
};
