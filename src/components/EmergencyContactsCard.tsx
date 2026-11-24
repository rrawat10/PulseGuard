import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Trash2, Plus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  relationship: string;
}

export default function EmergencyContactsCard() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: "", phone: "", relationship: "" }
  ]);
  const [testingSMS, setTestingSMS] = useState(false);

  const addContact = () => {
    setContacts([...contacts, { name: "", phone: "", relationship: "" }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const testEmergencySMS = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    setTestingSMS(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-emergency-sms', {
        body: {
          type: 'test_alert',
          disease_name: 'Test Alert - System Check',
          confidence: 0.99
        }
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }
      
      console.log("SMS test result:", data);
      toast.success(data.message || "Test SMS sent! Check your phone in 1-2 minutes.");
    } catch (error) {
      console.error("Error sending test SMS:", error);
      toast.error("Failed to send test SMS: " + (error as Error).message);
    } finally {
      setTestingSMS(false);
    }
  };

  const saveContacts = async () => {
    if (!user) return;

    try {
      // Delete existing contacts
      await supabase
        .from("emergency_contacts")
        .delete()
        .eq("user_id", user.id);

      // Insert new contacts
      const validContacts = contacts.filter(c => c.name && c.phone);
      
      if (validContacts.length === 0) {
        toast.error("Please add at least one contact with name and phone");
        return;
      }

      const { error } = await supabase
        .from("emergency_contacts")
        .insert(
          validContacts.map(contact => ({
            user_id: user.id,
            name: contact.name,
            phone: contact.phone,
            relation: contact.relationship || "Emergency Contact",
          }))
        );

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }
      toast.success("Emergency contacts saved successfully!");
    } catch (error) {
      console.error("Error saving contacts:", error);
      toast.error("Failed to save emergency contacts");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Emergency Contacts (SMS Alerts)</h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Add emergency contacts who will receive SMS alerts via Twilio when abnormal ECG is detected.
      </p>

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="Contact Name"
                  value={contact.name}
                  onChange={(e) => updateContact(index, "name", e.target.value)}
                />
              </div>
              
              <div>
                <Label>Relationship</Label>
                <Input
                  placeholder="Mother, Father, Spouse"
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, "relationship", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Phone Number (with country code)</Label>
              <Input
                placeholder="+919876543210 or 9876543210"
                value={contact.phone}
                onChange={(e) => updateContact(index, "phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter with +91 for India, +1 for US. If no country code, defaults to +91.
              </p>
            </div>

            {contacts.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeContact(index)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        ))}

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={addContact}>
            <Plus className="w-4 h-4 mr-2" />
            Add Another Contact
          </Button>
          
          <Button onClick={saveContacts}>
            Save Emergency Contacts
          </Button>

          <Button 
            variant="secondary" 
            onClick={testEmergencySMS}
            disabled={testingSMS}
          >
            <Send className="w-4 h-4 mr-2" />
            {testingSMS ? "Sending Test SMS..." : "Test SMS"}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Test SMS:</strong> Click "Test SMS" to send a test alert to all saved contacts via Twilio. SMS delivery is instant.
          </p>
        </div>
      </div>
    </Card>
  );
}
