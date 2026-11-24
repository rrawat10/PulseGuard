import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TTSRequest {
  text: string;
  language_code: 'hi-IN' | 'pa-IN';
  speaker?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language_code, speaker }: TTSRequest = await req.json();

    if (!text || !language_code) {
      throw new Error("Missing required parameters: text and language_code");
    }

    const SARVAM_API_KEY = Deno.env.get("SARVAM_API_KEY");
    if (!SARVAM_API_KEY) {
      throw new Error("SARVAM_API_KEY not configured");
    }

    // Determine appropriate speaker based on language
    // bulbul:v2 compatible speakers: anushka, abhilash, manisha, vidya, arya, karun, hitesh
    // Using anushka (female) for both Hindi and Punjabi as it's high quality and compatible
    const defaultSpeaker = 'anushka';
    const selectedSpeaker = speaker || defaultSpeaker;

    console.log(`Generating TTS for ${language_code} with speaker ${selectedSpeaker}`);
    console.log(`Text length: ${text.length} characters`);

    // Call Sarvam AI TTS API
    const sarvamResponse = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Subscription-Key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        target_language_code: language_code,
        speaker: selectedSpeaker,
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: "bulbul:v2"
      }),
    });

    if (!sarvamResponse.ok) {
      const errorText = await sarvamResponse.text();
      console.error("Sarvam API error:", sarvamResponse.status, errorText);
      throw new Error(`Sarvam API error: ${sarvamResponse.status} - ${errorText}`);
    }

    // Get the audio data from Sarvam API
    const sarvamData = await sarvamResponse.json();
    
    // Sarvam returns base64 encoded audio in the response
    if (!sarvamData.audios || sarvamData.audios.length === 0) {
      throw new Error("No audio data returned from Sarvam API");
    }

    const audioBase64 = sarvamData.audios[0];
    
    console.log("TTS generation successful");

    return new Response(
      JSON.stringify({
        success: true,
        audio_base64: audioBase64,
        language: language_code,
        speaker: selectedSpeaker,
        duration: sarvamData.duration || null
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error in sarvam-tts function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
