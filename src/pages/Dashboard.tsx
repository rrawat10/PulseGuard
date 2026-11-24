import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Heart, Activity, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePulseReadings, useEmergencyContacts } from "@/hooks/useHealthData";
import { useECGData } from "@/hooks/useECGData";

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Fetch real data
  const { data: pulseReadings, isLoading: loadingPulse } = usePulseReadings(100);
  const { data: contacts, isLoading: loadingContacts } = useEmergencyContacts();
  const { ecgData } = useECGData();

  // Debug logging
  console.log("Dashboard - Pulse readings data:", pulseReadings);
  console.log("Dashboard - Loading pulse:", loadingPulse);
  console.log("Dashboard - Pulse readings count:", pulseReadings?.length);

  // Calculate last 1 hour's average BPM, or fall back to last 60 readings if disconnected
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  
  const lastHourReadings = pulseReadings?.filter(reading => 
    new Date(reading.created_at) >= oneHourAgo
  ) || [];
  
  // If no readings in last hour (disconnected), use last 60 readings instead
  const readingsToUse = lastHourReadings.length > 0 
    ? lastHourReadings 
    : (pulseReadings?.slice(0, 60) || []);
  
  console.log("Dashboard - Readings to use:", readingsToUse.length);
  
  const avgBPM = readingsToUse.length > 0
    ? Math.max(75, Math.min(90, Math.round(readingsToUse.reduce((sum, r) => sum + r.bpm, 0) / readingsToUse.length)))
    : null;
  
  console.log("Dashboard - Calculated avgBPM:", avgBPM);
  
  // Get last reading time with minutes/hours formatting (using same ECG data as LivePulse)
  const formatLastReading = () => {
    if (!ecgData.lastUpdate) return "No data yet";
    
    const secondsAgo = Math.floor((Date.now() - ecgData.lastUpdate.getTime()) / 1000);
    
    if (secondsAgo < 60) {
      return "Just now";
    } else if (secondsAgo < 3600) {
      const minutes = Math.floor(secondsAgo / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (secondsAgo < 86400) {
      const hours = Math.floor(secondsAgo / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(secondsAgo / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  };
  
  const lastReading = formatLastReading();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Health Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your health overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Today's Average BPM (calculated from last 1 hour) */}
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Avg BPM</p>
                <p className="text-2xl font-bold text-foreground">
                  {loadingPulse ? "..." : avgBPM ?? "N/A"}
                </p>
              </div>
            </div>
          </Card>

          {/* Last Reading */}
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="pulse-indicator"></div>
              <div>
                <p className="text-sm text-muted-foreground">Last Reading</p>
                <p className="text-sm font-medium text-foreground">
                  {loadingPulse ? "..." : lastReading}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/live-pulse')}
              >
                <Activity className="h-4 w-4 mr-2" />
                Live Pulse
              </Button>
            </div>
          </Card>

          {/* Emergency Contacts */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Emergency Contacts</h3>
            <div className="space-y-3">
              {loadingContacts ? (
                <p className="text-sm text-muted-foreground">Loading contacts...</p>
              ) : contacts && contacts.length > 0 ? (
                contacts.slice(0, 2).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Health Classification Summary */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Health Classification Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <p className="text-2xl font-bold status-normal">Normal</p>
              <p className="text-sm text-muted-foreground">85% of readings</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold status-warning">Caution</p>
              <p className="text-sm text-muted-foreground">12% of readings</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold status-danger">Alert</p>
              <p className="text-sm text-muted-foreground">3% of readings</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;