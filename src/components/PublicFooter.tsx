import { Link } from "react-router-dom";
import PulseMark from "@/components/PulseMark";

export default function PublicFooter() {
  return (
    <footer className="border-t border-blue-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3"><PulseMark className="h-8 w-8" /><div><p className="text-sm font-semibold text-slate-900">PulseGuard</p><p className="text-xs text-slate-500">ECG analysis, clearly presented.</p></div></div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600"><Link to="/" className="hover:text-primary">Home</Link><Link to="/about" className="hover:text-primary">About</Link><a href="https://physionet.org/content/ptb-xl/1.0.3/" target="_blank" rel="noreferrer" className="hover:text-primary">ECG data source</a></div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} PulseGuard</p>
      </div>
    </footer>
  );
}
