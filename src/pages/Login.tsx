import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (!error) navigate("/dashboard", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Sign in to PulseGuard</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Your health overview is ready when you are.</p>
      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 rounded-xl bg-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11 rounded-xl bg-white" />
        </div>
        <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl">{isLoading ? "Signing in..." : "Sign in"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">New to PulseGuard? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link></p>
    </AuthLayout>
  );
}
