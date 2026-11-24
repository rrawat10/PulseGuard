import type { ReactNode } from "react";
import { Activity, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-background flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_30px_90px_-55px_rgba(20,68,133,0.55)] lg:grid-cols-[0.86fr_1.14fr]">
        <aside className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden bg-[#123b73] p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-2xl" />
          <Link to="/" className="relative inline-flex items-center gap-3 text-xl font-semibold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Activity className="h-5 w-5" /></span>PulseGuard
          </Link>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">Your health, in focus</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">Every heartbeat tells a story.</h2>
            <p className="mt-4 max-w-xs text-sm leading-7 text-blue-100">See your ECG, heart rate, and reports in a workspace designed for clarity.</p>
            <div className="wave-grid mt-10 overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-3">
              <svg viewBox="0 0 390 120" className="h-36 w-full" role="img" aria-label="ECG waveform illustration">
                <path d="M0 63 H53 L65 59 L75 66 L87 63 H108 L116 48 L124 79 L132 16 L142 105 L152 63 H205 L217 59 L227 66 L239 63 H261 L269 48 L277 80 L285 14 L295 106 L305 63 H390" fill="none" stroke="#bce9ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <p className="relative text-xs text-blue-200">A simpler way to keep track of what matters.</p>
        </aside>
        <main className="px-6 py-8 sm:px-12 sm:py-12">
          <div className="mb-8 flex items-center justify-between">
            <div className="lg:hidden"><BrandMark compact /></div>
            <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primary lg:ml-auto"><ArrowLeft className="h-4 w-4" />Home</Link>
          </div>
          <div className="mx-auto max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
