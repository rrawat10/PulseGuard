# PulseGuard

PulseGuard is a web app for viewing ECG signals and running ECG classification. A user can create an account, upload a 10-second single-lead recording, view the waveform and model result, and review saved results in Reports.

## What works

- Account registration and sign-in with Supabase Auth
- Upload of CSV or TXT files containing 5,000 samples at 500 Hz
- ECG inference through the hosted Hugging Face model, called by a Supabase Edge Function
- Saved ECG readings and model results, scoped to the signed-in user
- Waveform, dashboard, report history, CSV export, profile, and emergency contact storage

The model is hosted at `https://M0hit18-my-ecg-model.hf.space/predict_ecg`. Its weights are not served from the browser or Vercel. Hardware streaming and SMS delivery are not connected to the current web flow. Model output is informational and is not a medical diagnosis.

## Run locally

```sh
git clone https://github.com/rrawat10/PulseGuard.git
cd PulseGuard
npm ci
```

Create `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Start the app with `npm run dev`. Build it with `npm run build`.

For a new Supabase project, apply the migrations in `supabase/migrations` and deploy `supabase/functions/analyze-ecg`. The Edge Function uses the project's built-in `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets. Set `HF_SPACE_URL` only if using a different model endpoint.

## ECG input

Upload one numeric sample per line or a CSV with the sample in its last column. A header row is allowed. The signal must contain exactly 5,000 samples representing 10 seconds at 500 Hz. [sample-data](sample-data/README.md) contains a real, licensed ECG recording that can be used to check the upload and inference flow.

## Stack

React, TypeScript, Vite, Tailwind CSS, Supabase Auth and Database, Supabase Edge Functions, Hugging Face model service, and Vercel.
