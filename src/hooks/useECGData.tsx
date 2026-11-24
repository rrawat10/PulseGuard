import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ECGSample { value: number; timestamp: number }
interface DiseasePrediction { disease_name: string; probability: number; class_id: number }
interface ECGData {
  samples: ECGSample[];
  predictions: DiseasePrediction[];
  ecg_reading_id?: string;
  processing: boolean;
  lastUpdate: Date | null;
}

const emptyData: ECGData = { samples: [], predictions: [], processing: false, lastUpdate: null };

export const useECGData = () => {
  const { user } = useAuth();
  const [ecgData, setEcgData] = useState<ECGData>(emptyData);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setEcgData(emptyData); return; }
    setIsLoading(true);
    try {
      const { data: readings, error: readingError } = await supabase.from("ecg_readings")
        .select("id,created_at,reading_data").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1);
      if (readingError) throw readingError;
      const reading = readings?.[0];
      if (!reading) { setEcgData(emptyData); return; }

      const { data: predictionRows, error: predictionError } = await supabase.from("disease_predictions")
        .select("prediction_result").eq("user_id", user.id).eq("ecg_reading_id", reading.id)
        .order("created_at", { ascending: false }).limit(1);
      if (predictionError) throw predictionError;
      const readingData = reading.reading_data as { raw?: number[]; processed?: number[] } | null;
      const raw = readingData?.raw || readingData?.processed || [];
      const result = predictionRows?.[0]?.prediction_result as { predictions?: DiseasePrediction[] } | null;
      setEcgData({
        samples: raw.filter((value) => typeof value === "number" && Number.isFinite(value))
          .slice(-1000).map((value, timestamp) => ({ value, timestamp })),
        predictions: result?.predictions || [],
        ecg_reading_id: reading.id,
        processing: false,
        lastUpdate: new Date(reading.created_at),
      });
    } catch (error) {
      console.error("Could not load ECG readings", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    const interval = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(interval);
  }, [refresh, user]);

  return { ecgData, isLoading, refresh };
};
