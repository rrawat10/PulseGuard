# Sarvam AI TTS Integration - Complete Setup Guide

## Overview
This project now uses **Sarvam AI** for high-quality Hindi and Punjabi text-to-speech in the audio reports feature. Sarvam AI is India's leading sovereign AI platform specializing in Indian languages.

## Why Sarvam AI?
- ✅ **Native Indian Language Support**: Professional-grade Hindi and Punjabi voices
- ✅ **No Browser Dependencies**: Works regardless of installed language packs
- ✅ **High Quality Audio**: 22kHz sample rate with natural pronunciation
- ✅ **Medical Terminology**: Pre-processing for accurate health-related terms
- ✅ **Sovereign AI**: India-first technology, data stays in India

## Architecture

### TTS Engine Flow
```
English Reports → Web Speech API (Browser-based, Free)
Hindi Reports → Sarvam AI → Supabase Edge Function → High-Quality Audio
Punjabi Reports → Sarvam AI → Supabase Edge Function → High-Quality Audio
```

### Files Modified/Created
1. **`supabase/functions/sarvam-tts/index.ts`** (NEW)
   - Supabase Edge Function that calls Sarvam AI API
   - Handles authentication and error handling
   - Returns base64-encoded audio

2. **`src/utils/ttsEngine.ts`** (MODIFIED)
   - Enhanced to support dual TTS engines
   - Web Speech API for English
   - Sarvam AI API for Hindi/Punjabi
   - Audio playback from base64

3. **`src/pages/Reports.tsx`** (MODIFIED)
   - Updated UI to show Sarvam AI info
   - Removed language pack installation warnings

4. **`src/components/SarvamVoiceInfo.tsx`** (NEW)
   - Information card about Sarvam AI features
   - Voice quality details

5. **`supabase/ENV_SETUP.md`** (NEW)
   - Complete environment setup guide
   - API key configuration instructions

## Setup Instructions

### Step 1: Get Sarvam AI API Key

1. Visit https://dashboard.sarvam.ai/signin
2. Sign in with Google or Microsoft account
3. Navigate to **API Keys** section
4. Click **"Create New API Key"**
5. Copy the generated API key (save it securely!)

### Step 2: Configure Supabase Environment

#### Option A: Via Supabase Dashboard (Recommended for Production)
1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add new secret:
   - Key: `SARVAM_API_KEY`
   - Value: `your_sarvam_api_key_here`

#### Option B: Via Supabase CLI (For Local Development)
```bash
# Set the secret
supabase secrets set SARVAM_API_KEY=your_sarvam_api_key_here

# Verify it was set
supabase secrets list
```

### Step 3: Deploy Edge Function

```bash
# Navigate to project root
cd capstone

# Deploy the sarvam-tts function
supabase functions deploy sarvam-tts

# Verify deployment
supabase functions list
```

### Step 4: Test the Integration

1. Start your frontend development server:
```bash
npm run dev
```

2. Navigate to Reports page
3. Select Hindi or Punjabi language
4. Click "Generate Audio Report"
5. Audio should play with high-quality native pronunciation

## API Details

### Sarvam AI TTS Endpoint
- **URL**: `https://api.sarvam.ai/text-to-speech`
- **Method**: POST
- **Authentication**: API-Subscription-Key header

### Request Format
```json
{
  "text": "Your text in Hindi or Punjabi",
  "target_language_code": "hi-IN" or "pa-IN",
  "speaker": "meera" (Hindi) or "anushka" (Punjabi),
  "pitch": 0,
  "pace": 1.0,
  "loudness": 1.5,
  "speech_sample_rate": 22050,
  "enable_preprocessing": true,
  "model": "bulbul:v2"
}
```

### Response Format
```json
{
  "audios": ["base64_encoded_audio_string"],
  "duration": 5.2
}
```

## Speakers Available (bulbul:v2 model)

