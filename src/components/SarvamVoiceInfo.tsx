import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Info } from "lucide-react";

export function SarvamVoiceInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          High-Quality Voice Support Enabled
        </CardTitle>
        <CardDescription>
          Hindi and Punjabi audio reports are powered by Sarvam AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Good news!</strong> Hindi and Punjabi text-to-speech now uses <strong>Sarvam AI</strong>, 
            India's premier AI platform for Indian languages. You'll get natural, high-quality voice output 
            without needing to install any language packs.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">✨ What's included:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li><strong>Hindi (हिंदी):</strong> Natural Devanagari script pronunciation with professional voice quality</li>
            <li><strong>Punjabi (ਪੰਜਾਬੀ):</strong> Authentic Gurmukhi script pronunciation with regional accents</li>
            <li><strong>English:</strong> Browser-based text-to-speech (works in all modern browsers)</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">🔊 Voice Quality:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li>22kHz sample rate for clear audio</li>
            <li>Native speaker pronunciation</li>
            <li>Proper intonation and rhythm for Indian languages</li>
            <li>Pre-processing for medical terminology</li>
          </ul>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Note:</strong> Audio generation may take a few seconds as we generate high-quality 
            voice recordings using Sarvam AI's advanced speech synthesis technology.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
