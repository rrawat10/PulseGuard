# Supabase Environment Variables Configuration

## Required Environment Variables

Add these to your Supabase project settings:

### Dashboard → Project Settings → Edge Functions → Secrets

1. **SARVAM_API_KEY** (for Hindi/Punjabi TTS)
   - Get your API key from: https://dashboard.sarvam.ai/
   - Sign up with Google or Microsoft account
   - Navigate to API Keys section
   - Create a new API key
   - Add to Supabase secrets:
   ```bash
   supabase secrets set SARVAM_API_KEY=your_api_key_here
   ```

2. **HF_TOKEN** (for ML model, configure if needed)
   - HuggingFace API token for ECG prediction model

3. **RESEND_API_KEY** (for email notifications, configure if needed)
   - Resend API key for doctor email reports

4. **DEVICE_API_KEY** (for ESP32 authentication, configure before using hardware)
   - Custom security key for ESP32 device authentication

## Local Development

For local testing with Supabase CLI, create `.env` file in `supabase/functions/`:

```env
SARVAM_API_KEY=your_sarvam_api_key
HF_TOKEN=your_huggingface_token
RESEND_API_KEY=your_resend_key
DEVICE_API_KEY=your_new_device_api_key
```

## Setting Secrets via Supabase CLI

```bash
# Set individual secret
supabase secrets set SARVAM_API_KEY=your_api_key_here

# Set multiple secrets from .env file
supabase secrets set --env-file ./supabase/functions/.env

# List all secrets
supabase secrets list

# Unset a secret
supabase secrets unset SARVAM_API_KEY
```

## Getting Sarvam AI API Key

1. Visit https://dashboard.sarvam.ai/signin
2. Sign in with Google or Microsoft account
3. Navigate to API Keys section in dashboard
4. Click "Create New API Key"
5. Copy the generated key
6. Add it to Supabase secrets

## Sarvam AI TTS Details

- **Endpoint**: `https://api.sarvam.ai/text-to-speech`
- **Model**: `bulbul:v2` (supports 10+ Indian languages)
- **Languages Supported**: 
  - Hindi (`hi-IN`) - Speaker: `meera`
  - Punjabi (`pa-IN`) - Speaker: `anushka`
- **Sample Rate**: 22050 Hz
- **Output Format**: Base64 encoded audio (WAV/MP3)
- **Pricing**: Check https://www.sarvam.ai/pricing

## Security Notes

⚠️ **NEVER commit `.env` files or API keys to Git!**
- Add `.env` to `.gitignore`
- Use Supabase secrets for production
- Rotate keys regularly
- Use different keys for dev/staging/production
