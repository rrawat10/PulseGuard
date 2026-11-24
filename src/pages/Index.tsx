import { Activity, ArrowRight, FileText, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: Activity, title: "ECG waveform", description: "See your signal in a clear, focused monitoring view." },
  { icon: HeartPulse, title: "Health overview", description: "Keep recent readings and important details in one place." },
  { icon: FileText, title: "Reports", description: "Review your history and export available readings." },
];

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="public-background min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="flex items-center gap-4" aria-label="Main navigation">
          {!user && <Link to="/login" className="hidden text-sm font-medium text-slate-600 hover:text-primary sm:inline">Sign in</Link>}
          <Button asChild className="rounded-xl px-5 shadow-sm">
            <Link to={user ? "/dashboard" : "/register"}>{user ? "Open dashboard" : "Get started"}<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.03fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm">
              <span className="h-2 w-2 rounded-full bg-accent" />ECG monitoring, made clearer
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.055em] text-slate-900 sm:text-6xl lg:text-[4.3rem]">
              A clearer view of every <span className="text-primary">heartbeat.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">
              PulseGuard brings your ECG signal, heart rate, and health reports into one calm, easy-to-use workspace.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-xl px-7 shadow-md shadow-blue-200/60">
                <Link to={user ? "/dashboard" : "/register"}>{user ? "Go to dashboard" : "Create account"}<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-blue-200 bg-white px-7 text-primary">
                <Link to={user ? "/live-pulse" : "/login"}>{user ? "View signal" : "Sign in"}</Link>
              </Button>
            </div>
            <p className="mt-7 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 text-primary" />Your readings stay in your account.</p>
          </div>

          <div className="relative">
            <div className="absolute -right-3 -top-4 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="soft-panel relative overflow-hidden p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-blue-100 pb-5">
                <div><p className="eyebrow">PulseGuard workspace</p><h2 className="mt-1 text-xl font-semibold text-slate-900">ECG signal</h2></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary">Signal view</span>
              </div>
              <div className="wave-grid relative mt-6 flex h-64 items-center overflow-hidden rounded-xl bg-[#f8fbff] sm:h-72">
                <svg viewBox="0 0 720 220" className="h-full w-full" role="img" aria-label="Illustration of an ECG waveform" preserveAspectRatio="none">
                  <defs><linearGradient id="wave" x1="0" x2="1"><stop stopColor="#56b6e9" /><stop offset="1" stopColor="#236bc9" /></linearGradient></defs>
                  <path className="draw-wave" d="M0 115 H78 L95 109 L108 119 L126 115 H177 L189 99 L199 130 L210 48 L223 171 L237 112 H270 L285 116 L305 115 H350 L366 107 L382 120 L395 115 H442 L454 99 L464 132 L476 46 L489 173 L502 113 H538 L552 118 L568 115 H610 L625 107 L640 119 L652 115 H720" fill="none" stroke="url(#wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {["Signal", "Heart rate", "History"].map((label, index) => (
                  <div key={label} className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3">
                    <div className="mb-2 h-1.5 w-10 rounded-full bg-blue-200" /><span className="text-xs font-medium text-slate-600">{label}</span>
                    <div className={`mt-2 h-2 rounded-full ${index === 1 ? "w-12" : "w-16"} bg-blue-100`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-blue-100 bg-white/80 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="eyebrow">One place for the essentials</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Everything you need to stay informed.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="soft-panel p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon className="h-5 w-5" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-blue-100 bg-white px-4 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} PulseGuard</footer>
    </div>
  );
};

export default Index;
