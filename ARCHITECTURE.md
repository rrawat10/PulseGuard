# System Architecture Documentation

## Overview
This is a real-time ECG (Electrocardiogram) monitoring and disease prediction system that combines IoT hardware (ESP32), cloud infrastructure (Supabase), machine learning (HuggingFace), and a modern web application to provide continuous cardiac health monitoring with AI-powered disease detection.

---

## High-Level Architecture

```
┌─────────────┐
│   ESP32     │ ──HTTP──▶ Supabase Edge Functions
│  ECG Device │           (Deno Runtime)
└─────────────┘                 │
                                │
                    ┌───────────┴──────────┐
                    │                      │
                    ▼                      ▼
          ┌──────────────────┐   ┌──────────────────┐
          │  PostgreSQL DB   │   │  HuggingFace ML  │
          │  (ECG Storage)   │   │  (ECG Prediction)│
          └──────────────────┘   └──────────────────┘
                    │
                    │ Realtime Subscription
                    │
                    ▼
          ┌──────────────────┐
          │   React Web App  │
          │  (Vite + TypeScript)│
          └──────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1
- **UI Library**: Shadcn/ui (Radix UI components)
- **Styling**: TailwindCSS 3.4.11
- **State Management**: 
  - React Query (@tanstack/react-query 5.56.2) for server state
  - React Context API for authentication
- **Routing**: React Router DOM 6.26.2
- **Charts**: Recharts 2.12.7 for ECG waveform visualization
- **Forms**: React Hook Form 7.53.0 with Zod 3.23.8 validation
- **PDF Generation**: jsPDF 3.0.1 with jspdf-autotable 5.0.2
- **Icons**: Lucide React 0.462.0
- **Notifications**: Sonner 1.5.0 toast library

### Backend (Supabase)
- **Database**: PostgreSQL with Supabase
- **Backend Runtime**: Deno (for Edge Functions)
- **Authentication**: Supabase Auth with JWT
- **Real-time**: Supabase Realtime (PostgreSQL logical replication)
- **Storage**: Supabase Storage
- **Edge Functions**: 5 Deno-based serverless functions

### IoT Hardware
- **Microcontroller**: ESP32
- **ECG Sensor**: AD8232 Heart Rate Monitor
- **Communication**: WiFi (HTTP/HTTPS)
- **Sampling Rate**: 500 Hz
- **Data Format**: JSON over HTTPS

### Machine Learning
- **Platform**: HuggingFace Spaces
- **Model Type**: ECG Classification Model
- **Input**: 5000 samples (10 seconds @ 500Hz)
- **Output**: Multi-class disease predictions with SNOMED codes
- **Classes**: 77 cardiac conditions + Normal ECG

### Email Service
- **Provider**: Resend API
- **Purpose**: Send health reports to doctors

---

## Component Architecture

### 1. Frontend Application Structure

```
src/
├── components/
│   ├── Navigation.tsx           # Main navigation bar
│   ├── ProtectedRoute.tsx       # Route guard for authenticated users
│   ├── PublicRoute.tsx          # Route guard for unauthenticated users
│   └── ui/                      # Shadcn/ui components (40+ components)
│       ├── button.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       └── ...
├── hooks/
│   ├── useAuth.tsx              # Authentication context & operations
│   ├── useECGData.tsx           # ECG data fetching from Supabase
│   ├── useECGWebSocket.tsx      # WebSocket for real-time ECG streaming
│   ├── usePulseWebSocket.tsx    # WebSocket for pulse monitoring
│   └── useHealthData.tsx        # Health statistics aggregation
├── integrations/
│   └── supabase/
│       ├── client.ts            # Supabase client initialization
│       └── types.ts             # TypeScript types from database schema
├── lib/
│   └── utils.ts                 # Utility functions (cn, tailwind-merge)
├── pages/
│   ├── Index.tsx                # Landing page
│   ├── Login.tsx                # User login
│   ├── Register.tsx             # User registration
│   ├── Dashboard.tsx            # Main dashboard with health overview
│   ├── LivePulse.tsx            # Real-time ECG monitoring & visualization
│   ├── Reports.tsx              # Health reports (daily/weekly)
│   ├── Settings.tsx             # User settings & preferences
│   └── NotFound.tsx             # 404 page
├── utils/
│   └── reportGenerator.ts       # PDF/CSV report generation logic
├── App.tsx                      # Root component with routing
└── main.tsx                     # Application entry point
```

### 2. Database Schema (PostgreSQL)

#### Core Tables

**`user_profiles`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- full_name: TEXT
- age: INTEGER
- gender: TEXT
- enable_doctor_reports: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**`ecg_readings`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users, nullable for device readings)
- device_id: TEXT (for ESP32 identification)
- reading_data: JSONB { raw: number[], timestamp: string }
- duration_seconds: INTEGER
- sample_rate: INTEGER (default 500)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**`disease_predictions`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users, nullable)
- ecg_reading_id: UUID (FK to ecg_readings)
- prediction_result: JSONB { predictions: array }
- confidence_score: NUMERIC(5,4) (0.0 - 1.0)
- predicted_conditions: TEXT[] (array of disease names)
- created_at: TIMESTAMP
```

