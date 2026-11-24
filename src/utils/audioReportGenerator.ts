import { AudioReportData } from './audioReportDataAggregator';

export interface ReportScript {
  english: string;
  hindi: string;
  punjabi: string;
}

export const LEGAL_DISCLAIMER = {
  short: "Not for medical diagnosis. Consult healthcare professionals for medical advice.",
  
  full: `
IMPORTANT MEDICAL DISCLAIMER:

This wellness monitoring device and its associated reports are NOT medical devices
and are NOT intended to diagnose, treat, cure, or prevent any disease or medical condition.

The device is intended for:
- Personal wellness monitoring
- General health awareness
- Preventative health tracking
- Fitness and lifestyle tracking

The device is NOT intended for:
- Medical diagnosis
- Treatment decisions
- Emergency medical situations
- Replacing professional medical care

ALWAYS seek the advice of your physician or other qualified health provider with any
questions you may have regarding a medical condition. Never disregard professional
medical advice or delay in seeking it because of something you have read or heard
from this device.

In case of emergency, call your local emergency number immediately.
  `
};

function getWellnessRecommendations(healthStatus: string): string {
  const recommendations: Record<string, string> = {
    excellent: `
      Your readings look consistent today. Continue maintaining your healthy lifestyle.
      Regular physical activity, adequate sleep, and stress management 
      are beneficial for overall wellness.
    `,
    
    good: `
      Your readings are generally within expected ranges. 
      Consider maintaining regular sleep patterns and moderate exercise.
      Staying hydrated and managing stress can support heart health.
    `,
    
    caution: `
      Some readings today showed variations from your typical patterns.
      Consider scheduling a routine check-up with your healthcare provider.
      In the meantime, focus on rest, hydration, and stress reduction.
    `,
    
    concerning: `
      Today's readings showed several variations from typical patterns.
      We recommend consulting with a healthcare professional to review these readings.
      Avoid strenuous activity until you've discussed these patterns with your doctor.
    `,
    
    critical: `
      Important: Multiple readings today exceeded expected thresholds.
      Please schedule a prompt consultation with your healthcare provider.
      If you experience chest pain, severe shortness of breath, or dizziness,
      seek immediate medical attention by calling emergency services.
    `
  };
  
  return recommendations[healthStatus] || recommendations.good;
}

function generateEnglishScript(data: AudioReportData): string {
  const abnormalInfo = `${data.abnormalPredictions} abnormal patterns from recent 100 predictions. `;
  
  const emergencyAlert = data.emergencyCount > 0
    ? `${data.emergencyCount} readings exceeded thresholds. Consult your doctor. `
    : '';

  return `
    Daily heart health summary for ${data.date}. 
    ${data.totalPredictions} ECG predictions recorded today. Heart rate ranged from ${data.minBPM} to ${data.maxBPM} BPM, average ${data.avgBPM} BPM. 
    ${abnormalInfo}${emergencyAlert}
    This is wellness monitoring only, not medical diagnosis. Consult healthcare professionals for medical advice.
  `.trim().replace(/\n\s+/g, ' ').replace(/\s+/g, ' ');
}

function generateHindiScript(data: AudioReportData): string {
  const abnormalInfo = `हाल के 100 में से ${data.abnormalPredictions} असामान्य पैटर्न पाए गए। `;
  
  const emergencyAlert = data.emergencyCount > 0
    ? `${data.emergencyCount} रीडिंग सीमा से अधिक थीं। डॉक्टर से परामर्श लें। `
    : '';

  return `
    ${data.date} की दैनिक हृदय स्वास्थ्य रिपोर्ट। 
    ${data.totalPredictions} ईसीजी रिकॉर्ड की गई। हृदय गति ${data.minBPM} से ${data.maxBPM} बीपीएम, औसत ${data.avgBPM} बीपीएम। 
    ${abnormalInfo}${emergencyAlert}
    यह केवल स्वास्थ्य निगरानी है, चिकित्सा निदान नहीं। चिकित्सा सलाह के लिए स्वास्थ्य पेशेवरों से परामर्श लें।
  `.trim().replace(/\n\s+/g, ' ').replace(/\s+/g, ' ');
}

function generatePunjabiScript(data: AudioReportData): string {
  const abnormalInfo = `ਹਾਲ ਦੇ 100 ਵਿੱਚੋਂ ${data.abnormalPredictions} ਅਸਧਾਰਨ ਪੈਟਰਨ ਮਿਲੇ। `;
  
  const emergencyAlert = data.emergencyCount > 0
    ? `${data.emergencyCount} ਰੀਡਿੰਗਾਂ ਸੀਮਾ ਤੋਂ ਵੱਧ ਸਨ। ਡਾਕਟਰ ਨਾਲ ਸਲਾਹ ਕਰੋ। `
    : '';

  return `
    ${data.date} ਦੀ ਰੋਜ਼ਾਨਾ ਦਿਲ ਸਿਹਤ ਰਿਪੋਰਟ। 
    ${data.totalPredictions} ਈਸੀਜੀ ਰਿਕਾਰਡ ਕੀਤੀਆਂ। ਦਿਲ ਦੀ ਧੜਕਣ ${data.minBPM} ਤੋਂ ${data.maxBPM} ਬੀਪੀਐਮ, ਔਸਤ ${data.avgBPM} ਬੀਪੀਐਮ। 
    ${abnormalInfo}${emergencyAlert}
    ਇਹ ਸਿਰਫ਼ ਸਿਹਤ ਨਿਗਰਾਨੀ ਹੈ, ਡਾਕਟਰੀ ਨਿਦਾਨ ਨਹੀਂ। ਡਾਕਟਰੀ ਸਲਾਹ ਲਈ ਸਿਹਤ ਪੇਸ਼ੇਵਰਾਂ ਨਾਲ ਸਲਾਹ ਕਰੋ।
  `.trim().replace(/\n\s+/g, ' ').replace(/\s+/g, ' ');
}

export function generateReportScript(data: AudioReportData): ReportScript {
  return {
    english: generateEnglishScript(data),
    hindi: generateHindiScript(data),
    punjabi: generatePunjabiScript(data)
  };
}
