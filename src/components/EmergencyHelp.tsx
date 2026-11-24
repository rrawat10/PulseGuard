import { LifeBuoy, Phone, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmergencyContacts } from "@/hooks/useHealthData";

export default function EmergencyHelp() {
  const { data: contacts = [], isLoading, isError } = useEmergencyContacts();
  return (
    <section id="emergency-help" aria-labelledby="emergency-title" className="soft-panel scroll-mt-24 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><LifeBuoy className="h-6 w-6" /></div><div><p className="text-sm font-medium text-slate-500">Support within reach</p><h2 id="emergency-title" className="text-xl font-semibold text-slate-900">Emergency help</h2></div></div>
        <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/60 p-4"><p className="font-semibold text-slate-900">Need urgent help?</p><p className="mt-1 text-base leading-6 text-slate-600">Contact emergency services directly. Don't wait for an ECG result.</p><Button asChild className="mt-4 h-11 w-full rounded-xl bg-rose-600 hover:bg-rose-700"><a href="tel:112" aria-label="Call 112, emergency services in India"><Phone className="mr-2 h-4 w-4" />Call 112</a></Button><p className="mt-2 text-sm text-slate-500">Emergency services · India</p></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-slate-900">Your contacts</h3><Link to="/settings#emergency-contacts" className="text-sm font-semibold text-primary hover:underline">Manage contacts</Link></div>
        <div className="mt-3 space-y-3">
          {isLoading ? <p role="status" className="text-sm text-slate-500">Loading contacts...</p> : isError ? <p role="alert" className="text-sm text-slate-600">Contacts couldn't be loaded. Please try again.</p> : contacts.length ? contacts.map(contact => <div key={contact.id} className="flex items-center gap-3 rounded-xl border border-blue-100 p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="break-words text-base font-medium text-slate-900">{contact.name}</p><p className="break-words text-sm text-slate-500">{contact.relation} · {contact.phone}</p></div><Button asChild variant="outline" className="h-11 shrink-0 rounded-xl border-blue-200 text-primary"><a href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`} aria-label={`Call ${contact.name}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button></div>) : <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/30 p-4"><p className="text-base leading-7 text-slate-600">Add a family member or someone you trust, so their number is easy to find.</p><Link to="/settings#emergency-contacts" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Add an emergency contact</Link></div>}
        </div>
      </div>
      <p className="border-t border-blue-100 bg-slate-50/70 px-6 py-4 text-sm leading-6 text-slate-500">Call buttons open your device's dialer. Contacts are not notified automatically.</p>
    </section>
  );
}
