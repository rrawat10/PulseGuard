import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    emergencyContacts: [{ name: "", phone: "", relation: "" }],
    doctorName: "",
    doctorSpecialization: "",
    doctorEmail: "",
    enableEmailReports: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: "", phone: "", relation: "" }]
    }));
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Prepare user metadata for Supabase
    const userData = {
      full_name: formData.fullName,
      age: parseInt(formData.age),
      gender: formData.gender,
      emergency_contacts: formData.emergencyContacts,
      doctor_name: formData.doctorName,
      doctor_specialization: formData.doctorSpecialization,
      doctor_email: formData.doctorEmail,
      enable_email_reports: formData.enableEmailReports,
    };

    const { error } = await signUp(formData.email, formData.password, userData);
    
    if (!error) {
      // Successfully signed up, navigate to login or dashboard
      navigate("/login");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Heart className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-muted-foreground">Join Fit Beat for comprehensive health tracking</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Your age"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Emergency Contacts</h3>
                <Button type="button" variant="outline" size="sm" onClick={addEmergencyContact}>
                  Add Contact
                </Button>
              </div>

              {formData.emergencyContacts.map((contact, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relation</Label>
                    <Input
                      value={contact.relation}
                      onChange={(e) => updateEmergencyContact(index, 'relation', e.target.value)}
                      placeholder="Relationship"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Doctor Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Doctor Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctorName">Doctor Name</Label>
                  <Input
                    id="doctorName"
                    value={formData.doctorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                    placeholder="Doctor's name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctorSpecialization">Specialization</Label>
                  <Input
                    id="doctorSpecialization"
                    value={formData.doctorSpecialization}
                    onChange={(e) => setFormData(prev => ({ ...prev, doctorSpecialization: e.target.value }))}
                    placeholder="Doctor's specialization"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="doctorEmail">Doctor Email</Label>
                  <Input
                    id="doctorEmail"
                    type="email"
                    value={formData.doctorEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, doctorEmail: e.target.value }))}
                    placeholder="Doctor's email"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailReports"
                  checked={formData.enableEmailReports}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableEmailReports: checked as boolean }))}
                />
                <Label htmlFor="emailReports">
                  Enable daily/weekly email reports to doctor
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;