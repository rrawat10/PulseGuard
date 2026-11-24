import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", age: "", gender: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signUp(form.email.trim(), form.password, {
        full_name: form.fullName.trim(),
        age: Number(form.age),
        gender: form.gender,
      });
      if (!error) navigate("/dashboard", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <p className="eyebrow">Get started</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Set up your health workspace in a few simple steps.</p>
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" autoComplete="name" placeholder="Your name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required className="h-11 rounded-xl" /></div>
        <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => update("email", event.target.value)} required className="h-11 rounded-xl" /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} required className="h-11 rounded-xl" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="age">Age</Label><Input id="age" type="number" min={1} max={149} placeholder="Your age" value={form.age} onChange={(event) => update("age", event.target.value)} required className="h-11 rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="gender">Gender</Label><select id="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)} required className="flex h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
        </div>
        <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl">{isLoading ? "Creating account..." : "Create account"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </AuthLayout>
  );
}
