import { useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface PulseData {
  bpm: number;
  signal_strength: number;
  health_status: 'normal' | 'risk_a' | 'risk_b' | 'risk_c' | 'emergency';
  is_emergency: boolean;
  timestamp: string;
}

export const usePulseWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentPulse, setCurrentPulse] = useState<PulseData | null>(null);
  const [pulseHistory, setPulseHistory] = useState<PulseData[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = () => {
    if (!user) return;

    try {
      // Use the Supabase project URL for WebSocket connection
      const wsUrl = `wss://qxvlhdqdbkrhiqdohgio.functions.supabase.co/pulse-stream`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Pulse WebSocket connected');
        setIsConnected(true);
        
        // Send authentication token
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
          
          if (data.type === 'pulse_data') {
            const pulseData: PulseData = {
              bpm: data.bpm,
              signal_strength: data.signal_strength,
              health_status: data.health_status,
              is_emergency: data.is_emergency,
              timestamp: data.timestamp || new Date().toISOString()
            };

            setCurrentPulse(pulseData);
            setPulseHistory(prev => [pulseData, ...prev.slice(0, 99)]); // Keep last 100 readings

            // Store in database
            supabase
              .from('pulse_readings')
              .insert({
                user_id: user.id,
                bpm: pulseData.bpm,
                signal_strength: pulseData.signal_strength,
                health_status: pulseData.health_status,
                is_emergency: pulseData.is_emergency
              })
              .then(({ error }) => {
                if (error) console.error('Error storing pulse data:', error);
              });

            // Show emergency alert
            if (pulseData.is_emergency) {
              toast({
                title: "⚠️ Emergency Alert!",
                description: `Critical BPM detected: ${pulseData.bpm}`,
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Pulse WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
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
  };

  const sendCommand = (command: string, data?: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        command,
        data,
        user_id: user?.id
      }));
    }
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
    currentPulse,
    pulseHistory,
    sendCommand,
    reconnect: connectWebSocket,
    disconnect
  };
};