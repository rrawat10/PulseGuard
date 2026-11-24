# 🚀 Quick Start: Sarvam AI TTS Integration

## 3-Minute Setup Guide

### Step 1: Get API Key (1 minute)
1. Go to https://dashboard.sarvam.ai/signin
2. Sign in with Google or Microsoft
3. Click "API Keys" → "Create New API Key"
4. Copy the key (starts with `sarvam_api_...`)

### Step 2: Set Environment Variable (1 minute)

**Option A: Supabase Dashboard**
```
1. Go to your Supabase project
2. Settings → Edge Functions → Secrets
3. Click "New Secret"
4. Name: SARVAM_API_KEY
5. Value: paste_your_key_here
6. Save
```

**Option B: Supabase CLI**
```bash
supabase secrets set SARVAM_API_KEY=your_key_here
```

### Step 3: Deploy Function (1 minute)
```bash
cd capstone
supabase functions deploy sarvam-tts
```

### Step 4: Test It! (30 seconds)
```bash
npm run dev
# Open http://localhost:8080
# Go to Reports page
# Select Hindi or Punjabi
# Click "Generate Audio Report"
# 🎉 Listen to high-quality voice!
```

---

## That's It! 🎉

Your audio reports now use:
- ✅ Sarvam AI for Hindi & Punjabi (professional voices)
- ✅ Web Speech API for English (browser-based)
- ✅ No language packs needed
- ✅ Works on all devices

---

## Need More Details?

📖 **Full Documentation**:
- `SARVAM_AI_SETUP.md` - Complete setup guide
- `GET_SARVAM_API_KEY.md` - Detailed API key instructions
- `IMPLEMENTATION_SUMMARY.md` - Technical details

🆘 **Having Issues?**
- Check `SARVAM_AI_SETUP.md` → Troubleshooting section
- Check Supabase function logs: `supabase functions logs sarvam-tts`
- Check browser console for errors

💰 **Pricing**: ~₹0.20-0.50 per report (2000 chars)

🌐 **Support**: https://docs.sarvam.ai/ | support@sarvam.ai
