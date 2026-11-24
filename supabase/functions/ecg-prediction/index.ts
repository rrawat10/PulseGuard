import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==========================================
// ⚙️ CONFIGURATION
// ==========================================
const HF_SPACE_URL = "https://M0hit18-my-ecg-model.hf.space/predict_ecg";
const HF_TOKEN = Deno.env.get("HF_TOKEN") || "";

// Model Requirements
const REQUIRED_SAMPLES = 5000; // 10 Seconds @ 500Hz
const SAMPLE_RATE = 500;
const DISEASE_PROBABILITY_THRESHOLD = 0.98;

// Scaling Constants (Must Match Training)
const GLOBAL_MIN = -18.607;
const GLOBAL_MAX = 18.217;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-api-key",
};

// ==========================================
// 🧠 DSP ENGINE (Noise Removal & Cleaning)
// ==========================================

// 1. Helper: Mean
function getMean(data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length;
}

// 2. Filter: Outlier Clipping (Removes loose wire spikes)
function clipOutliers(data: number[]): number[] {
  const sorted = [...data].sort((a, b) => a - b);
  // Clip top/bottom 0.5%
  const minVal = sorted[Math.floor(sorted.length * 0.005)];
  const maxVal = sorted[Math.floor(sorted.length * 0.995)];
  return data.map(val => Math.max(minVal, Math.min(maxVal, val)));
}

// 3. Filter: Median Filter (Removes sharp electrical clicks)
function applyMedianFilter(data: number[], windowSize: number = 3): number[] {
  const result: number[] = [];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length, i + half + 1);
    const segment = data.slice(start, end).sort((a, b) => a - b);
    result.push(segment[Math.floor(segment.length / 2)]);
  }
  return result;
}

// 4. Filter: Moving Average (Smoothing / Low-Pass)
function applySmoothing(data: number[], windowSize: number = 5): number[] {
  const result: number[] = [];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < data.length) {
        sum += data[j];
        count++;
      }
    }
    result.push(sum / count);
  }
  return result;
}

// 5. Filter: Baseline Wander Removal (High-Pass)
function removeBaselineWander(data: number[]): number[] {
  // Estimate baseline with a wide window (250 samples = 0.5s)
  const baseline = applySmoothing(data, 250); 
  return data.map((val, i) => val - baseline[i]);
}

// 6. MAIN PIPELINE
function preprocessSignal(rawData: number[]): number[] {
  let signal = [...rawData];

  // A. Cleaning
  signal = clipOutliers(signal);       // Remove artifacts
  signal = applyMedianFilter(signal);  // Remove spikes
  signal = removeBaselineWander(signal); // Fix floating line
  signal = applySmoothing(signal, 5);  // Smooth muscle noise

  // B. DC Offset Removal
  const mean = getMean(signal);
  signal = signal.map(v => v - mean);

  // C. Global Min-Max Scaling (CRITICAL for Model Accuracy)
  // This matches your "Success" local script logic
  const range = GLOBAL_MAX - GLOBAL_MIN;
  if (range !== 0) {
    signal = signal.map(v => (v - GLOBAL_MIN) / range);
  } else {
    signal = signal.map(() => 0);
  }

  // D. Exact Sizing
  if (signal.length < REQUIRED_SAMPLES) {
    const padding = new Array(REQUIRED_SAMPLES - signal.length).fill(0);
    signal = [...signal, ...padding];
  } else if (signal.length > REQUIRED_SAMPLES) {
    signal = signal.slice(-REQUIRED_SAMPLES); // Take most recent
  }

  return signal;
}

// ==========================================
// 📡 PREDICTION LOGIC
// ==========================================

