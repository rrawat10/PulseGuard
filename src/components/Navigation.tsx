import { useState } from "react";
import { Activity, FileText, Info, LayoutDashboard, LogOut, Menu, Settings, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-pulse", label: "Live pulse", icon: Activity },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/about", label: "About", icon: Info },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  const navLinks = items.map(({ to, label, icon: Icon }) => (
    <Link key={to} to={to} onClick={() => setOpen(false)} aria-current={pathname === to ? "page" : undefined}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${pathname === to ? "bg-blue-50 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
      <Icon className="h-4 w-4" />{label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandMark compact />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Dashboard navigation">{navLinks}</nav>
        <div className="hidden lg:block"><Button variant="ghost" size="sm" onClick={logout} className="text-slate-600"><LogOut className="mr-2 h-4 w-4" />Sign out</Button></div>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
      </div>
      {open && <nav className="space-y-1 border-t border-blue-100 bg-white px-4 pb-4 pt-3 lg:hidden" aria-label="Mobile dashboard navigation">{navLinks}<button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600"><LogOut className="h-4 w-4" />Sign out</button></nav>}
    </header>
  );
}
