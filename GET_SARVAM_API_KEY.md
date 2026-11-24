# 🔑 Where to Find Your Sarvam AI API Key

## Quick Answer
**Get your API key here**: https://dashboard.sarvam.ai/

## Step-by-Step Instructions

### 1. Sign Up / Log In
- Go to https://dashboard.sarvam.ai/signin
- Choose sign-in method:
  - **Google** (Recommended)
  - **Microsoft**

### 2. Navigate to API Keys
After logging in:
1. Look for **"API Keys"** in the left sidebar
2. Or go directly to: https://dashboard.sarvam.ai/api-keys

### 3. Create New Key
1. Click **"Create New API Key"** button
2. Give it a name (e.g., "ECG Health Monitor - Production")
3. Click **"Generate"**
4. **IMPORTANT**: Copy the key immediately - you won't see it again!

### 4. Secure Your Key
```bash
# Example key format (NOT A REAL KEY):
sarvam_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Tips**:
- ✅ Store in password manager
- ✅ Never commit to Git
- ✅ Use environment variables
- ❌ Don't share in screenshots
- ❌ Don't post in public forums

## Add to Your Project

### For Supabase (Production)
```bash
# Via CLI
supabase secrets set SARVAM_API_KEY=your_key_here

# Or via Dashboard
# Project Settings → Edge Functions → Secrets → Add Secret
```

### For Local Development
```bash
# Create .env file in supabase/functions/
echo "SARVAM_API_KEY=your_key_here" > supabase/functions/.env
```

## Verify It Works

Test your API key:
```bash
curl -X POST https://api.sarvam.ai/text-to-speech \
  -H "Content-Type: application/json" \
  -H "API-Subscription-Key: your_key_here" \
  -d '{
    "text": "नमस्ते",
    "target_language_code": "hi-IN",
    "speaker": "meera",
    "model": "bulbul:v2"
  }'
```

## Troubleshooting

### Can't Find API Keys Section?
- Clear browser cache
- Try different browser
- Check you're logged in with correct account
- Contact Sarvam support: support@sarvam.ai

### API Key Not Working?
1. Check if copied completely (no spaces)
2. Verify key hasn't expired
3. Check billing/credits in dashboard
4. Regenerate new key if needed

### Need Help?
- **Sarvam AI Docs**: https://docs.sarvam.ai/
- **Discord Community**: https://discord.com/invite/5rAsykttcs
- **Email Support**: support@sarvam.ai

## Free Tier / Pricing

Check current pricing at: https://www.sarvam.ai/pricing

Typically includes:
- Free tier with limited credits
- Pay-as-you-go pricing
- Enterprise plans available

## Important Links

| Resource | URL |
|----------|-----|
| Dashboard | https://dashboard.sarvam.ai/ |
| API Docs | https://docs.sarvam.ai/ |
| Pricing | https://www.sarvam.ai/pricing |
| Support | support@sarvam.ai |
| Discord | https://discord.com/invite/5rAsykttcs |

---

**Pro Tip**: Set up billing alerts in the Sarvam dashboard to avoid unexpected charges!
