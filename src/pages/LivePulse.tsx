import { useState } from "react";
import { Activity, HeartPulse, RefreshCw, Upload, Waves } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useECGData } from "@/hooks/useECGData";
import { usePulseReadings } from "@/hooks/useHealthData";
import { supabase } from "@/integrations/supabase/client";
import sampleEcgUrl from "../../sample-data/ptbxl-00001-lead-II.csv?url";

function parseEcgFile(text: string): number[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const cells = lines.length === 1
    ? lines[0].split(/[,;\t\s]+/)
    : lines.map((line) => line.split(/[,;\t]/).at(-1) || "");
  const values = cells.map((cell) => Number(cell.trim())).filter((value) => Number.isFinite(value));
  if (values.length !== 5000) throw new Error("The ECG file must contain exactly 5,000 numeric samples from one lead at 500 Hz.");
  return values;
}

export default function LivePulse() {
  const { ecgData, isLoading, refresh } = useECGData();
  const { data: pulseReadings = [] } = usePulseReadings(1);
  const latestPulse = pulseReadings[0];
  const pulseIsRecent = latestPulse && Date.now() - new Date(latestPulse.created_at).getTime() < 30_000;
  const chartData = ecgData.samples.map((sample, index) => ({ sample: index + 1, value: sample.value }));
  const lastUpdate = ecgData.lastUpdate ? ecgData.lastUpdate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "No readings yet";
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [latestResult, setLatestResult] = useState<{ disease_name: string; probability: number } | null>(null);

  const analyzeFile = async () => {
    if (!file) return;
    setAnalyzing(true);
    setAnalysisError("");
    setLatestResult(null);
    try {
      if (file.size > 250_000) throw new Error("Choose a CSV or TXT file smaller than 250 KB.");
      const signal = parseEcgFile(await file.text());
      const { data, error } = await supabase.functions.invoke("analyze-ecg", { body: { signal } });
      if (error) throw new Error("The analysis service could not process this ECG. Please try again.");
      if (!data?.prediction) throw new Error("The analysis service returned no result.");
      setLatestResult(data.prediction);
      await refresh();
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not analyze this ECG.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="page-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">ECG monitoring</p><h1 className="page-title mt-2">Live pulse</h1><p className="page-subtitle">Your waveform and latest measurements in one focused view.</p></div>
          <Button variant="outline" onClick={refresh} disabled={isLoading} className="h-11 rounded-xl border-blue-200 bg-white"><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="soft-panel p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><HeartPulse className="h-6 w-6" /></div><p className="text-sm text-slate-500">Heart rate</p><p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">{pulseIsRecent ? latestPulse.bpm : "—"}<span className="ml-2 text-sm font-medium text-slate-500">{pulseIsRecent ? "BPM" : ""}</span></p><p className="mt-3 text-xs text-slate-500">Latest recorded measurement</p></div>
          <div className="soft-panel p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Activity className="h-6 w-6" /></div><p className="text-sm text-slate-500">Signal status</p><p className="mt-1 text-xl font-semibold text-slate-900">{ecgData.samples.length ? "ECG available" : "No ECG recorded"}</p><p className="mt-3 text-xs text-slate-500">{ecgData.samples.length ? `${ecgData.samples.length.toLocaleString()} samples displayed` : "Waiting for ECG readings"}</p></div>
          <div className="soft-panel p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Waves className="h-6 w-6" /></div><p className="text-sm text-slate-500">Last ECG update</p><p className="mt-1 text-base font-semibold text-slate-900">{lastUpdate}</p><p className="mt-3 text-xs text-slate-500">Refreshes automatically when new data arrives</p></div>
        </div>

        <section className="soft-panel mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="eyebrow">Prediction</p><h2 className="mt-1 text-xl font-semibold">Analyze an ECG</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Upload a single-lead CSV or TXT file with 5,000 samples recorded at 500 Hz (10 seconds).</p></div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Upload className="h-5 w-5" /></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input aria-label="ECG file" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => { setFile(event.target.files?.[0] || null); setAnalysisError(""); }} className="block max-w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:font-semibold file:text-primary hover:file:bg-blue-100" />
            <Button onClick={analyzeFile} disabled={!file || analyzing} className="rounded-xl">{analyzing ? "Analyzing..." : "Analyze ECG"}</Button>
          </div>
          <a href={sampleEcgUrl} download="ptbxl-00001-lead-II.csv" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Download a sample ECG</a>
          {analysisError && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{analysisError}</p>}
          {latestResult && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Model result</p><p className="mt-1 text-lg font-semibold text-slate-900">{latestResult.disease_name}</p></div><p className="text-sm font-semibold text-primary">Score: {Math.round(latestResult.probability * 100)}%</p></div>}
          <p className="mt-4 text-xs text-slate-500">Model output is informational and is not a medical diagnosis.</p>
        </section>

        <section className="soft-panel mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-6 py-5"><div><p className="eyebrow">Waveform</p><h2 className="mt-1 text-xl font-semibold">ECG signal</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${ecgData.samples.length ? "bg-blue-50 text-primary" : "bg-slate-100 text-slate-600"}`}>{ecgData.samples.length ? "Recorded" : "Waiting for data"}</span></div>
          <div className="wave-grid h-80 bg-[#f8fbff] px-3 py-6 sm:px-6">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="#dceaf8" strokeDasharray="3 4" /><XAxis dataKey="sample" type="number" domain={[1, "dataMax"]} tickCount={6} tick={{ fontSize: 11 }} stroke="#7890a8" /><YAxis tickCount={5} tickFormatter={(value: number) => value.toFixed(1)} width={44} tick={{ fontSize: 11 }} stroke="#7890a8" domain={["dataMin - 0.2", "dataMax + 0.2"]} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d9e7f5" }} /><Line type="monotone" dataKey="value" stroke="#2671c8" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Activity className="h-7 w-7" /></div><p className="font-semibold text-slate-800">No ECG signal yet</p><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">The waveform will appear here when your device sends readings.</p></div>
            )}
          </div>
        </section>

        <section className="soft-panel mt-6 p-6"><p className="eyebrow">Analysis</p><h2 className="mt-1 text-xl font-semibold">Latest result</h2>{ecgData.predictions.length ? <div className="mt-5 space-y-3">{ecgData.predictions.slice(0, 3).map((prediction) => <div key={`${prediction.class_id}-${prediction.disease_name}`} className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3"><span className="font-medium text-slate-800">{prediction.disease_name}</span><span className="text-sm font-semibold text-primary">{Math.round(prediction.probability * 100)}%</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No analysis is available for this account yet.</p>}</section>
      </main>
    </div>
  );
}
