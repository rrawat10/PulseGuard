import { Activity, BrainCircuit, ChartNoAxesCombined, FileText, HeartPulse, ShieldCheck, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const essentials = [
  { icon: Waves, title: "See the waveform", body: "Inspect the ECG signal in a clean, readable view after each analysis." },
  { icon: BrainCircuit, title: "Run real inference", body: "Send a Lead I recording to the hosted classifier and receive its current model output." },
  { icon: FileText, title: "Keep the history", body: "Return to saved readings and export your analysis history when you need it." },
];

export default function Index() {
  const { user } = useAuth();
  const action = user ? "/live-pulse" : "/register";

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <section className="public-background overflow-hidden border-b border-blue-100">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.96fr] lg:gap-16 lg:px-8 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm"><Activity className="h-4 w-4" />ECG monitoring, made clearer</div>
              <h1 className="mt-7 max-w-2xl text-[2.9rem] font-semibold leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.2rem]">A sharper view of every <span className="text-primary">heartbeat.</span></h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">Upload a Lead I ECG, explore its waveform, and see a live model result in one focused workspace.</p>
              <div className="mt-9 flex flex-wrap items-center gap-3"><Button asChild size="lg" className="h-12 rounded-xl px-7 shadow-lg shadow-blue-200/60"><Link to={action}>{user ? "Analyze an ECG" : "Get started"}</Link></Button><Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-blue-200 bg-white px-7 text-primary"><Link to="/about">How PulseGuard works</Link></Button></div>
              <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Private account history</span><span className="inline-flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" />Lead I analysis</span></div>
            </div>

            <div className="relative">
              <div className="absolute -right-16 -top-12 h-52 w-52 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.7rem] border border-blue-100 bg-white p-5 shadow-[0_34px_80px_-48px_rgba(20,70,140,0.44)] sm:p-7">
                <div className="flex items-center justify-between border-b border-blue-100 pb-5"><div><p className="eyebrow">PulseGuard workspace</p><h2 className="mt-1 text-xl font-semibold text-slate-900">ECG signal</h2></div><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Activity className="h-6 w-6" strokeWidth={1.8} /></div></div>
                <div className="wave-grid mt-6 flex h-56 items-center overflow-hidden rounded-2xl border border-blue-100 bg-[#f7fbff] sm:h-72"><svg viewBox="0 0 720 220" className="h-full w-full" role="img" aria-label="Illustration of an ECG waveform" preserveAspectRatio="none"><defs><linearGradient id="hero-wave" x1="0" x2="1"><stop stopColor="#58ace7" /><stop offset="1" stopColor="#1d64c7" /></linearGradient></defs><path className="draw-wave" d="M0 115 H78 L95 109 L108 119 L126 115 H177 L189 99 L199 130 L210 48 L223 171 L237 112 H270 L285 116 L305 115 H350 L366 107 L382 120 L395 115 H442 L454 99 L464 132 L476 46 L489 173 L502 113 H538 L552 118 L568 115 H610 L625 107 L640 119 L652 115 H720" fill="none" stroke="url(#hero-wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"><div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3"><Waves className="h-4 w-4 text-primary" /><p className="mt-3 text-sm font-semibold text-slate-800">Waveform</p></div><div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3"><BrainCircuit className="h-4 w-4 text-primary" /><p className="mt-3 text-sm font-semibold text-slate-800">Analysis</p></div><div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3"><FileText className="h-4 w-4 text-primary" /><p className="mt-3 text-sm font-semibold text-slate-800">Reports</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:gap-20 lg:px-8" id="about">
          <div><p className="eyebrow">About PulseGuard</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">Built around the signal, designed for clarity.</h2><p className="mt-5 text-base leading-8 text-slate-600">PulseGuard is an ECG analysis project that brings waveform viewing, machine learning inference, and personal report history together. It makes each step easy to inspect, from the recording you provide to the result the model returns.</p><Link to="/about" className="mt-6 inline-flex rounded-lg border-b-2 border-primary pb-1 text-sm font-semibold text-primary hover:text-blue-800">Learn about the project</Link></div>
          <div className="grid gap-3">{essentials.map(({ icon: Icon, title, body }) => <div key={title} className="flex gap-4 rounded-2xl border border-blue-100 bg-[#f8fbff] p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><Icon className="h-5 w-5" strokeWidth={1.8} /></div><div><h3 className="text-base font-semibold text-slate-900">{title}</h3><p className="mt-1 text-base leading-7 text-slate-600">{body}</p></div></div>)}</div>
        </section>

        <section className="border-y border-blue-100 bg-[#f5f9fe] py-20" id="model">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="eyebrow">The model</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">A real classifier behind every result.</h2><p className="mt-4 text-base leading-7 text-slate-600">The 1D ResNet processes a 10-second Lead I signal and returns the highest-scoring label from 77 ECG outputs.</p></div><Button asChild variant="outline" className="h-11 rounded-xl border-blue-200 bg-white text-primary"><Link to="/about">Explore the model and labels</Link></Button></div>
            <div className="mt-9 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-blue-100 bg-white p-6"><Waves className="h-6 w-6 text-primary" /><p className="mt-5 text-2xl font-semibold text-slate-950">Lead I</p><p className="mt-2 text-base text-slate-600">The ECG lead used for analysis</p></div><div className="rounded-2xl border border-blue-100 bg-white p-6"><BrainCircuit className="h-6 w-6 text-primary" /><p className="mt-5 text-2xl font-semibold text-slate-950">77 labels</p><p className="mt-2 text-base text-slate-600">The model’s available outputs</p></div><div className="rounded-2xl border border-blue-100 bg-white p-6"><ChartNoAxesCombined className="h-6 w-6 text-primary" /><p className="mt-5 text-2xl font-semibold text-slate-950">Saved results</p><p className="mt-2 text-base text-slate-600">Waveforms and analysis history</p></div></div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="flex flex-col gap-7 rounded-3xl bg-[#10335f] px-7 py-9 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Explore the signal</p><h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">See the ECG workflow for yourself.</h2><p className="mt-2 text-base text-blue-100">Start with a real example recording or upload your own Lead I signal.</p></div><Button asChild className="h-11 shrink-0 rounded-xl bg-white px-6 text-[#10335f] hover:bg-blue-50"><Link to={action}>{user ? "Open ECG analysis" : "Create an account"}</Link></Button></div></section>
      </main>
      <PublicFooter />
    </div>
  );
}
