import { useEffect, useState, useRef } from 'react';
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
  snomed_code: string;
}

interface ECGData {
  samples: ECGSample[];
  predictions: DiseasePrediction[];
  ecg_reading_id?: string;
  processing: boolean;
}

const SAMPLES_PER_10SEC = 5000;
const SAMPLE_RATE = 250; // Hz - adjust based on your ESP32 configuration

export const useECGWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [ecgData, setEcgData] = useState<ECGData>({
    samples: [],
    predictions: [],
    processing: false,
  });
  const [bufferProgress, setBufferProgress] = useState(0);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const sampleBufferRef = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processECGBuffer = async (buffer: number[]) => {
    if (!user) return;

    setEcgData(prev => ({ ...prev, processing: true }));

    try {
      // Get session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      // Call edge function for prediction
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecg-prediction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            raw_ecg_data: buffer,
            timestamp: new Date().toISOString(),
            sample_rate: SAMPLE_RATE,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setEcgData(prev => ({
          ...prev,
          predictions: result.predictions,
          ecg_reading_id: result.ecg_reading_id,
          processing: false,
        }));

        // Check for critical conditions
        const criticalConditions = result.predictions.filter(
          (p: DiseasePrediction) => p.disease_name !== "Normal ECG" && p.probability > 0.98
        );

        if (criticalConditions.length > 0) {
          toast({
            title: "⚠️ Abnormal ECG Detected",
            description: `${criticalConditions[0].disease_name} (${(criticalConditions[0].probability * 100).toFixed(1)}% confidence)`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error processing ECG buffer:', error);
      setEcgData(prev => ({ ...prev, processing: false }));
      toast({
        title: "Processing Error",
        description: "Failed to analyze ECG data",
        variant: "destructive",
      });
    }
  };

  const connectWebSocket = () => {
    if (!user) return;

    try {
      // WebSocket URL for ECG streaming
      // Update this with your actual Supabase project URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
      const wsUrl = `${supabaseUrl}/functions/v1/ecg-stream`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('ECG WebSocket connected');
        setIsConnected(true);
        sampleBufferRef.current = [];
        
        // Send authentication
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'auth',
            token: user.id
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ecg_sample') {
            // Single ECG sample from ESP32
            const sample: ECGSample = {
              value: data.value,
              timestamp: data.timestamp || Date.now(),
            };

            // Add to display buffer (keep last 1000 samples for real-time display)
            setEcgData(prev => ({
              ...prev,
              samples: [...prev.samples.slice(-999), sample],
            }));

            // Add to processing buffer
            sampleBufferRef.current.push(data.value);
            
            // Update progress
            const progress = (sampleBufferRef.current.length / SAMPLES_PER_10SEC) * 100;
            setBufferProgress(progress);

            // When buffer is full (10 seconds), process it
            if (sampleBufferRef.current.length >= SAMPLES_PER_10SEC) {
              const bufferToProcess = [...sampleBufferRef.current];
              sampleBufferRef.current = [];
              setBufferProgress(0);
              
              processECGBuffer(bufferToProcess);
            }
          } else if (data.type === 'ecg_batch') {
            // Batch of samples from ESP32
            const samples = data.samples.map((value: number, idx: number) => ({
              value,
              timestamp: Date.now() + idx,
            }));

            setEcgData(prev => ({
              ...prev,
              samples: [...prev.samples.slice(-(1000 - samples.length)), ...samples],
            }));

            // Add to buffer
            sampleBufferRef.current.push(...data.samples);
            const progress = (sampleBufferRef.current.length / SAMPLES_PER_10SEC) * 100;
            setBufferProgress(progress);

            if (sampleBufferRef.current.length >= SAMPLES_PER_10SEC) {
              const bufferToProcess = sampleBufferRef.current.slice(0, SAMPLES_PER_10SEC);
              sampleBufferRef.current = sampleBufferRef.current.slice(SAMPLES_PER_10SEC);
              processECGBuffer(bufferToProcess);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('ECG WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    sampleBufferRef.current = [];
    setBufferProgress(0);
  };

  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [user]);

  return {
    isConnected,
    ecgData,
    bufferProgress,
    reconnect: connectWebSocket,
    disconnect,
  };
};
