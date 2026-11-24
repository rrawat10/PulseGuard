import { useEffect, useState } from "react";
import { Activity, Download, FileText, HeartPulse } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePulseReadings } from "@/hooks/useHealthData";
import { supabase } from "@/integrations/supabase/client";

interface PredictionRow {
  id: string;
  created_at: string;
  predicted_conditions: string[];
  confidence_score: number;
}

export default function Reports() {
  const { user } = useAuth();
  const { data: pulseReadings = [] } = usePulseReadings(1000);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [period, setPeriod] = useState<"today" | "week">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from("disease_predictions").select("id,created_at,predicted_conditions,confidence_score")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Reports could not be loaded. Please refresh the page.");
        else setPredictions((data || []) as PredictionRow[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const now = new Date();
  const start = period === "today"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    : Date.now() - 7 * 24 * 60 * 60 * 1000;
  const visiblePredictions = predictions.filter((row) => new Date(row.created_at).getTime() >= start);
  const visiblePulse = pulseReadings.filter((row) => new Date(row.created_at).getTime() >= start);
  const averageBpm = visiblePulse.length ? Math.round(visiblePulse.reduce((sum, row) => sum + row.bpm, 0) / visiblePulse.length) : null;

  const exportCsv = () => {
    if (!visiblePredictions.length) return;
    const rows = [
      ["Date", "Condition", "Model score"],
      ...visiblePredictions.map((row) => [new Date(row.created_at).toISOString(), row.predicted_conditions.join("; "), String(row.confidence_score)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulseguard-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="page-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Your history</p><h1 className="page-title mt-2">Reports</h1><p className="page-subtitle">Review recorded ECG analyses and heart rate measurements.</p></div><Button onClick={exportCsv} disabled={!visiblePredictions.length} variant="outline" className="h-11 rounded-xl border-blue-200 bg-white"><Download className="mr-2 h-4 w-4" />Export CSV</Button></div>

        <div className="mb-5 inline-flex gap-1 rounded-xl border border-blue-100 bg-white p-1" aria-label="Report period">
          <button type="button" onClick={() => setPeriod("today")} className={`rounded-lg px-4 py-2 text-sm font-medium ${period === "today" ? "bg-blue-50 text-primary" : "text-slate-500 hover:text-slate-800"}`}>Today</button>
          <button type="button" onClick={() => setPeriod("week")} className={`rounded-lg px-4 py-2 text-sm font-medium ${period === "week" ? "bg-blue-50 text-primary" : "text-slate-500 hover:text-slate-800"}`}>Last 7 days</button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="soft-panel p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><FileText className="h-5 w-5" /></div><p className="text-sm text-slate-500">ECG analyses</p><p className="mt-1 text-3xl font-semibold text-slate-900">{loading ? "…" : visiblePredictions.length}</p></div>
          <div className="soft-panel p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><HeartPulse className="h-5 w-5" /></div><p className="text-sm text-slate-500">Average heart rate</p><p className="mt-1 text-3xl font-semibold text-slate-900">{averageBpm ?? "—"}<span className="ml-2 text-sm font-medium text-slate-500">{averageBpm ? "BPM" : ""}</span></p></div>
          <div className="soft-panel p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Activity className="h-5 w-5" /></div><p className="text-sm text-slate-500">Latest model result</p><p className="mt-1 truncate text-base font-semibold text-slate-900">{visiblePredictions[0]?.predicted_conditions[0] || "No result yet"}</p></div>
        </div>

        <section className="soft-panel mt-6 overflow-hidden"><div className="border-b border-blue-100 px-6 py-5"><p className="eyebrow">Analysis history</p><h2 className="mt-1 text-xl font-semibold">ECG results</h2></div>
          {error ? <p role="alert" className="px-6 py-10 text-sm text-red-600">{error}</p> : visiblePredictions.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-semibold">Date</th><th className="px-6 py-3 font-semibold">Model result</th><th className="px-6 py-3 text-right font-semibold">Score</th></tr></thead><tbody>{visiblePredictions.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-6 py-4 text-slate-600">{new Date(row.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-6 py-4 font-medium text-slate-800">{row.predicted_conditions.join(", ")}</td><td className="px-6 py-4 text-right font-semibold text-primary">{(row.confidence_score * 100).toFixed(1)}%</td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-primary"><FileText className="h-7 w-7" /></div><p className="font-semibold text-slate-800">No analyses for this period</p><p className="mt-1 text-sm text-slate-500">Your ECG results will appear here after an analysis.</p></div>}
        </section>
      </main>
    </div>
  );
}
