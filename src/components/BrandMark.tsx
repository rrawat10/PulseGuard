import { Activity } from "lucide-react";
import { Link } from "react-router-dom";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3 text-foreground" aria-label="PulseGuard home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-blue-300/50">
        <Activity className="h-5 w-5" strokeWidth={2.3} />
      </span>
      <span className={`font-semibold tracking-tight ${compact ? "text-lg" : "text-xl"}`}>PulseGuard</span>
    </Link>
  );
}
