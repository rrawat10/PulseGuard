import { Activity, CalendarDays, FileText, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import EmergencyHelp from "@/components/EmergencyHelp";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useECGData } from "@/hooks/useECGData";
import { usePulseReadings, useUserProfile } from "@/hooks/useHealthData";

function formatWhen(value?: string | Date | null) {
  if (!value) return "No readings yet";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: readings = [], isLoading } = usePulseReadings(100);
  const { ecgData } = useECGData();
  const firstName = profile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = readings.filter((reading) => new Date(reading.created_at).getTime() >= dayAgo);
  const averageBpm = recent.length ? Math.round(recent.reduce((sum, reading) => sum + reading.bpm, 0) / recent.length) : null;
  const latestReading = ecgData.lastUpdate || readings[0]?.created_at;
  const latestCondition = ecgData.predictions[0]?.disease_name;
  const previewSamples = ecgData.samples.slice(-160);
  const minimum = Math.min(...previewSamples.map((sample) => sample.value));
  const maximum = Math.max(...previewSamples.map((sample) => sample.value));
  const span = Math.max(maximum - minimum, 0.001);
  const previewPoints = previewSamples.map((sample, index) => `${(index / Math.max(previewSamples.length - 1, 1)) * 600},${160 - ((sample.value - minimum) / span) * 140}`).join(" ");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="page-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">{today}</p><h1 className="page-title mt-2">Welcome back, {firstName}</h1><p className="page-subtitle">Here is a clear view of your recent activity.</p></div>
          <Button asChild className="h-11 rounded-xl"><Link to="/live-pulse"><Activity className="mr-2 h-4 w-4" />View live pulse</Link></Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soft-panel p-5"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><HeartPulse className="h-5 w-5" /></div><p className="text-sm text-slate-500">Average heart rate</p><p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{isLoading ? "…" : averageBpm ?? "—"}<span className="ml-1 text-sm font-medium text-slate-500">{averageBpm ? "BPM" : ""}</span></p><p className="mt-2 text-xs text-slate-500">Past 24 hours</p></div>
          <div className="soft-panel p-5"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><Activity className="h-5 w-5" /></div><p className="text-sm text-slate-500">ECG signal</p><p className="mt-1 text-xl font-semibold text-slate-900">{ecgData.lastUpdate ? "Reading available" : "Waiting for data"}</p><p className="mt-2 text-xs text-slate-500">{ecgData.lastUpdate ? formatWhen(ecgData.lastUpdate) : "Add a recording to begin"}</p></div>
          <div className="soft-panel p-5"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><CalendarDays className="h-5 w-5" /></div><p className="text-sm text-slate-500">Last reading</p><p className="mt-1 text-base font-semibold text-slate-900">{formatWhen(latestReading)}</p><p className="mt-2 text-xs text-slate-500">Your most recent recorded data</p></div>
          <div className="soft-panel p-5"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><ShieldCheck className="h-5 w-5" /></div><p className="text-sm text-slate-500">Latest analysis</p><p className="mt-1 truncate text-base font-semibold text-slate-900">{latestCondition || "No analysis yet"}</p><p className="mt-2 text-xs text-slate-500">Based on recorded ECG data</p></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <section className="soft-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-blue-100 px-6 py-5"><div><p className="eyebrow">Monitoring</p><h2 className="mt-1 text-xl font-semibold">Your ECG at a glance</h2></div><Link to="/live-pulse" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Open monitor</Link></div>
            {ecgData.samples.length > 0 ? (
              <div className="wave-grid flex h-64 items-center bg-[#f8fbff] px-5"><svg viewBox="0 0 600 180" preserveAspectRatio="none" className="h-44 w-full" role="img" aria-label="Recent ECG samples"><polyline points={previewPoints} fill="none" stroke="#2874ce" strokeWidth="2" strokeLinejoin="round" /></svg></div>
            ) : (
              <div className="wave-grid flex h-64 flex-col items-center justify-center bg-[#f8fbff] px-5 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Activity className="h-7 w-7" /></div><p className="font-semibold text-slate-800">No ECG readings yet</p><p className="mt-1 max-w-xs text-sm text-slate-500">Your waveform will appear here when readings are available.</p></div>
            )}
          </section>
          <div className="space-y-6">
            <section className="soft-panel p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><FileText className="h-5 w-5" /></div><h2 className="text-lg font-semibold">Quick access</h2></div><div className="space-y-2"><Link to="/reports" className="flex items-center justify-between rounded-xl border border-blue-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50">View reports</Link><Link to="/settings" className="flex items-center justify-between rounded-xl border border-blue-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50">Account settings</Link></div></section>
            <EmergencyHelp />
          </div>
        </div>
      </main>
    </div>
  );
}
