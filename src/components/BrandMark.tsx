import { Link } from "react-router-dom";
import PulseMark from "@/components/PulseMark";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3 text-foreground" aria-label="PulseGuard home">
      <PulseMark className="h-10 w-10 shrink-0 drop-shadow-[0_5px_10px_rgba(30,95,190,0.18)]" />
      <span className={`font-semibold tracking-tight ${compact ? "text-lg" : "text-xl"}`}>PulseGuard</span>
    </Link>
  );
}
