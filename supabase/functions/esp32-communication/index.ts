import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ESP32Command {
  type: 'health_report' | 'emergency_alert' | 'device_config';
  data: any;
  language?: string;
}

const translateMessage = async (message: string, targetLanguage: string) => {
  // Placeholder for translation service
  // In production, integrate with Google Translate, DeepL, or similar service
  const translations: { [key: string]: { [key: string]: string } } = {
    'english': {
      'emergency_alert': 'Emergency! High heart rate detected. Please seek medical attention immediately.',
      'normal_reading': 'Your heart rate is normal.',
      'daily_report': 'Daily health report: Average heart rate was {avg_bpm} BPM with {total_readings} readings.',
      'weekly_report': 'Weekly health report: Average heart rate was {avg_bpm} BPM with {emergency_count} emergencies.'
    },
    'spanish': {
      'emergency_alert': '¡Emergencia! Se detectó una frecuencia cardíaca alta. Busque atención médica inmediatamente.',
      'normal_reading': 'Su frecuencia cardíaca es normal.',
      'daily_report': 'Informe diario de salud: La frecuencia cardíaca promedio fue {avg_bpm} BPM con {total_readings} lecturas.',
      'weekly_report': 'Informe semanal de salud: La frecuencia cardíaca promedio fue {avg_bpm} BPM con {emergency_count} emergencias.'
    },
    'french': {
      'emergency_alert': 'Urgence! Fréquence cardiaque élevée détectée. Veuillez consulter un médecin immédiatement.',
      'normal_reading': 'Votre fréquence cardiaque est normale.',
      'daily_report': 'Rapport de santé quotidien: La fréquence cardiaque moyenne était de {avg_bpm} BPM avec {total_readings} lectures.',
      'weekly_report': 'Rapport de santé hebdomadaire: La fréquence cardiaque moyenne était de {avg_bpm} BPM avec {emergency_count} urgences.'
    }
  };

  return translations[targetLanguage]?.[message] || message;
};

const formatHealthReport = (report: any, language: string) => {
  const templateKey = report.report_type === 'daily' ? 'daily_report' : 'weekly_report';
  let message = translateMessage(templateKey, language);
  
  // Replace placeholders
  message = message.replace('{avg_bpm}', Math.round(report.avg_bpm).toString());
  message = message.replace('{total_readings}', report.total_readings.toString());
  message = message.replace('{emergency_count}', report.emergency_count.toString());
  
  return message;
};

const sendToESP32 = async (deviceId: string, command: ESP32Command) => {
  // Placeholder for ESP32 communication
  // In production, this would send data to the actual ESP32 device
  // via HTTP POST, MQTT, or WebSocket connection
  
  console.log(`Sending to ESP32 device ${deviceId}:`, command);
  
  // Simulate ESP32 response
  return {
    success: true,
    device_id: deviceId,
    command_type: command.type,
    timestamp: new Date().toISOString(),
    message: 'Command sent successfully to ESP32 device'
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, report_id, device_id, language = 'english' } = await req.json();

    console.log('ESP32 Communication request:', { action, user_id, report_id, device_id, language });

    if (action === 'send_health_report') {
      // Fetch the health report
      const { data: report, error: reportError } = await supabase
        .from('health_reports')
        .select('*')
        .eq('id', report_id)
        .eq('user_id', user_id)
        .single();

      if (reportError || !report) {
        throw new Error('Health report not found');
      }

      // Get user language preference
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('language')
        .eq('user_id', user_id)
        .single();

      const userLanguage = profile?.language || language;
      const message = formatHealthReport(report, userLanguage);

      // Send to ESP32
      const result = await sendToESP32(device_id || 'default', {
        type: 'health_report',
        data: {
          message,
          report_summary: {
            avg_bpm: Math.round(report.avg_bpm),
            emergency_count: report.emergency_count,
            total_readings: report.total_readings
          }
        },
        language: userLanguage
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Health report sent to device successfully',
        esp32_response: result
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === 'send_emergency_alert') {
      const { pulse_reading_id } = await req.json();

      // Get user language preference
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('language')
        .eq('user_id', user_id)
        .single();

      const userLanguage = profile?.language || language;
      const message = translateMessage('emergency_alert', userLanguage);

      // Send emergency alert to ESP32
      const result = await sendToESP32(device_id || 'default', {
        type: 'emergency_alert',
        data: {
          message,
          alert_level: 'critical',
          pulse_reading_id
        },
        language: userLanguage
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Emergency alert sent to device successfully',
        esp32_response: result
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === 'configure_device') {
      const { config } = await req.json();

      // Send configuration to ESP32
      const result = await sendToESP32(device_id || 'default', {
        type: 'device_config',
        data: config,
        language
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Device configuration sent successfully',
        esp32_response: result
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action specified'
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in ESP32 communication function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});