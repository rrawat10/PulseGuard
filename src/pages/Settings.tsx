import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import EmergencyContactsCard from "@/components/EmergencyContactsCard";
import { Settings as SettingsIcon, User, Bell, Globe, Shield } from "lucide-react";

const Settings = () => {
  const [settings, setSettings] = useState({
    // Profile Settings
    fullName: "John Doe",
    email: "john.doe@email.com",
    age: "35",
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    emergencyAlerts: true,
    weeklyReports: true,
    
    // Device Settings
    language: "english",
    voiceGender: "female",
    
    // Privacy Settings
    shareDataWithDoctor: true,
    anonymousAnalytics: false,
    
    // Thresholds
    lowBPMThreshold: "60",
    highBPMThreshold: "100"
  });

  const handleSave = () => {
    console.log("Saving settings:", settings);
    // TODO: Implement save logic
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and device preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Profile Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={settings.fullName}
                  onChange={(e) => setSettings(prev => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={settings.age}
                  onChange={(e) => setSettings(prev => ({ ...prev, age: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Notification Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive health reports via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pushNotifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get instant alerts on your device</p>
                </div>
                <Switch
                  id="pushNotifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emergencyAlerts">Emergency Alerts</Label>
                  <p className="text-sm text-muted-foreground">Critical health alerts to emergency contacts</p>
                </div>
                <Switch
                  id="emergencyAlerts"
                  checked={settings.emergencyAlerts}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emergencyAlerts: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weeklyReports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Automatic weekly health summaries</p>
                </div>
                <Switch
                  id="weeklyReports"
                  checked={settings.weeklyReports}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, weeklyReports: checked }))}
                />
              </div>
            </div>
          </Card>

          {/* Device Settings */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Device Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language for Voice Output</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Voice Gender</Label>
                <Select
                  value={settings.voiceGender}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, voiceGender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Health Thresholds */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Health Thresholds</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lowBPM">Low BPM Alert Threshold</Label>
                <Input
                  id="lowBPM"
                  type="number"
                  value={settings.lowBPMThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, lowBPMThreshold: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">Alert when BPM falls below this value</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="highBPM">High BPM Alert Threshold</Label>
                <Input
                  id="highBPM"
                  type="number"
                  value={settings.highBPMThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, highBPMThreshold: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">Alert when BPM exceeds this value</p>
              </div>
            </div>
          </Card>

          {/* Emergency Contacts */}
          <EmergencyContactsCard />

          {/* Privacy Settings */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Privacy Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shareDataWithDoctor">Share Data with Doctor</Label>
                  <p className="text-sm text-muted-foreground">Allow automatic sharing of health reports</p>
                </div>
                <Switch
                  id="shareDataWithDoctor"
                  checked={settings.shareDataWithDoctor}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, shareDataWithDoctor: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anonymousAnalytics">Anonymous Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help improve our service with anonymous usage data</p>
                </div>
                <Switch
                  id="anonymousAnalytics"
                  checked={settings.anonymousAnalytics}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, anonymousAnalytics: checked }))}
                />
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;