**`pulse_readings`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- bpm: INTEGER
- signal_strength: INTEGER
- health_status: TEXT (normal, risk_a, risk_b, risk_c, emergency)
- is_emergency: BOOLEAN
- created_at: TIMESTAMP
```

**`health_reports`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- report_type: TEXT (daily, weekly)
- report_date: DATE
- avg_bpm: NUMERIC
- min_bpm: INTEGER
- max_bpm: INTEGER
- total_readings: INTEGER
- emergency_count: INTEGER
- abnormal_readings: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**`emergency_contacts`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- name: TEXT
- phone: TEXT
- relation: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**`doctor_details`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- name: TEXT
- email: TEXT
- specialization: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**`emergency_alerts`**
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- pulse_reading_id: UUID (FK to pulse_readings)
- alert_type: TEXT
- message: TEXT
- is_resolved: BOOLEAN
- resolved_at: TIMESTAMP
- created_at: TIMESTAMP
```

### 3. Supabase Edge Functions (Deno)

#### **`ecg-prediction`** (Primary Processing Function)
- **Purpose**: Receives ECG data from ESP32, processes signal, predicts diseases
- **Input**: 
  - `raw_ecg_data`: number[] (500 samples per batch)
  - `timestamp`: ISO string
  - `sample_rate`: integer (default 500)
  - `device_id`: string
- **Processing Pipeline**:
  1. **API Key Validation**: Checks X-Device-API-Key header
  2. **Lead-Off Detection**: Checks for disconnected sensors
  3. **Data Buffering**: Stitches chunks to build 10-second window (5000 samples)
  4. **DSP Pipeline** (Digital Signal Processing):
     - Outlier clipping (remove spikes)
     - Median filtering (remove electrical noise)
     - Baseline wander removal (high-pass filter)
     - Moving average smoothing (low-pass filter)
     - DC offset removal
     - Global min-max normalization (-18.607 to 18.217)
  5. **ML Prediction**: Sends to HuggingFace when buffer is full
  6. **Result Interpretation**: Applies 98% confidence threshold
  7. **Database Storage**: Saves reading and prediction
- **Output**:
  - `success`: boolean
  - `graph_update`: boolean
  - `prediction`: DiseasePrediction[] or null
  - `buffer_status`: string (e.g., "2500/5000")
- **URL**: `https://<your-project-ref>.supabase.co/functions/v1/ecg-prediction`

#### **`ecg-stream`** (WebSocket for Live ECG)
- **Purpose**: Real-time ECG data streaming via WebSocket
- **Protocol**: WebSocket upgrade from HTTP
- **Messages**:
  - `auth`: Client authentication with token
  - `ecg_sample`: Single sample streaming
  - `ecg_batch`: Batch sample streaming
  - `command`: Device control commands
