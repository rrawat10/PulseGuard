import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, UserRound } from "lucide-react";
import Navigation from "@/components/Navigation";
import EmergencyContactsCard from "@/components/EmergencyContactsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useHealthData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("english");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setAge(String(profile.age));
    setGender(profile.gender);
    setLanguage(profile.language);
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    const parsedAge = Number(age);
    if (!name.trim() || !Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 149 || !gender) {
      toast({ title: "Check your details", description: "Enter a name, valid age, and gender.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      full_name: name.trim(),
      age: parsedAge,
      gender,
      language,
      enable_doctor_reports: profile?.enable_doctor_reports ?? false,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Could not save profile", description: error.message, variant: "destructive" });
    else {
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      toast({ title: "Profile saved", description: "Your details are up to date." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="page-container max-w-5xl">
        <div className="mb-8"><p className="eyebrow">Your account</p><h1 className="page-title mt-2">Settings</h1><p className="page-subtitle">Keep your profile and contacts up to date.</p></div>
        <div className="space-y-6">
          <section className="soft-panel p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><UserRound className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Profile</h2><p className="text-sm text-slate-500">Personal details for your account</p></div></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={user?.email || ""} readOnly className="h-11 rounded-xl bg-slate-50" /></div>
              <div className="space-y-2"><Label htmlFor="age">Age</Label><Input id="age" type="number" min={1} max={149} value={age} onChange={(event) => setAge(event.target.value)} className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label htmlFor="gender">Gender</Label><select id="gender" value={gender} onChange={(event) => setGender(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              <div className="space-y-2"><Label htmlFor="language">Language</Label><select id="language" value={language} onChange={(event) => setLanguage(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"><option value="english">English</option><option value="hindi">Hindi</option></select></div>
            </div>
            <div className="mt-7"><Button onClick={saveProfile} disabled={saving} className="h-11 rounded-xl"><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save profile"}</Button></div>
          </section>
          <EmergencyContactsCard />
        </div>
      </main>
    </div>
  );
}
