import { useState } from "react";
import { Activity, HeartPulse, RefreshCw, Upload, Waves } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useECGData } from "@/hooks/useECGData";
import { usePulseReadings } from "@/hooks/useHealthData";
import { supabase } from "@/integrations/supabase/client";
import normalSampleUrl from "../../sample-data/ptbxl-00038-lead-I.csv?url";
import stSampleUrl from "../../sample-data/ptbxl-00160-lead-I.csv?url";
import bundleSampleUrl from "../../sample-data/ptbxl-00180-lead-I.csv?url";
import infarctionSampleUrl from "../../sample-data/ptbxl-00947-lead-I.csv?url";
import hypertrophySampleUrl from "../../sample-data/ptbxl-03785-lead-I.csv?url";

interface ExampleEcg { id: string; annotation: string; code: string; url: string }

const examples: ExampleEcg[] = [
  { id: "00038", annotation: "Normal ECG", code: "NORM", url: normalSampleUrl },
  { id: "00160", annotation: "Nonspecific ST changes", code: "NST_", url: stSampleUrl },
  { id: "00180", annotation: "Complete left bundle branch block", code: "CLBBB", url: bundleSampleUrl },
  { id: "00947", annotation: "Inferolateral myocardial infarction", code: "ILMI", url: infarctionSampleUrl },
  { id: "03785", annotation: "Left ventricular hypertrophy", code: "LVH", url: hypertrophySampleUrl },
];

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
  const [latestExample, setLatestExample] = useState<ExampleEcg | null>(null);

  const analyzeEcg = async (example?: ExampleEcg) => {
    if (!file && !example) return;
    setAnalyzing(true);
    setAnalysisError("");
    setLatestResult(null);
    setLatestExample(null);
    try {
      if (!example && file && file.size > 250_000) throw new Error("Choose a CSV or TXT file smaller than 250 KB.");
      const sampleResponse = example ? await fetch(example.url) : null;
      if (sampleResponse && !sampleResponse.ok) throw new Error("This ECG sample could not be loaded.");
      const signal = parseEcgFile(sampleResponse ? await sampleResponse.text() : await file!.text());
      const { data, error } = await supabase.functions.invoke("analyze-ecg", { body: { signal } });
      if (error) throw new Error("The analysis service could not process this ECG. Please try again.");
      if (!data?.prediction) throw new Error("The analysis service returned no result.");
      setLatestResult(data.prediction);
      setLatestExample(example || null);
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
            <div><p className="eyebrow">Prediction</p><h2 className="mt-1 text-xl font-semibold">Analyze an ECG</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Upload a Lead I CSV or TXT file with 5,000 samples recorded at 500 Hz (10 seconds), or choose an example below.</p></div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Upload className="h-5 w-5" /></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input aria-label="ECG file" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => { setFile(event.target.files?.[0] || null); setAnalysisError(""); }} className="block max-w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:font-semibold file:text-primary hover:file:bg-blue-100" />
            <Button onClick={() => { void analyzeEcg(); }} disabled={!file || analyzing} className="rounded-xl">{analyzing ? "Analyzing..." : "Analyze ECG"}</Button>
          </div>
          <div className="mt-7 border-t border-blue-100 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Example recordings</p><h3 className="mt-1 text-base font-semibold text-slate-900">Compare a reference annotation with the model</h3></div><a href="https://physionet.org/content/ptb-xl/1.0.3/" target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">PTB-XL source</a></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {examples.map((example) => <div key={example.id} className="rounded-xl border border-blue-100 bg-slate-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Record {example.id} · Lead I</p><p className="mt-2 text-sm font-semibold text-slate-900">{example.annotation}</p><p className="mt-1 text-xs text-slate-500">PTB-XL label: {example.code}</p><div className="mt-4 flex items-center gap-4"><Button size="sm" variant="outline" onClick={() => { void analyzeEcg(example); }} disabled={analyzing} className="rounded-lg border-blue-200 bg-white">Analyze sample</Button><a href={example.url} download={`ptbxl-${example.id}-lead-I.csv`} className="text-xs font-medium text-primary hover:underline">Download</a></div></div>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Reference annotations were made from the full 12-lead recordings. This model receives Lead I only, so its result can differ from the reference.</p>
          </div>
          {analysisError && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{analysisError}</p>}
          {latestResult && <div className="mt-5 grid gap-3 sm:grid-cols-2">{latestExample && <div className="rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">PTB-XL reference · {latestExample.code}</p><p className="mt-1 text-lg font-semibold text-slate-900">{latestExample.annotation}</p></div>}<div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Model result</p><p className="mt-1 text-lg font-semibold text-slate-900">{latestResult.disease_name}</p><p className="mt-1 text-sm font-semibold text-primary">Score: {(latestResult.probability * 100).toFixed(1)}%</p></div></div>}
          <p className="mt-4 text-xs text-slate-500">The score is a model output, not the chance that the result is correct. This analysis is not a medical diagnosis.</p>
        </section>

        <section className="soft-panel mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-6 py-5"><div><p className="eyebrow">Waveform</p><h2 className="mt-1 text-xl font-semibold">ECG signal</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${ecgData.samples.length ? "bg-blue-50 text-primary" : "bg-slate-100 text-slate-600"}`}>{ecgData.samples.length ? "Recorded" : "Waiting for data"}</span></div>
          <div className="wave-grid h-80 bg-[#f8fbff] px-3 py-6 sm:px-6">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="#dceaf8" strokeDasharray="3 4" /><XAxis dataKey="sample" type="number" domain={[1, "dataMax"]} tickCount={6} tick={{ fontSize: 11 }} stroke="#7890a8" /><YAxis tickCount={5} tickFormatter={(value: number) => value.toFixed(1)} width={44} tick={{ fontSize: 11 }} stroke="#7890a8" domain={["dataMin - 0.2", "dataMax + 0.2"]} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d9e7f5" }} /><Line type="monotone" dataKey="value" stroke="#2671c8" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Activity className="h-7 w-7" /></div><p className="font-semibold text-slate-800">No ECG signal yet</p><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Upload a Lead I recording or analyze an example to see its waveform.</p></div>
            )}
          </div>
        </section>

        <section className="soft-panel mt-6 p-6"><p className="eyebrow">Analysis</p><h2 className="mt-1 text-xl font-semibold">Latest result</h2>{ecgData.predictions.length ? <div className="mt-5 space-y-3">{ecgData.predictions.slice(0, 3).map((prediction) => <div key={`${prediction.class_id}-${prediction.disease_name}`} className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3"><span className="font-medium text-slate-800">{prediction.disease_name}</span><span className="text-sm font-semibold text-primary">{(prediction.probability * 100).toFixed(1)}%</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No analysis is available for this account yet.</p>}</section>
      </main>
    </div>
  );
}