The `bulbul:v2` model supports these speakers for both Hindi and Punjabi:

### Available Speakers:
- **anushka**: Female voice (Default for both languages)
- **abhilash**: Male voice
- **manisha**: Female voice
- **vidya**: Female voice
- **arya**: Female voice
- **karun**: Male voice
- **hitesh**: Male voice

All speakers work with both Hindi (`hi-IN`) and Punjabi (`pa-IN`) languages.

## Cost & Pricing

Sarvam AI pricing is based on:
- Characters processed
- API calls made
- Check https://www.sarvam.ai/pricing for current rates

**Estimated costs for this project:**
- Average report: ~2000 characters
- Cost per report: ~₹0.20 - ₹0.50
- 1000 reports/month: ~₹200-500

## Troubleshooting

### Error: "SARVAM_API_KEY not configured"
**Solution**: Make sure you've set the environment variable in Supabase secrets

### Error: "Failed to generate audio"
**Solutions**:
1. Check API key is valid (try it in Sarvam AI dashboard)
2. Check if you have sufficient credits/quota
3. Verify Supabase Edge Function is deployed
4. Check browser console for detailed error messages

### Audio Not Playing
**Solutions**:
1. Check browser console for errors
2. Verify base64 audio data is being returned
3. Try in different browser (Chrome/Edge recommended)
4. Check browser autoplay settings

### Slow Audio Generation
**Expected**: First generation may take 3-5 seconds for Sarvam AI processing
**Optimization**: Consider caching generated audio reports in Supabase Storage

## Development vs Production

### Local Development
```bash
# Create .env file in supabase/functions/
echo "SARVAM_API_KEY=your_key" > supabase/functions/.env

# Run functions locally
supabase functions serve
```

### Production Deployment
```bash
# Set production secret
supabase secrets set SARVAM_API_KEY=your_prod_key --project-ref your-project-ref

# Deploy function
supabase functions deploy sarvam-tts
```

## Security Best Practices

1. ✅ **Never commit API keys** to Git
2. ✅ **Use different keys** for dev/staging/production
3. ✅ **Rotate keys** regularly (every 90 days)
4. ✅ **Monitor usage** in Sarvam AI dashboard
5. ✅ **Set up billing alerts** to avoid unexpected charges

## Future Enhancements

### Caching Audio Reports
```typescript
// Store generated audio in Supabase Storage
const { data, error } = await supabase.storage
  .from('audio-reports')
  .upload(`${userId}/${date}-${language}.wav`, audioBlob);
```

### Batch Processing
```typescript
// Generate multiple reports at once
const reports = await Promise.all([
  generateReport(userId, 'hindi'),
  generateReport(userId, 'punjabi')
]);
```

### Voice Customization
```typescript
// Allow users to choose voice preference
const speaker = userPreferences.hindiVoice || 'meera';
```

## Support & Resources

- **Sarvam AI Docs**: https://docs.sarvam.ai/
- **Sarvam Dashboard**: https://dashboard.sarvam.ai/
- **Discord Community**: https://discord.com/invite/5rAsykttcs
- **API Status**: https://status.sarvam.ai/

## Testing Checklist

Before deployment, verify:
- [ ] API key is set in Supabase secrets
- [ ] Edge function deploys successfully
- [ ] English TTS still works (Web Speech API)
- [ ] Hindi audio generates and plays
- [ ] Punjabi audio generates and plays
- [ ] Error handling works (invalid API key test)
- [ ] Audio quality is acceptable
- [ ] Loading states show properly
- [ ] Mobile browsers work (iOS Safari, Android Chrome)

## Contact

For issues with:
- **Sarvam AI API**: support@sarvam.ai
- **This Integration**: Open GitHub issue on project repo
- **Supabase Functions**: Check Supabase documentation

---

**Last Updated**: December 21, 2025
**Integration Version**: 1.0
**Sarvam AI Model**: bulbul:v2
