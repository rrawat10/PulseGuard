import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
//some random comment
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  
  // Add country code if missing
  // If starts with 91 and 12 digits, already has country code for India
  if (cleanNumber.startsWith("91") && cleanNumber.length === 12) {
    return `+${cleanNumber}`;
  }
  // If starts with 1 and 11 digits, already has country code for US
  else if (cleanNumber.startsWith("1") && cleanNumber.length === 11) {
    return `+${cleanNumber}`;
  }
  // If 10 digits, assume India, add +91
  else if (cleanNumber.length === 10) {
    return `+91${cleanNumber}`;
  }
  // Otherwise, return as is with +
  return `+${cleanNumber}`;
}

async function sendSMSViaTwilio(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const toNumber = formatPhoneNumber(phoneNumber);
    
    console.log(`Sending SMS to: ${toNumber}`);
    
    // Twilio REST API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    // Create Basic Auth header
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    // Prepare form data
    const formData = new URLSearchParams();
    formData.append("To", toNumber);
    formData.append("From", TWILIO_PHONE_NUMBER || "");
    formData.append("Body", message);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio API error:", error);
      return { success: false, error: error };
    }

    const data = await response.json();
    console.log("✅ SMS sent successfully:", data.sid);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    return { success: false, error: (error as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { type } = await req.json();

    // Fetch emergency contacts for this user
    const { data: contacts, error: contactsError } = await supabaseClient
      .from("emergency_contacts")
      .select("name, phone")
      .eq("user_id", user.id);

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      throw contactsError;
    }
    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No emergency contacts found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare emergency message - generic and family-friendly
    const message = `🚨 Fit Beat Alert: Your patient's heart monitor has detected unusual readings. Please check on them or contact their healthcare provider.`;

    // Send SMS to all emergency contacts
    const results = await Promise.all(
      contacts.map(async (contact) => {
        const result = await sendSMSViaTwilio(contact.phone, message);
        return { 
          name: contact.name, 
          phone: contact.phone,
          success: result.success,
          error: result.error 
        };
      })
    );

    const successCount = results.filter((r) => r.success).length;

    // Log alert in database
    await supabaseClient.from("emergency_alerts").insert({
      user_id: user.id,
      alert_type: type || "cardiac_emergency",
      message: message,
      contacts_notified: successCount,
      notification_method: "twilio_sms",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emergency SMS sent to ${successCount}/${contacts.length} contacts`,
        results: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