async function sendToHuggingFace(samples: number[], timestamp: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HF_TOKEN) headers["Authorization"] = `Bearer ${HF_TOKEN}`;
  
  try {
    const response = await fetch(HF_SPACE_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ signal: samples, timestamp: timestamp }),
    });
    if (!response.ok) throw new Error(`HF API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("HF Error:", error);
    return { error: true }; // Return safe error object
  }
}

// Full SNOMED Mapping
const MLB_CLASSES = [
  "10370003", "106068003", "111975006", "13640000", "164865005", "164873001", "164889003", "164890007", "164896001", "164909002",
  "164912004", "164917005", "164930006", "164931005", "164934002", "164937009", "164947007", "17338001", "195042002", "195060002",
  "233892002", "233897008", "233917008", "251146004", "251164006", "251166008", "251170000", "251187003", "251198002", "251199005",
  "251205003", "251223006", "270492004", "27885002", "284470004", "29320008", "365413008", "39732003", "425856008", "426177001",
  "426648003", "426664006", "426761007", "426783006", "426995002", "427084000", "427172004", "427393009", "428417006", "428750005",
  "429622005", "445118002", "446358003", "47665007", "49578007", "50799005", "54016002", "54329005", "55827005", "55930002",
  "5609005", "57054005", "59118001", "59931005", "61277005", "61721007", "6374002", "67751000119106", "698252002", "713422000",
  "713426002", "713427006", "733534002", "74390002", "75532003", "81898007", "89792004"
];

const SNOMED_TO_DISEASE: Record<string, string> = {
  "10370003": "Paced rhythm", "106068003": "Atrial rhythm", "111975006": "Prolonged QT interval",
  "13640000": "Fusion beats", "164865005": "Myocardial infarction", "164873001": "Left bundle branch block",
  "164889003": "Atrial fibrillation", "164890007": "Atrial flutter", "164896001": "Right bundle branch block",
  "164909002": "Left anterior fascicular block", "164912004": "Left posterior fascicular block",
  "164917005": "QRS complex abnormal", "164930006": "Low QRS voltages", "164931005": "Q wave abnormal",
  "164934002": "ST elevation", "164937009": "T wave abnormal", "164947007": "Prolonged PR interval",
  "17338001": "Ventricular premature beats", "195042002": "2nd degree AV block (Mobitz II)",
  "195060002": "Ventricular pre-excitation", "233892002": "Sinoatrial block", "233897008": "Junctional rhythm",
  "233917008": "Atrioventricular block", "251146004": "Sinus bradycardia", "251164006": "Sick sinus syndrome",
  "251166008": "Sinus pause", "251170000": "Sinus irregularity", "251187003": "Ectopic rhythm",
  "251198002": "Arrhythmia", "251199005": "Dominant rhythm present", "251205003": "Wandering atrial pacemaker",
  "251223006": "Accelerated junctional rhythm", "270492004": "1st degree AV block", "27885002": "Ventricular tachycardia",
  "284470004": "Premature atrial contraction", "29320008": "Ectopic atrial rhythm", "365413008": "Poor R wave progression",
  "39732003": "Left axis deviation", "425856008": "Bradycardia", "426177001": "Sinus rhythm",
  "426648003": "Atrial tachycardia", "426664006": "Junctional premature beat", "426761007": "Supraventricular tachycardia",
  "426783006": "Sinus tachycardia", "426995002": "Ventricular premature complex", "427084000": "Sinus irregularity",
  "427172004": "Early repolarization", "427393009": "High QRS voltage", "428417006": "ST depression",
  "428750005": "Left anterior fascicular block", "429622005": "ST interval abnormal", "445118002": "Left axis deviation",
  "446358003": "Right axis deviation", "47665007": "Atrial ectopic beats", "49578007": "Atrial escape beat",
  "50799005": "Ventricular escape beat", "54016002": "Fusion beat", "54329005": "Acute myocardial infarction",
  "55827005": "Left ventricular hypertrophy", "55930002": "ST segment elevation", "5609005": "Atrial premature complex",
  "57054005": "Old myocardial infarction", "59118001": "Right bundle branch block", "59931005": "T wave inversion",
  "61277005": "Paced rhythm", "61721007": "Left atrial enlargement", "6374002": "Bundle branch block",
  "67751000119106": "Paroxysmal atrial fibrillation", "698252002": "Nonspecific intraventricular conduction delay",
  "713422000": "Cardiac arrhythmia", "713426002": "Complete AV block", "713427006": "3rd degree AV block",
  "733534002": "Atrial fibrillation and flutter", "74390002": "Wolff-Parkinson-White syndrome",
  "75532003": "Ventricular premature complex", "81898007": "Right ventricular hypertrophy",
  "89792004": "Right atrial enlargement"
};

function getDiseaseName(classId: number): string {
  const snomedCode = MLB_CLASSES[classId];
  if (!snomedCode) return `Unknown (ID: ${classId})`;
  return SNOMED_TO_DISEASE[snomedCode] || snomedCode;
}

function interpretPredictions(
  predictions: number[],
  topClassId?: number,
  topLabel?: string,
  topConfidence?: number
): Array<{ disease_name: string; probability: number; class_id: number }> {
  const results: Array<{ disease_name: string; probability: number; class_id: number }> = [];

  // STRICT 98% THRESHOLD - Return Normal if confidence is too low
  if (topConfidence !== undefined && topConfidence < DISEASE_PROBABILITY_THRESHOLD) {
    console.log(`Low Confidence (${topConfidence}). Forced Normal.`);
    return [{ disease_name: "Normal ECG", probability: 1.0, class_id: -1 }];
  }

  // ONLY return the TOP prediction (highest confidence)
  // Don't return multiple predictions - confuses users and causes multiple toasts
  if (topClassId !== undefined && topConfidence !== undefined && topConfidence >= DISEASE_PROBABILITY_THRESHOLD) {
    results.push({ 
      disease_name: getDiseaseName(topClassId), 
      probability: topConfidence, 
      class_id: topClassId 
    });
    return results;
  }

  // Fallback: Find the highest probability prediction from the array
  let maxProb = 0;
  let maxIdx = -1;
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] > maxProb) {
      maxProb = predictions[i];
      maxIdx = i;
    }
  }
  
  if (maxIdx >= 0 && maxProb >= DISEASE_PROBABILITY_THRESHOLD) {
    results.push({ disease_name: getDiseaseName(maxIdx), probability: maxProb, class_id: maxIdx });
  }
  
  if (results.length === 0) {
    results.push({ disease_name: "Normal ECG", probability: 1.0, class_id: -1 });
  }
  
  return results;
}

// ==========================================
// 🚀 MAIN HANDLER
// ==========================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. API KEY CHECK
    const deviceApiKey = req.headers.get("X-Device-API-Key");
    const DEVICE_API_KEY = Deno.env.get("DEVICE_API_KEY");
    if (!deviceApiKey || deviceApiKey !== DEVICE_API_KEY) throw new Error("Invalid API Key");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 2. RECEIVE SMALL DATA CHUNK (e.g. 500 samples / 1 sec)
    const { raw_ecg_data, timestamp, sample_rate = 500, device_id } = await req.json();
    if (!raw_ecg_data || !Array.isArray(raw_ecg_data)) throw new Error("Invalid Data");

    // 3. LEAD OFF CHECK
    const isFlatline = raw_ecg_data.every((val) => val === 0);
    const minVal = Math.min(...raw_ecg_data);
    const maxVal = Math.max(...raw_ecg_data);
    const isLeadsOff = isFlatline || (maxVal - minVal < 5);

    if (isLeadsOff) {
      return new Response(JSON.stringify({
        success: false, lead_off: true, message: "Please connect lead first", predictions: []
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. SAVE CHUNK TO DB (For History & Live Graph)
    // We save this immediately so the Realtime subscriptions trigger the graph update
    const { error: insertError } = await supabaseClient
      .from("ecg_readings")
      .insert({
        device_id: device_id || "unknown",
        reading_data: { raw: raw_ecg_data, timestamp: timestamp },
        sample_rate: sample_rate,
        duration_seconds: raw_ecg_data.length / sample_rate
      });
    
    if (insertError) throw insertError;

    // 5. STITCHING: FETCH HISTORY TO BUILD 10s BUFFER
    // We need 5000 samples. Fetch last 20 rows (assuming ~500 samples/row) to be safe.
    const { data: history } = await supabaseClient
      .from("ecg_readings")
      .select("reading_data")
      .eq("device_id", device_id)
      .order("created_at", { ascending: false }) // Newest first
      .limit(20);

    let combinedSignal: number[] = [];
    if (history) {
      // Reassemble Oldest -> Newest
      for (const row of history.reverse()) {
        if (row.reading_data && Array.isArray(row.reading_data.raw)) {
          combinedSignal.push(...row.reading_data.raw);
        }
      }
    }

    // 6. CHECK BUFFER SIZE & PREDICT
    let predictionResult = null;
    let graphUpdate = true;

    if (combinedSignal.length >= REQUIRED_SAMPLES) {
        // We have enough data! Take the newest 5000 samples.
        const windowForAI = combinedSignal.slice(-REQUIRED_SAMPLES);
        
        // A. CLEANING (Run the Cloud DSP Engine)
        const processedSignal = preprocessSignal(windowForAI);
        
        // B. PREDICTION
        const hfResponse = await sendToHuggingFace(processedSignal, new Date().toISOString());
        
        if (hfResponse.predictions) {
            predictionResult = interpretPredictions(
                hfResponse.predictions, 
                hfResponse.class_id, 
                hfResponse.label, 
                hfResponse.confidence
            );

            // C. SAVE PREDICTION TO DATABASE
            // Get the latest ecg_reading ID for this device
            const { data: latestReading } = await supabaseClient
              .from("ecg_readings")
              .select("id")
              .eq("device_id", device_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (latestReading && predictionResult.length > 0) {
              const maxConfidence = Math.max(...predictionResult.map((p) => p.probability));
              const predictedConditions = predictionResult.map((p) => p.disease_name);

              const { error: predError } = await supabaseClient
                .from("disease_predictions")
                .insert({
                  user_id: null, // Device readings don't have user_id
                  ecg_reading_id: latestReading.id,
                  prediction_result: { predictions: predictionResult },
                  confidence_score: maxConfidence,
                  predicted_conditions: predictedConditions,
                });

              if (predError) {
                console.error("Error storing predictions:", predError);
              } else {
                console.log("✅ Prediction saved to database");
              }
            }
        }
    }

    // 7. RETURN RESPONSE
    // 'prediction' will be null if buffer isn't full yet (e.g. only 2 seconds of data)
    return new Response(JSON.stringify({
      success: true,
      graph_update: graphUpdate,
      prediction: predictionResult,
      buffer_status: `${combinedSignal.length}/${REQUIRED_SAMPLES}`
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});