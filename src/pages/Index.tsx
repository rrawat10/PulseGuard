import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-6">
          <Heart className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Fit Beat</h1>
        <p className="text-xl text-muted-foreground mb-8">Real-time healthcare monitoring system</p>
        <div className="space-x-4">
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/register">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
