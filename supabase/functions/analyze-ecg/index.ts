import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { CLASS_LABELS } from "./labels.ts";

const modelUrl = Deno.env.get("HF_SPACE_URL") || "https://M0hit18-my-ecg-model.hf.space/predict_ecg";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Please sign in before analyzing an ECG." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "Analysis service is not configured." }, 503);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: "Your session has expired. Please sign in again." }, 401);

  let signal: unknown;
  try {
    ({ signal } = await request.json());
  } catch {
    return json({ error: "Invalid ECG request." }, 400);
  }

  if (!Array.isArray(signal) || signal.length !== 5000 || !signal.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return json({ error: "Upload a single-lead ECG with exactly 5,000 numeric samples." }, 400);
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const hfToken = Deno.env.get("HF_TOKEN");
    if (hfToken) headers.Authorization = `Bearer ${hfToken}`;

    // The model service applies its own preprocessing to the raw 500 Hz signal.
    const modelResponse = await fetch(modelUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ signal }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!modelResponse.ok) throw new Error(`Model service returned ${modelResponse.status}`);
    const modelResult = await modelResponse.json();
    const classId = Number(modelResult.class_id);
    const score = Number(modelResult.confidence);
    if (!Number.isInteger(classId) || classId < 0 || classId >= CLASS_LABELS.length || !Number.isFinite(score) || score < 0 || score > 1) {
      throw new Error("Model service returned an invalid prediction");
    }

    const prediction = {
      class_id: classId,
      disease_name: CLASS_LABELS[classId],
      probability: score,
    };
    const timestamp = new Date().toISOString();
    const { data: reading, error: readingError } = await supabase.from("ecg_readings").insert({
      user_id: user.id,
      reading_data: { raw: signal, timestamp, source: "upload" },
      sample_rate: 500,
      duration_seconds: 10,
    }).select("id").single();
    if (readingError || !reading) throw readingError || new Error("Could not save ECG reading");

    const { error: predictionError } = await supabase.from("disease_predictions").insert({
      user_id: user.id,
      ecg_reading_id: reading.id,
      prediction_result: { predictions: [prediction] },
      confidence_score: score,
      predicted_conditions: [prediction.disease_name],
    });
    if (predictionError) throw predictionError;

    return json({ prediction, reading_id: reading.id });
  } catch (error) {
    console.error("ECG analysis failed:", error);
    return json({ error: "ECG analysis is unavailable right now. Please try again." }, 502);
  }
});
