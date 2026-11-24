import { Link, useLocation } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function PublicHeader() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <Link to="/" aria-current={pathname === "/" ? "page" : undefined} className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition sm:inline-flex ${pathname === "/" ? "text-primary" : "text-slate-600 hover:bg-blue-50 hover:text-primary"}`}>Home</Link>
          <Link to="/about" aria-current={pathname === "/about" ? "page" : undefined} className={`rounded-lg px-2 py-2 text-sm font-medium transition sm:px-3 ${pathname === "/about" ? "text-primary" : "text-slate-600 hover:bg-blue-50 hover:text-primary"}`}>About</Link>
          {!user && <Link to="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-primary md:inline-flex">Sign in</Link>}
          <Button asChild size="sm" className="ml-1 h-10 rounded-lg px-4 shadow-sm sm:ml-2 sm:px-5">
            <Link to={user ? "/dashboard" : "/register"}>{user ? "Dashboard" : "Get started"}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
