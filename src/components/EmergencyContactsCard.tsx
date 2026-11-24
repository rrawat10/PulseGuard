import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useEmergencyContacts } from "@/hooks/useHealthData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Contact { id?: string; name: string; phone: string; relation: string }

export default function EmergencyContactsCard() {
  const { user } = useAuth();
  const { data: savedContacts } = useEmergencyContacts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (savedContacts) setContacts(savedContacts.map(({ id, name, phone, relation }) => ({ id, name, phone, relation })));
  }, [savedContacts]);

  const update = (index: number, field: "name" | "phone" | "relation", value: string) => {
    setContacts((current) => current.map((contact, i) => i === index ? { ...contact, [field]: value } : contact));
  };

  const save = async () => {
    if (!user) return;
    if (contacts.some(({ name, phone }) => !name.trim() || !/^\+?[0-9 ()-]{7,20}$/.test(phone.trim()))) {
      toast({ title: "Check your contacts", description: "Each contact needs a name and a valid phone number.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const remainingIds = contacts.map((contact) => contact.id).filter(Boolean) as string[];
      for (const saved of savedContacts || []) {
        if (!remainingIds.includes(saved.id)) {
          const { error } = await supabase.from("emergency_contacts").delete().eq("id", saved.id).eq("user_id", user.id);
          if (error) throw error;
        }
      }
      for (const contact of contacts) {
        const values = { name: contact.name.trim(), phone: contact.phone.trim(), relation: contact.relation.trim() || "Contact" };
        const result = contact.id
          ? await supabase.from("emergency_contacts").update(values).eq("id", contact.id).eq("user_id", user.id)
          : await supabase.from("emergency_contacts").insert({ ...values, user_id: user.id });
        if (result.error) throw result.error;
      }
      await queryClient.invalidateQueries({ queryKey: ["emergency-contacts", user.id] });
      toast({ title: "Contacts saved" });
    } catch (error) {
      toast({ title: "Could not save contacts", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="soft-panel p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Phone className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Emergency contacts</h2><p className="text-sm text-slate-500">Keep important phone numbers with your account.</p></div></div>
      <div className="space-y-4">
        {contacts.map((contact, index) => <div key={contact.id || `new-${index}`} className="rounded-xl border border-blue-100 bg-slate-50/40 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor={`contact-name-${index}`}>Name</Label><Input id={`contact-name-${index}`} value={contact.name} onChange={(event) => update(index, "name", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor={`contact-phone-${index}`}>Phone</Label><Input id={`contact-phone-${index}`} type="tel" placeholder="+91 98765 43210" value={contact.phone} onChange={(event) => update(index, "phone", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor={`contact-relation-${index}`}>Relationship</Label><Input id={`contact-relation-${index}`} value={contact.relation} onChange={(event) => update(index, "relation", event.target.value)} /></div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setContacts((current) => current.filter((_, i) => i !== index))} className="mt-3 text-slate-500"><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
        </div>)}
        {!contacts.length && <p className="text-sm text-slate-500">No contacts saved yet.</p>}
        <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => setContacts((current) => [...current, { name: "", phone: "", relation: "" }])} className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Add contact</Button><Button type="button" onClick={save} disabled={saving} className="rounded-xl"><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save contacts"}</Button></div>
      </div>
    </section>
  );
}