- **Use Case**: Live waveform display (currently less used than direct Supabase subscription)

#### **`pulse-stream`** (WebSocket for Pulse Monitoring)
- **Purpose**: Mock pulse data generation for testing
- **Broadcast Interval**: Every 2 seconds
- **Data Generated**:
  - `bpm`: 40-200 range with variation
  - `signal_strength`: 70-100%
  - `health_status`: normal, risk_a, risk_b, risk_c, emergency
  - `is_emergency`: boolean flag
- **Note**: Mock implementation, will be replaced with real ESP32 data

#### **`esp32-communication`** (Device Commands)
- **Purpose**: Send commands and reports to ESP32 device
- **Capabilities**:
  - Send health reports to device display
  - Trigger emergency alerts
  - Configure device settings
  - Multi-language support (English, Spanish, French)
- **Translation**: Built-in message translation system

#### **`send-doctor-email`** (Email Notifications)
- **Purpose**: Email health reports to doctors
- **Service**: Resend API
- **Email Types**:
  - Daily health reports
  - Weekly health summaries
  - Emergency alerts
- **Template Engine**: HTML email generation with inline CSS
- **Data Sources**: Fetches from `health_reports`, `user_profiles`, `doctor_details`

### 4. ESP32 Firmware Architecture

#### Hardware Configuration
```cpp
#define SAMPLE_RATE     500   // Hz
#define BATCH_SIZE      500   // Samples per batch (1 second)
#define ECG_PIN         36    // ADC pin (VP)
#define LO_PLUS_PIN     34    // Lead-off detection positive
#define LO_MINUS_PIN    35    // Lead-off detection negative
```

#### Main Loop Flow
```
1. Precise Timer → Every 2ms (500Hz)
2. Check Lead-Off → Detect disconnected electrodes
3. Read ADC → Get raw ECG value (0-4095)
4. Buffer Data → Store in 500-sample array
5. Upload Batch → Every 1 second via HTTPS POST
6. Reset Buffer → Prepare for next second
```

#### Data Transmission
- **Protocol**: HTTPS POST (TLS/SSL)
- **Endpoint**: Supabase Edge Function
- **Payload**: JSON with manual string building (memory efficient)
- **Authentication**: Two-layer security
  - Supabase Anon Key (Bearer token)
  - Custom Device API Key (X-Device-API-Key header)
- **Timeout Handling**: 10s for normal, 30s when prediction expected
- **Upload Lock**: Prevents overlapping requests

#### Memory Optimization
- Raw JSON string construction (no ArduinoJson overhead)
- Integer buffer storage (not float)
- Single HTTP client reuse
- Insecure SSL (speed optimization for demo)

---

## Security Architecture

### 1. Authentication Flow
```
User Registration/Login
    ↓
Supabase Auth (JWT)
    ↓
Session stored in localStorage
    ↓
Auto-refresh token (Supabase SDK)
    ↓
Row Level Security (RLS) enforced
```

### 2. Row Level Security (RLS) Policies

**User Data Isolation**
- Users can only view/create their own records
- Service role has full access (for edge functions)
- Device readings must be associated with a user before they appear in that user's dashboard

**Example Policy**:
```sql
CREATE POLICY "Users can view their own ECG readings" 
ON public.ecg_readings
FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### 3. API Key Security
- **Supabase Anon Key**: Public (client-side), RLS enforced
- **Supabase Service Role Key**: Private (server-side), full access
- **Device API Key**: Custom secret (ESP32), validated in edge function
- **HuggingFace Token**: Optional, for private model access
- **Resend API Key**: Private (server-side), for email sending

### 4. CORS Configuration
All edge functions have CORS headers:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-api-key",
};
```

---

## Machine Learning Pipeline

