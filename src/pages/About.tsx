import { useEffect } from "react";
import { Activity, BrainCircuit, ChartNoAxesCombined, Cpu, Database, FileText, HeartPulse, Info, Network, ScanLine, Timer, Waves, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const workflow = [
  { icon: Waves, title: "Bring in the signal", body: "Upload a 10-second Lead I ECG recorded at 500 Hz, or choose one of the included example recordings." },
  { icon: BrainCircuit, title: "Run the classifier", body: "The signal is sent to the hosted model. Its highest-scoring label is returned from a set of 77 outputs." },
  { icon: FileText, title: "Review the result", body: "See the waveform and model result together, then revisit saved analyses in your account." },
];

const labelGroups = [
  { icon: HeartPulse, title: "Rhythm and rate", examples: "Sinus rhythm, sinus bradycardia, atrial fibrillation, atrial flutter" },
  { icon: Network, title: "Conduction", examples: "AV block, bundle branch block, fascicular block" },
  { icon: Zap, title: "Premature beats", examples: "Premature ventricular contraction, premature atrial contraction, junctional premature beat" },
  { icon: Waves, title: "ST, T and intervals", examples: "ST elevation, T-wave inversion, prolonged QT interval" },
  { icon: ChartNoAxesCombined, title: "Chamber and voltage", examples: "Left ventricular hypertrophy, right atrial enlargement, high-voltage QRS" },
  { icon: Activity, title: "Infarction and QRS findings", examples: "Myocardial infarction, abnormal QRS complex, poor R wave progression" },
];

const architecture = [
  { title: "Signal input", detail: "5,000 × 1 Lead I samples" },
  { title: "Convolution stem", detail: "64 filters, normalization and pooling" },
  { title: "Residual stages", detail: "Four stages with two blocks each" },
  { title: "Output layer", detail: "Pooling, then 77 sigmoid scores" },
];

const servingPipeline = [
  { icon: Waves, title: "Input check", detail: "The website and Edge Function require exactly 5,000 numeric samples. The recording should be Lead I." },
  { icon: Network, title: "Secure request", detail: "A signed-in request reaches the Supabase Edge Function, which calls the hosted model." },
  { icon: BrainCircuit, title: "Preprocess and infer", detail: "The model service removes the signal mean, applies fixed global scaling, then runs the 1D ResNet." },
  { icon: FileText, title: "Save and show", detail: "The highest-scoring label, score and waveform are stored for the signed-in account." },
];

export default function About() {
  const { user } = useAuth();
  useEffect(() => {
    const previous = document.title;
    document.title = "About PulseGuard | ECG analysis";
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <section className="public-background border-b border-blue-100">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:gap-20 lg:px-8 lg:py-24">
            <div>
              <p className="eyebrow">About PulseGuard</p>
              <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.12] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.6rem]">A clear path from ECG signal to model insight.</h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">PulseGuard brings ECG viewing, classification and saved reports into one focused website. It helps you inspect a Lead I waveform and see what the current model reports for that recording.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild className="h-11 rounded-xl px-6"><Link to={user ? "/live-pulse" : "/register"}>Analyze an ECG</Link></Button><a href="#model" className="inline-flex h-11 items-center rounded-xl border border-blue-200 bg-white px-6 text-sm font-semibold text-primary hover:bg-blue-50">Explore the model</a></div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_30px_70px_-48px_rgba(25,76,150,0.4)] sm:p-7">
              <div className="flex items-center justify-between border-b border-blue-100 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">The ECG input</p><p className="mt-1 text-lg font-semibold text-slate-900">One lead. Ten seconds.</p></div><ScanLine className="h-6 w-6 text-primary" /></div>
              <div className="wave-grid mt-6 flex h-56 items-center overflow-hidden rounded-2xl border border-blue-100 bg-[#f7fbff]"><svg viewBox="0 0 600 160" className="h-full w-full" role="img" aria-label="Illustration of an ECG waveform" preserveAspectRatio="none"><path d="M0 84 H70 L84 81 L98 88 L112 84 H155 L166 66 L176 108 L188 29 L202 134 L215 84 H280 L294 81 L307 89 L320 84 H363 L374 66 L384 108 L396 27 L410 135 L423 84 H490 L503 81 L516 89 L528 84 H600" fill="none" stroke="#226cc9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center sm:gap-3"><div className="rounded-xl bg-blue-50 px-2 py-3"><p className="text-base font-semibold text-slate-900">Lead I</p><p className="mt-1 text-xs text-slate-500">Input lead</p></div><div className="rounded-xl bg-blue-50 px-2 py-3"><p className="text-base font-semibold text-slate-900">500 Hz</p><p className="mt-1 text-xs text-slate-500">Sample rate</p></div><div className="rounded-xl bg-blue-50 px-2 py-3"><p className="text-base font-semibold text-slate-900">5,000</p><p className="mt-1 text-xs text-slate-500">Samples</p></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="workflow">
          <div className="max-w-2xl"><p className="eyebrow">What the website does</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">A simple workflow, from upload to report.</h2><p className="mt-4 text-base leading-7 text-slate-600">Every analysis uses the waveform you provide. Results are saved to your account so you can review them later.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{workflow.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-[0_18px_40px_-35px_rgba(25,76,150,0.35)]"><div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon className="h-6 w-6" strokeWidth={1.8} /></div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-3 text-base leading-7 text-slate-600">{body}</p></div>)}</div>
        </section>

        <section id="model" className="bg-[#0f2e56] text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-20">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">The ML model</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A 1D ResNet reads the waveform.</h2><p className="mt-5 max-w-xl text-base leading-8 text-blue-100">The deployed classifier accepts one Lead I sequence, removes its mean, scales the signal, and calculates scores across 77 ECG labels. PulseGuard displays the highest-scoring result and stores it with the reading.</p><p className="mt-4 max-w-xl text-sm leading-6 text-blue-200">Inference runs on a hosted Hugging Face service; the website does not run the model inside your browser.</p></div>
            <div className="grid grid-cols-2 gap-3 self-center"><div className="rounded-2xl border border-white/15 bg-white/10 p-5"><ScanLine className="h-6 w-6 text-sky-300" /><p className="mt-5 text-2xl font-semibold">Lead I</p><p className="mt-1 text-sm text-blue-200">Single-lead input</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-5"><Waves className="h-6 w-6 text-sky-300" /><p className="mt-5 text-2xl font-semibold">10 seconds</p><p className="mt-1 text-sm text-blue-200">Signal window</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-5"><BrainCircuit className="h-6 w-6 text-sky-300" /><p className="mt-5 text-2xl font-semibold">77</p><p className="mt-1 text-sm text-blue-200">Output labels</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-5"><FileText className="h-6 w-6 text-sky-300" /><p className="mt-5 text-2xl font-semibold">Saved</p><p className="mt-1 text-sm text-blue-200">Analysis history</p></div></div>
          </div>
        </section>

        <section className="border-b border-blue-100 bg-[#f7faff]" id="pipeline">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-3xl"><p className="eyebrow">Model pipeline</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">How the signal becomes a result.</h2><p className="mt-4 text-base leading-8 text-slate-600">The current serving code and network definition show each step from the uploaded ECG to the stored prediction.</p></div>
            <div className="mt-9 grid gap-3 md:grid-cols-4">{servingPipeline.map(({ icon: Icon, title, detail }) => <div key={title} className="rounded-2xl border border-blue-100 bg-white p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon className="h-5 w-5" strokeWidth={1.8} /></div><h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></div>)}</div>
            <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Cpu className="h-6 w-6 text-primary" /><h3 className="text-xl font-semibold text-slate-900">Inside the 1D ResNet</h3></div><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">The network uses a convolutional stem, four residual stages with 64, 128, 256 and 512 filters, global average pooling, and a 77-unit sigmoid output layer. PulseGuard displays the largest of those 77 scores.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{architecture.map(({ title, detail }) => <div key={title} className="rounded-xl bg-[#f4f8fd] px-4 py-4"><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p></div>)}</div></div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="training">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1fr] lg:gap-16"><div><p className="eyebrow">Training setup</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">What the model files tell us about training.</h2><p className="mt-5 text-base leading-8 text-slate-600">The accompanying configuration points to the <a href="https://physionet.org/content/ecg-arrhythmia/1.0.0/" target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">PhysioNet arrhythmia dataset</a> and names separate Lead I training, validation and test files. The source dataset contains expert-labeled 10-second, 500 Hz ECG recordings; the exact subset used for these weights is not documented here.</p><div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm leading-6 text-slate-700">The training notebook, run logs and measured evaluation metrics are not included with the model files. These settings describe the available configuration; they do not prove which run produced the deployed weights.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-blue-100 bg-white p-6"><Database className="h-6 w-6 text-primary" /><h3 className="mt-5 text-base font-semibold text-slate-900">Prepared data</h3><p className="mt-2 text-sm leading-6 text-slate-600">Named files: <code>train_data_lead_i.npz</code>, <code>val_data_lead_i.npz</code> and <code>test_data_lead_i.npz</code>.</p></div><div className="rounded-2xl border border-blue-100 bg-white p-6"><Waves className="h-6 w-6 text-primary" /><h3 className="mt-5 text-base font-semibold text-slate-900">Configured augmentation</h3><p className="mt-2 text-sm leading-6 text-slate-600">Noise standard deviation 0.01, shifts of up to 50 samples and amplitude scaling range 0.1.</p></div><div className="rounded-2xl border border-blue-100 bg-white p-6"><Timer className="h-6 w-6 text-primary" /><h3 className="mt-5 text-base font-semibold text-slate-900">Configured fitting</h3><p className="mt-2 text-sm leading-6 text-slate-600">Maximum 100 epochs, batch size 32 and learning rate 0.001.</p></div><div className="rounded-2xl border border-blue-100 bg-white p-6"><ChartNoAxesCombined className="h-6 w-6 text-primary" /><h3 className="mt-5 text-base font-semibold text-slate-900">Configured selection</h3><p className="mt-2 text-sm leading-6 text-slate-600">Validation-loss checkpointing, early stopping after 10 stagnant epochs and learning-rate reduction after 5.</p></div></div></div>
          <p className="mt-7 text-sm leading-6 text-slate-500">The configuration contains an 88-entry class-count list even though the served model has 77 outputs. This is another reason to treat the configuration as a record of intended settings rather than a complete training history.</p>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="labels">
          <div className="max-w-3xl"><p className="eyebrow">Model output labels</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">What kinds of patterns can it report?</h2><p className="mt-4 text-base leading-7 text-slate-600">These groups organize examples from the model’s 77 labels. The website shows one highest-scoring label for an analysis; the groups are a guide to the label set, not separate diagnoses.</p></div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{labelGroups.map(({ icon: Icon, title, examples }) => <div key={title} className="group rounded-2xl border border-blue-100 bg-white p-6 transition-colors hover:border-blue-200 hover:bg-[#f7fbff]"><div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary group-hover:bg-blue-100"><Icon className="h-5 w-5" strokeWidth={1.8} /></div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-base leading-7 text-slate-600">{examples}</p></div>)}</div>
        </section>

        <section className="border-t border-blue-100 bg-[#f5f9fe]">
          <div className="mx-auto grid max-w-7xl gap-7 px-4 py-14 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:px-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-primary"><Info className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold text-slate-900">Reading the result responsibly</h2><p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">The displayed score is a model output, not the chance that a diagnosis is correct. Example ECGs have separate PTB-XL reference annotations from full 12-lead recordings, which may differ from a Lead I model result.</p></div><Button asChild variant="outline" className="h-11 rounded-xl border-blue-200 bg-white text-primary"><Link to={user ? "/live-pulse" : "/register"}>Explore ECG examples</Link></Button></div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
