import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ExternalLink } from "lucide-react";

export function LanguageVoiceGuide() {
  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-3 text-sm">
          <h4 className="font-semibold">Enable Hindi/Punjabi Voice Support</h4>
          
          <div className="space-y-2">
            <div>
              <strong className="text-blue-600">Windows (Chrome/Edge):</strong>
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li>Go to Settings → Time & Language → Language & Region</li>
                <li>Click "Add a language"</li>
                <li>Search for "Hindi" or "Punjabi" and install</li>
                <li>Download language pack and speech recognition</li>
                <li>Restart browser</li>
              </ol>
            </div>

            <div>
              <strong className="text-green-600">macOS/iOS (Safari):</strong>
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li>Go to System Settings → Accessibility → Spoken Content</li>
                <li>Click "System Voice" → "Manage Voices"</li>
                <li>Download Hindi or Punjabi voices (look for Lekha, Neel for Hindi)</li>
                <li>Restart browser</li>
              </ol>
            </div>

            <div>
              <strong className="text-orange-600">Android (Chrome):</strong>
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li>Open Settings → System → Languages & Input</li>
                <li>Tap "Text-to-speech output"</li>
                <li>Install Google TTS and download Hindi/Punjabi</li>
              </ol>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-500 mt-2">
              <AlertDescription className="text-xs">
                <strong>Alternative:</strong> If native voices aren't available, the system will use English voice 
                to read the text. While not ideal, the text will still be in the correct language on screen.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </Card>
  );
}
