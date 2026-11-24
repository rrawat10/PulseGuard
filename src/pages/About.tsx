import { useEffect } from "react";
import { Activity, BrainCircuit, FileText, HeartPulse, Network, ShieldCheck, Upload, Waves, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { icon: Upload, title: "Add your ECG", body: "Upload a short Lead I recording, or explore one of the included examples." },
  { icon: BrainCircuit, title: "Understand the result", body: "See your waveform alongside an AI analysis of the recording." },
  { icon: FileText, title: "Keep track over time", body: "Revisit saved results and export your history to share with your doctor." },
];
const patterns = [
  { icon: HeartPulse, title: "Heart rhythm", body: "Patterns such as sinus rhythm, atrial fibrillation and atrial flutter." },
  { icon: Network, title: "Electrical conduction", body: "Changes such as AV block and bundle branch block." },
  { icon: Zap, title: "Premature beats", body: "Patterns associated with early atrial or ventricular beats." },
  { icon: Waves, title: "Waveform changes", body: "Changes in the ST segment, T wave and QT interval." },
  { icon: Activity, title: "Chamber and voltage", body: "Patterns associated with ventricular hypertrophy and high-voltage QRS." },
  { icon: ShieldCheck, title: "Other ECG findings", body: "Findings such as abnormal QRS complexes and poor R wave progression." },
];

export default function About() {
  const { user } = useAuth();
  const action = user ? "/live-pulse" : "/register";
  useEffect(() => {
    const previous = document.title;
    document.title = "About PulseGuard | Understand your ECG";
    return () => { document.title = previous; };
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <section className="public-background border-b border-blue-100">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:gap-20 lg:px-8 lg:py-24">
            <div>
              <p className="eyebrow">About PulseGuard</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.6rem]">Understand your ECG.<br /><span className="text-primary">Keep a clearer record.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">PulseGuard brings your ECG waveform, AI analysis and personal reports together, so you can explore a recording and keep track of your results in one place.</p>
              <Button asChild className="mt-8 h-12 rounded-xl px-7"><Link to={action}>Explore ECG analysis</Link></Button>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_30px_70px_-48px_rgba(25,76,150,0.4)] sm:p-8">
              <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-primary"><HeartPulse className="h-6 w-6" /></div><div><p className="text-lg font-semibold text-slate-900">A closer look at your heartbeat</p><p className="mt-1 text-sm text-slate-500">One recording, clearly presented</p></div></div>
              <div className="wave-grid mt-6 flex h-48 items-center overflow-hidden rounded-2xl border border-blue-100 bg-[#f7fbff]"><svg viewBox="0 0 600 160" className="h-full w-full" role="img" aria-label="Illustration of an ECG waveform" preserveAspectRatio="none"><path d="M0 84 H70 L84 81 L98 88 L112 84 H155 L166 66 L176 108 L188 29 L202 134 L215 84 H280 L294 81 L307 89 L320 84 H363 L374 66 L384 108 L396 27 L410 135 L423 84 H490 L503 81 L516 89 L528 84 H600" fill="none" stroke="#226cc9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xl font-semibold text-slate-900">Lead I</p><p className="mt-1 text-sm text-slate-500">Single-lead ECG</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-xl font-semibold text-slate-900">10 seconds</p><p className="mt-1 text-sm text-slate-500">Per recording</p></div></div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">How it works</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">From recording to a clearer picture.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{steps.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-blue-100 p-6"><div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon className="h-6 w-6" strokeWidth={1.8} /></div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-3 text-base leading-7 text-slate-600">{body}</p></div>)}</div>
        </section>
        <section id="model" className="bg-[#0f2e56] text-white">
          <div className="mx-auto grid max-w-7xl gap-9 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-20 lg:px-8">
            <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">AI-assisted analysis</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Recognizing patterns in your ECG.</h2><p className="mt-5 text-lg leading-8 text-blue-100">PulseGuard uses a neural network trained to recognize ECG patterns. It examines a short recording and shows the pattern with the highest model score alongside your waveform.</p><p className="mt-4 text-base leading-7 text-blue-200">The model uses a 1D ResNet architecture and evaluates 77 ECG labels, covering heart rhythm, electrical conduction and other waveform findings.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-7"><BrainCircuit className="h-8 w-8 text-sky-300" /><p className="mt-5 text-5xl font-semibold tracking-tight">77</p><p className="mt-2 text-lg font-medium">ECG labels evaluated</p><p className="mt-3 text-base leading-7 text-blue-100">Your result highlights one pattern. A clinician can help interpret it together with your symptoms and medical history.</p></div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">What the analysis covers</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">A range of ECG patterns.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">These are examples of the findings represented in the model's labels.</p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{patterns.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-blue-100 bg-white p-6"><div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon className="h-5 w-5" strokeWidth={1.8} /></div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-base leading-7 text-slate-600">{body}</p></div>)}</div>
          <div className="mt-9 rounded-2xl border border-blue-100 bg-[#f5f9fe] p-6 sm:p-8"><h3 className="text-lg font-semibold text-slate-900">A useful record for your next conversation.</h3><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">ECG analysis supports understanding and does not replace a medical assessment. A model score does not confirm a diagnosis. If you need urgent help, contact emergency services rather than waiting for an analysis.</p><Button asChild variant="outline" className="mt-5 h-11 rounded-xl border-blue-200 bg-white text-primary"><Link to={action}>View an ECG recording</Link></Button></div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
