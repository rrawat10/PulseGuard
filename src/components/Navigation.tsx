import { Button } from "@/components/ui/button";
import { Heart, Activity, FileText, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { to: "/dashboard", icon: Heart, label: "Dashboard" },
    { to: "/live-pulse", icon: Activity, label: "Live Pulse" },
    { to: "/reports", icon: FileText, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <Heart className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold text-foreground">Fit Beat</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}>
              <Button
                variant={location.pathname === to ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Button>
            </Link>
          ))}
          
          <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;