### Model Details
- **Model Location**: HuggingFace Space (M0hit18/my-ecg-model)
- **Endpoint**: `https://M0hit18-my-ecg-model.hf.space/predict_ecg`
- **Input Requirements**:
  - Exactly 5000 samples
  - Normalized with global scaling: (value - GLOBAL_MIN) / (GLOBAL_MAX - GLOBAL_MIN)
  - GLOBAL_MIN = -18.607, GLOBAL_MAX = 18.217
- **Output Format**:
  ```json
  {
    "predictions": [0.001, 0.002, ...], // 77 probabilities
    "class_id": 12,
    "label": "Atrial Fibrillation",
    "confidence": 0.987
  }
  ```

### Disease Classification (77 Classes)
- **SNOMED Codes**: Uses standardized medical terminology
- **Conditions Include**:
  - Arrhythmias: AFib, AFlutter, VTach, SVT, Bradycardia, Tachycardia
  - Conduction Blocks: RBBB, LBBB, AV Blocks (1st, 2nd, 3rd degree)
  - Ischemia/Infarction: MI, ST elevation, ST depression
  - Structural: LVH, RVH, Atrial enlargement
  - Other: Paced rhythm, Fusion beats, Prolonged QT, etc.

### Prediction Thresholds
- **High Confidence**: ≥98% triggers disease alert
- **Below Threshold**: Returns "Normal ECG"
- **Single Prediction**: Only top prediction returned (avoids confusion)

### Signal Processing (DSP)
The edge function includes a complete DSP pipeline:
1. **Outlier Clipping**: Removes top/bottom 0.5% of values
2. **Median Filter**: 3-sample window to remove spikes
3. **Baseline Wander Removal**: 250-sample moving average subtraction
4. **Smoothing**: 5-sample moving average (low-pass filter)
5. **DC Offset Removal**: Subtract mean
6. **Global Normalization**: Scale to training range

---

## Real-Time Data Flow

### Supabase Realtime Subscriptions
The frontend uses PostgreSQL logical replication for live updates:

```typescript
// Subscribe to new ECG readings
supabase
  .channel('ecg_readings_channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'ecg_readings' },
    (payload) => {
      // Update UI with new ECG data
    }
  )
  .subscribe();
```

### WebSocket Architecture (Alternative)
- **Connection**: WSS upgrade from HTTPS
- **Authentication**: Token sent in first message
- **Ping/Pong**: Keep-alive mechanism
- **Auto-Reconnect**: Frontend handles disconnections

---

## Deployment Architecture

### Frontend Hosting
- **Platform**: Vercel (likely, based on vercel.json presence)
- **Build Command**: `vite build`
- **Output Directory**: `dist/`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Backend Hosting
- **Supabase Project**: Hosted PostgreSQL + Edge Functions
- **Edge Function Runtime**: Deno on Supabase infrastructure
- **Database**: PostgreSQL 15+ with pgvector extension

### ESP32 Deployment
- **Firmware Upload**: Arduino IDE or PlatformIO
- **OTA Updates**: Not implemented (future enhancement)
- **Configuration**: Hardcoded WiFi credentials and API keys

---

## Scalability Considerations

### Current Limitations
- **ESP32 Upload Rate**: 1 batch/second = ~500 samples/sec
- **Prediction Rate**: 1 prediction per 10 seconds (5000 samples)
- **WebSocket Connections**: Limited by Supabase Edge Function quotas
- **Database Storage**: Growing ECG data (500 samples/sec = ~43MB/day per device)

### Potential Improvements
1. **Data Compression**: Use binary encoding instead of JSON
2. **Batch Processing**: Queue predictions for multiple users
3. **Edge Computing**: Run lightweight models on ESP32
4. **Data Retention Policy**: Archive old ECG data to cold storage
5. **CDN Caching**: Cache static reports and summaries

---

## Monitoring & Observability

### Logging
- **ESP32**: Serial monitor (115200 baud)
- **Edge Functions**: Supabase function logs
- **Frontend**: Browser console + toast notifications

