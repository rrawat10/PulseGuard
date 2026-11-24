# PulseGuard - ECG & Health Tracking

## Project Description

PulseGuard is an ECG and health tracking application with pulse monitoring, emergency alerts, and health reports. Users can review readings and manage emergency contacts.

## Features

- **Real-time Pulse Monitoring**: Live tracking of heart rate and health status
- **ECG Analysis**: Integration with a hosted classifier and mappings for 77 cardiac patterns
- **User Authentication**: Secure login and registration with Supabase
- **Emergency Alerts**: Automatic alerts when abnormal readings are detected
- **Health Reports**: Daily and weekly health summaries
- **Multi-Language Audio Reports**: Text-to-speech in English, Hindi, and Punjabi (powered by Sarvam AI)
- **Doctor Integration**: Connect with healthcare providers for automated reporting
- **Emergency Contacts**: Manage emergency contact information
- **ESP32 Integration**: Firmware for collecting ECG data from an AD8232 sensor

## Getting Started

Follow these steps to run the project locally:

```sh
# Step 1: Clone the repository
git clone https://github.com/rrawat10/PulseGuard.git

# Step 2: Navigate to the project directory
cd PulseGuard

# Step 3: Install the necessary dependencies
npm ci

# Step 4: Start the development server
npm run dev
```

## Technologies Used

This project is built with:

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Real-time)
- **State Management**: TanStack Query
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Hardware**: ESP32 microcontroller with AD8232 ECG sensor
- **ML Model**: HuggingFace ECG classification model (77 cardiac patterns)
- **TTS Engine**: 
  - English: Web Speech API (browser-based)
  - Hindi/Punjabi: Sarvam AI (API-based, high-quality voices)
- **Email Service**: Resend (for doctor reports)

## Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations (Supabase)
├── lib/               # Utility functions
├── pages/             # Application pages/routes
└── utils/             # Helper utilities
```

## Database Schema

The application uses Supabase with the following main tables:
- `user_profiles` - User profile information
- `pulse_readings` - Real-time pulse data
- `ecg_readings` - Raw ECG signal data (500 samples/batch)
- `disease_predictions` - ML model predictions with confidence scores
- `emergency_contacts` - Emergency contact information
- `doctor_details` - Healthcare provider information
- `health_reports` - Generated health reports
- `audio_reports` - Multi-language audio report metadata
- `emergency_alerts` - System alerts and notifications

## Environment Setup

### Required API Keys

1. **Supabase** (Backend & Database)
   - The frontend currently has an existing Supabase URL and publishable key in `src/integrations/supabase/client.ts`. Replace these with your own project configuration before using authentication or stored data.

2. **Sarvam AI** (Hindi/Punjabi TTS)
   - Get from: https://dashboard.sarvam.ai/
   - Set in Supabase secrets: `SARVAM_API_KEY`
   - See `GET_SARVAM_API_KEY.md` for detailed instructions

3. **HuggingFace** (ML Model)
   - Set in Supabase secrets: `HF_TOKEN`
   - The inference function calls an external hosted model; trained weights are not included in this repository.

4. **Resend** (Email Service)
   - Set in Supabase secrets: `RESEND_API_KEY`

For complete setup instructions, see:
- `SARVAM_AI_SETUP.md` - Sarvam AI TTS integration guide
- `supabase/ENV_SETUP.md` - All environment variables
- `ARCHITECTURE.md` - System architecture details
- `DATA_FLOW.md` - Data flow documentation

## Deployment

The application can be deployed to various platforms:
- Vercel
- Netlify
- Firebase Hosting
- Or any static hosting service