### Error Handling
- **ESP32**: Upload timeout detection, retry logic
- **Edge Functions**: Try-catch with error responses
- **Frontend**: Toast notifications for user-facing errors

### Health Checks
- **Lead-Off Detection**: ESP32 monitors electrode connection
- **Buffer Status**: Tracks sample accumulation progress
- **Connection Status**: WiFi status indicators

---

## Libraries & Dependencies

### Frontend Dependencies
```json
{
  "UI Framework": "React 18.3.1",
  "UI Components": "Radix UI (40+ components)",
  "Styling": "TailwindCSS 3.4.11",
  "State Management": "@tanstack/react-query 5.56.2",
  "Routing": "react-router-dom 6.26.2",
  "Forms": "react-hook-form 7.53.0 + zod 3.23.8",
  "Charts": "recharts 2.12.7",
  "PDF": "jspdf 3.0.1 + jspdf-autotable 5.0.2",
  "Backend": "@supabase/supabase-js 2.53.0",
  "Icons": "lucide-react 0.462.0",
  "Utilities": "date-fns 3.6.0, clsx 2.1.1"
}
```

### Backend Dependencies (Deno)
```typescript
- std@0.168.0/http/server.ts  // HTTP server
- @supabase/supabase-js@2      // Supabase client
- resend@2.0.0                 // Email service
```

### ESP32 Libraries
```cpp
#include <WiFi.h>              // WiFi connectivity
#include <HTTPClient.h>         // HTTP requests
#include <WiFiClientSecure.h>   // HTTPS/TLS
```

---

## Configuration Files

### `components.json` (Shadcn UI)
Defines UI component configuration for code generation

### `tailwind.config.ts`
- Custom color schemes
- Animation utilities
- Typography plugin

### `tsconfig.json`
- Strict TypeScript mode
- Path aliases (@/ → src/)
- React JSX support

### `vite.config.ts`
- React SWC plugin for fast compilation
- Path resolution
- Dev server on port 8080

### `vercel.json`
Deployment configuration for Vercel hosting

### `supabase/config.toml`
Supabase local development configuration

---

## Development Workflow

### Local Development
```bash
# Frontend
npm run dev              # Start Vite dev server (localhost:8080)
npm run build           # Production build
npm run preview         # Preview production build

# Supabase (local)
supabase start          # Start local Supabase
supabase functions serve # Serve edge functions locally
```

### ESP32 Development
```bash
1. Configure WiFi credentials in .ino file
2. Set Supabase URL and keys
3. Upload via Arduino IDE (ESP32 Dev Module board)
4. Monitor Serial output at 115200 baud
```

---

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native version for iOS/Android
2. **Offline Mode**: Local ECG storage when internet unavailable
3. **Multi-Device**: Support multiple ESP32 devices per user
4. **Advanced Analytics**: Trend analysis, HRV metrics
5. **Telemedicine**: Video consultations with doctors
6. **Wearable Integration**: Sync with Apple Watch, Fitbit
7. **AI Chatbot**: Health Q&A with LLM integration

### Infrastructure Improvements
1. **Redis Caching**: Cache predictions and reports
2. **Message Queue**: RabbitMQ for async processing
3. **Load Balancer**: Handle multiple ESP32 devices
4. **Monitoring**: Grafana + Prometheus for metrics
5. **CI/CD**: GitHub Actions for automated deployment

---

## Conclusion

This system represents a complete end-to-end IoT health monitoring solution, combining:
- **Hardware**: ESP32 with ECG sensor
- **Edge Computing**: Signal processing in Supabase Edge Functions
- **Machine Learning**: HuggingFace hosted model
- **Modern Web**: React + TypeScript + Supabase
- **Real-time**: WebSocket and PostgreSQL subscriptions
- **Healthcare Integration**: SNOMED codes, doctor notifications

The architecture prioritizes real-time performance, data accuracy, and user safety while maintaining scalability and maintainability.
