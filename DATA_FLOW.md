# Data Flow Documentation

## Overview
This document details the complete data flow through the ECG monitoring system, from sensor reading on the ESP32 device through cloud processing, storage, and visualization on the web application.

---

## 1. ECG Data Capture & Transmission Flow

### 1.1 Hardware Data Acquisition (ESP32)

```
┌─────────────────────────────────────────────────────────────┐
│                        ESP32 Device                         │
│                                                             │
│  ┌──────────┐                                              │
│  │  AD8232  │  ──analog──▶  ADC Pin 36 (VP)               │
│  │ ECG Chip │                   │                          │
│  └──────────┘                   │                          │
│       │                         │                          │
│   Lead-Off Detection        Read Value                     │
│   (Pins 34, 35)             (0-4095)                       │
│       │                         │                          │
│       ▼                         ▼                          │
│  Digital Read            Precise Timer                     │
│  (Every 2ms)             (500 Hz sampling)                 │
│       │                         │                          │
│       └──────────┬──────────────┘                          │
│                  ▼                                          │
│          Is Lead Connected?                                │
│             │         │                                     │
│            NO        YES                                    │
│             │         │                                     │
│             ▼         ▼                                     │
│        Store 0    Store Raw Value                          │
│             │         │                                     │
│             └────┬────┘                                     │
│                  ▼                                          │
│          Buffer[500 samples]                               │
│          (1 second of data)                                │
│                  │                                          │
│                  ▼                                          │
│          Buffer Full?                                      │
│                  │                                          │
│                  ▼                                          │
│          Build JSON Payload                                │
│          (Manual string construction)                       │
│                  │                                          │
│                  ▼                                          │
│      ┌───────────────────────────┐                        │
│      │  HTTPS POST Request       │                        │
│      │  - URL: Supabase Edge     │                        │
│      │  - Headers:                │                        │
│      │    * Bearer Token         │                        │
│      │    * Device API Key       │                        │
│      │  - Body: JSON             │                        │
│      │    * device_id            │                        │
│      │    * sample_rate (500)    │                        │
│      │    * timestamp            │                        │
│      │    * raw_ecg_data[500]    │                        │
│      └───────────────────────────┘                        │
│                  │                                          │
└──────────────────┼──────────────────────────────────────────┘
                   │
                   │ WiFi (2.4 GHz)
                   ▼
            [ Internet ]
```

**Key Parameters:**
- **Sampling Rate**: 500 Hz (2ms interval)
- **Batch Size**: 500 samples per upload
- **Upload Frequency**: Every 1 second
- **Data Type**: Integer array (0-4095 ADC values)
- **JSON Size**: ~3-4 KB per batch

**ESP32 Code Flow:**
```cpp
loop() {
  currentMicros = micros();
  
  if (currentMicros - lastSampleTime >= 2000) { // 500Hz = 2ms
    lastSampleTime = currentMicros;
    
    // Check lead connection
    if (digitalRead(LO_PLUS_PIN) == 1 || digitalRead(LO_MINUS_PIN) == 1) {
      ecgBuffer[bufferIndex] = 0; // Lead off
    } else {
      ecgBuffer[bufferIndex] = analogRead(ECG_PIN); // Read ADC
    }
    
    bufferIndex++;
    
    if (bufferIndex >= 500) { // 1 second elapsed
      uploadChunkToCloud(); // Send to Supabase
      bufferIndex = 0;
    }
  }
}
```

---

## 2. Cloud Processing Flow (Supabase Edge Function)

### 2.1 Request Reception & Validation

```
┌────────────────────────────────────────────────────────────┐
│         Supabase Edge Function: ecg-prediction             │
│                    (Deno Runtime)                          │
│                                                            │
│  1. Receive HTTPS POST Request                            │
│     │                                                      │
│     ├─▶ Extract Headers                                   │
│     │   - X-Device-API-Key                                │
│     │   - Authorization (Bearer token)                    │
│     │                                                      │
│     ├─▶ Validate Device API Key                           │
│     │   ✓ Match against Deno.env.get("DEVICE_API_KEY")   │
│     │   ✗ Return 401 Unauthorized                         │
│     │                                                      │
│     └─▶ Parse JSON Body                                   │
│         - raw_ecg_data: number[] (500 samples)            │
│         - timestamp: string                               │
│         - sample_rate: number (500)                       │
│         - device_id: string                               │
│                                                            │
│  2. Lead-Off Detection                                    │
│     │                                                      │
│     ├─▶ Check if all values == 0 (flatline)              │
│     ├─▶ Check if range < 5 (too flat)                    │
│     │   maxVal - minVal < 5                               │
│     │                                                      │
│     └─▶ If Lead Off Detected:                            │
│         Return { success: false, lead_off: true }         │
│                                                            │
│  3. Store Raw Chunk in Database                           │
│     │                                                      │
│     └─▶ INSERT INTO ecg_readings                         │
│         - device_id                                       │
│         - reading_data: { raw: number[], timestamp }     │
│         - sample_rate: 500                                │
│         - duration_seconds: 1                             │
│         - created_at: NOW()                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Signal Buffering & Stitching

```
┌────────────────────────────────────────────────────────────┐
│  4. Fetch Historical Data for 10-Second Window             │
│     │                                                      │
│     ├─▶ SELECT FROM ecg_readings                         │
│     │   WHERE device_id = :device_id                      │
│     │   ORDER BY created_at DESC                          │
│     │   LIMIT 20 (safety margin)                          │
│     │                                                      │
│     ├─▶ Extract raw arrays from each row                 │
│     │   reading_data.raw                                  │
│     │                                                      │
│     └─▶ Concatenate in chronological order               │
│         combinedSignal = [...oldest, ..., ...newest]     │
│                                                            │
│  5. Check Buffer Completeness                             │
│     │                                                      │
│     ├─▶ Required: 5000 samples (10 sec × 500 Hz)        │
│     │                                                      │
│     ├─▶ If length < 5000:                                │
│     │   Return { success: true, prediction: null,        │
│     │            buffer_status: "2500/5000" }            │
│     │                                                      │
│     └─▶ If length >= 5000:                               │
│         Proceed to DSP Pipeline                           │
│         Take last 5000 samples for prediction             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Buffering Logic:**
- **Chunk Size**: 500 samples/second
- **Required for ML**: 5000 samples (10 seconds)
- **Accumulation**: Gradually builds buffer over 10 seconds
- **Sliding Window**: Always uses most recent 5000 samples

---

## 3. Digital Signal Processing (DSP) Pipeline

### 3.1 Signal Cleaning & Normalization

```
┌────────────────────────────────────────────────────────────┐
│         DSP Pipeline (preprocessSignal function)           │
│                                                            │
│  Input: rawData[5000] (10 seconds @ 500Hz)               │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 1: Outlier Clipping                    │        │
│  │ - Sort array                                 │        │
│  │ - Find 0.5th percentile (minVal)            │        │
│  │ - Find 99.5th percentile (maxVal)           │        │
│  │ - Clip all values to [minVal, maxVal]       │        │
│  │ Purpose: Remove loose wire spikes           │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 2: Median Filter (3-sample window)     │        │
│  │ - For each point, take 3 neighbors          │        │
│  │ - Sort and take median value                │        │
│  │ Purpose: Remove sharp electrical clicks     │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 3: Baseline Wander Removal              │        │
│  │ - Calculate baseline with 250-sample window  │        │
│  │ - Subtract baseline from each point          │        │
│  │ Purpose: Remove respiratory drift & floating │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 4: Smoothing (5-sample moving average) │        │
│  │ - Average 5 consecutive points               │        │
│  │ Purpose: Reduce muscle noise                │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 5: DC Offset Removal                   │        │
│  │ - Calculate mean of entire signal           │        │
│  │ - Subtract mean from each point             │        │
│  │ Purpose: Center signal at zero              │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 6: Global Min-Max Normalization        │        │
│  │ - GLOBAL_MIN = -18.607                       │        │
│  │ - GLOBAL_MAX = 18.217                        │        │
│  │ - normalized = (value - MIN) / (MAX - MIN)  │        │
│  │ - Result range: [0, 1]                      │        │
│  │ Purpose: Match training data scaling        │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ Step 7: Exact Sizing                        │        │
│  │ - If length < 5000: Pad with zeros          │        │
│  │ - If length > 5000: Take last 5000          │        │
│  │ - Guarantee exactly 5000 samples            │        │
│  └──────────────────────────────────────────────┘        │
│     │                                                      │
│     ▼                                                      │
│  Output: processedSignal[5000] (normalized, cleaned)     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**DSP Functions:**
```typescript
// 1. Outlier Clipping
clipOutliers(data: number[]): number[] {
  sorted = [...data].sort()
  minVal = sorted[floor(length * 0.005)]
  maxVal = sorted[floor(length * 0.995)]
  return data.map(v => clamp(v, minVal, maxVal))
}

// 2. Median Filter
applyMedianFilter(data: number[], windowSize: 3): number[] {
  for each point i:
    window = data[i-1 to i+1]
    result[i] = median(window)
  return result
}

// 3. Baseline Wander Removal
removeBaselineWander(data: number[]): number[] {
  baseline = applySmoothing(data, 250) // wide window
  return data.map((v, i) => v - baseline[i])
}

// 4. Smoothing (Moving Average)
applySmoothing(data: number[], windowSize: 5): number[] {
  for each point i:
    window = data[i-2 to i+2]
    result[i] = mean(window)
  return result
}

// 5. DC Offset Removal
mean = sum(signal) / length
signal = signal.map(v => v - mean)

// 6. Global Normalization
range = GLOBAL_MAX - GLOBAL_MIN
signal = signal.map(v => (v - GLOBAL_MIN) / range)
```

**Why These Steps?**
- **Outlier Clipping**: Removes artifacts from poor contact
- **Median Filter**: Preserves edges while removing noise
- **Baseline Wander**: Fixes respiration-induced drift
- **Smoothing**: Reduces high-frequency muscle noise
- **DC Offset**: Centers signal for consistent processing
- **Global Normalization**: Matches training data distribution (critical for accuracy)

---

## 4. Machine Learning Prediction Flow

### 4.1 HuggingFace API Request

```
┌────────────────────────────────────────────────────────────┐
│  Send to HuggingFace Space                                 │
│     │                                                      │
│     ├─▶ URL: https://M0hit18-my-ecg-model.hf.space/       │
│     │        predict_ecg                                   │
│     │                                                      │
│     ├─▶ Method: POST                                      │
│     │                                                      │
│     ├─▶ Headers:                                          │
│     │   - Content-Type: application/json                  │
│     │   - Authorization: Bearer {HF_TOKEN} (optional)     │
│     │                                                      │
│     └─▶ Body:                                             │
│         {                                                 │
│           "signal": [0.123, 0.456, ...], // 5000 floats  │
│           "timestamp": "2025-12-21T10:30:00Z"            │
│         }                                                 │
│                                                            │
│  HuggingFace Processing (Black Box)                       │
│     │                                                      │
│     ├─▶ Load trained model (PyTorch/TensorFlow)          │
│     ├─▶ Input tensor: [1, 5000]                          │
│     ├─▶ Forward pass through CNN/RNN                     │
│     ├─▶ Output logits: [1, 77]                           │
│     └─▶ Softmax to probabilities                         │
│                                                            │
│  HuggingFace Response                                     │
│     │                                                      │
│     └─▶ JSON:                                             │
│         {                                                 │
│           "predictions": [0.001, 0.002, ..., 0.987, ...],│
│           "class_id": 12,                                 │
│           "label": "Atrial Fibrillation",                │
│           "confidence": 0.987                            │
│         }                                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Prediction Interpretation & Thresholding

```
┌────────────────────────────────────────────────────────────┐
│  Interpret Predictions (interpretPredictions function)     │
│     │                                                      │
│     ├─▶ Check Confidence Threshold (98%)                  │
│     │   if (confidence < 0.98) {                          │
│     │     return [{ disease_name: "Normal ECG",           │
│     │               probability: 1.0, class_id: -1 }]     │
│     │   }                                                  │
│     │                                                      │
│     ├─▶ Map Class ID to Disease Name                     │
│     │   snomedCode = MLB_CLASSES[class_id]               │
│     │   diseaseName = SNOMED_TO_DISEASE[snomedCode]      │
│     │                                                      │
│     └─▶ Return Top Prediction Only                       │
│         [{                                                 │
│           disease_name: "Atrial Fibrillation",           │
│           probability: 0.987,                             │
│           class_id: 12                                    │
│         }]                                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**SNOMED Code Mapping Example:**
```typescript
MLB_CLASSES = [
  "10370003",   // Index 0
  "106068003",  // Index 1
  ...
  "164889003",  // Index 12
  ...
];

SNOMED_TO_DISEASE = {
  "164889003": "Atrial fibrillation",
  "270492004": "1st degree AV block",
  "426177001": "Sinus rhythm",
  // ... 74 more conditions
};

// If class_id = 12:
getDiseaseName(12) {
  snomedCode = MLB_CLASSES[12] // "164889003"
  return SNOMED_TO_DISEASE["164889003"] // "Atrial fibrillation"
}
```

**Threshold Logic:**
- **≥98% confidence**: Return predicted disease
- **<98% confidence**: Force "Normal ECG" (safety first)
- **Why 98%?**: Reduces false positives in medical context

---

## 5. Database Storage Flow

### 5.1 Store Prediction Results

```
┌────────────────────────────────────────────────────────────┐
│  Store in disease_predictions Table                        │
│     │                                                      │
│     ├─▶ Get Latest ECG Reading ID                         │
│     │   SELECT id FROM ecg_readings                       │
│     │   WHERE device_id = :device_id                      │
│     │   ORDER BY created_at DESC LIMIT 1                  │
│     │                                                      │
│     └─▶ INSERT INTO disease_predictions                   │
│         - user_id: NULL (device reading)                  │
│         - ecg_reading_id: {latest_reading_id}             │
│         - prediction_result: {                            │
│             predictions: [                                 │
│               { disease_name, probability, class_id }     │
│             ]                                              │
│           }                                                │
│         - confidence_score: 0.987                         │
│         - predicted_conditions: ["Atrial Fibrillation"]   │
│         - created_at: NOW()                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Database Triggers & Side Effects

```
┌────────────────────────────────────────────────────────────┐
│  PostgreSQL Triggers                                       │
│     │                                                      │
│     ├─▶ UPDATE updated_at Trigger                         │
│     │   (on ecg_readings table)                           │
│     │                                                      │
│     └─▶ Realtime Replication                              │
│         - PostgreSQL logical replication                  │
│         - Publishes INSERT events to subscribers          │
│         - Channels:                                        │
│           * ecg_readings_channel                          │
│           * disease_predictions_channel                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Real-Time Data Propagation to Frontend

### 6.1 Supabase Realtime Subscription

```
┌────────────────────────────────────────────────────────────┐
│                    React Frontend                          │
│                                                            │
│  useECGData Hook Setup                                     │
│     │                                                      │
│     ├─▶ Subscribe to ecg_readings Table                   │
│     │   supabase                                          │
│     │     .channel('ecg_readings_channel')                │
│     │     .on('postgres_changes', {                       │
│     │       event: 'INSERT',                              │
│     │       schema: 'public',                             │
│     │       table: 'ecg_readings'                         │
│     │     }, (payload) => {                               │
│     │       // New ECG data arrived                       │
│     │       handleNewECGData(payload.new)                 │
│     │     })                                               │
│     │     .subscribe()                                    │
│     │                                                      │
│     └─▶ Subscribe to disease_predictions Table            │
│         supabase                                          │
│           .channel('predictions_channel')                 │
│           .on('postgres_changes', {                       │
│             event: 'INSERT',                              │
│             schema: 'public',                             │
│             table: 'disease_predictions'                  │
│           }, (payload) => {                               │
│             // New prediction arrived                     │
│             handleNewPrediction(payload.new)              │
│           })                                               │
│           .subscribe()                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Subscription Flow:**
```
PostgreSQL INSERT
    ↓
Logical Replication
    ↓
Supabase Realtime Server
    ↓
WebSocket Message
    ↓
Frontend Subscription Callback
    ↓
React State Update
    ↓
UI Re-render
```

### 6.2 Frontend Data Processing

```
┌────────────────────────────────────────────────────────────┐
│  React Component: LivePulse.tsx                            │
│     │                                                      │
│     ├─▶ Receive New ECG Data                              │
│     │   - Extract raw array from reading_data.raw         │
│     │   - Convert to chart samples:                       │
│     │     samples = raw.slice(-500).map((value, idx) => ({ │
│     │       value: value,                                  │
│     │       timestamp: idx                                 │
│     │     }))                                              │
│     │                                                      │
│     ├─▶ Calculate BPM (R-peak detection)                  │
│     │   1. Remove baseline wander (50-sample window)      │
│     │   2. Find dynamic threshold (50% of max)            │
│     │   3. Detect R-peaks (local maxima above threshold)  │
│     │   4. Calculate RR intervals                         │
│     │   5. BPM = 60 / median(RR intervals)               │
│     │                                                      │
│     ├─▶ Receive Prediction                                │
│     │   - Extract disease_name, probability              │
│     │   - Check if normal vs abnormal                    │
│     │   - Show toast notification if critical            │
│     │                                                      │
│     └─▶ Update UI State                                   │
│         - setEcgData({ samples, predictions, ... })       │
│         - Trigger React re-render                         │
│         - Update Recharts LineChart                       │
│         - Update BPM display                              │
│         - Update disease status badge                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**BPM Calculation Algorithm:**
```typescript
calculateBPM(samples: ECGSample[]) {
  // 1. Baseline removal
  values = samples.map(s => s.value)
  baseline = movingAverage(values, 50)
  corrected = values.map((v, i) => v - baseline[i])
  
  // 2. Dynamic threshold
  maxValue = max(corrected)
  threshold = maxValue * 0.5
  
  // 3. R-peak detection
  peaks = []
  MIN_PEAK_DISTANCE = 100 // samples (300 BPM max)
  for i in 2..length-2:
    if corrected[i] > threshold &&
       corrected[i] > corrected[i±1] &&
       corrected[i] > corrected[i±2] &&
       (i - lastPeak) >= MIN_PEAK_DISTANCE:
      peaks.push(i)
      lastPeak = i
  
  // 4. RR intervals
  rrIntervals = []
  for i in 1..peaks.length:
    rrIntervals.push(peaks[i] - peaks[i-1])
  
  // 5. BPM from median RR
  medianRR = median(rrIntervals)
  rrSeconds = medianRR / 500 // SAMPLE_RATE
  bpm = round(60 / rrSeconds)
  
  // 6. Sanity check
  return (bpm >= 30 && bpm <= 220) ? bpm : 0
}
```

---

## 7. Visualization & User Interaction Flow

### 7.1 Chart Rendering (Recharts)

```
┌────────────────────────────────────────────────────────────┐
│  Recharts LineChart Component                              │
│     │                                                      │
│     ├─▶ Data Input                                         │
│     │   chartData = samples.map((s, idx) => ({            │
│     │     time: idx,                                       │
│     │     value: s.value                                   │
│     │   }))                                                │
│     │                                                      │
│     ├─▶ Chart Configuration                               │
│     │   <ResponsiveContainer>                             │
│     │     <LineChart data={chartData}>                    │
│     │       <XAxis dataKey="time" />                      │
│     │       <YAxis domain={[0, 4096]} />                  │
│     │       <Line                                          │
│     │         type="monotone"                             │
│     │         dataKey="value"                             │
│     │         stroke="#ef4444"                            │
│     │         dot={false}                                  │
│     │         strokeWidth={2}                             │
│     │         isAnimationActive={false}                   │
│     │       />                                             │
│     │     </LineChart>                                     │
│     │   </ResponsiveContainer>                            │
│     │                                                      │
│     └─▶ Real-Time Update                                  │
│         - New data arrives every 1 second                 │
│         - React state update triggers re-render           │
│         - Chart smoothly updates with new waveform        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 7.2 Disease Alert Flow

```
┌────────────────────────────────────────────────────────────┐
│  Alert Notification System                                 │
│     │                                                      │
│     ├─▶ Check Prediction                                  │
│     │   if (disease_name !== "Normal ECG" &&              │
│     │       probability > 0.98) {                         │
│     │     // Abnormal condition detected                  │
│     │   }                                                  │
│     │                                                      │
│     ├─▶ Show Toast Notification                           │
│     │   toast({                                            │
│     │     title: "⚠️ Abnormal ECG Detected",             │
│     │     description: "Atrial Fibrillation (98.7%)",     │
│     │     variant: "destructive"                          │
│     │   })                                                 │
│     │                                                      │
│     ├─▶ Store Emergency Alert (if critical)               │
│     │   INSERT INTO emergency_alerts {                    │
│     │     user_id, message, alert_type,                   │
│     │     is_resolved: false                              │
│     │   }                                                  │
│     │                                                      │
│     ├─▶ Send Email to Doctor (if enabled)                │
│     │   Call send-doctor-email function                   │
│     │   via Resend API                                    │
│     │                                                      │
│     └─▶ Trigger ESP32 Alert (optional)                    │
│         Call esp32-communication function                 │
│         Send alert command to device                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 8. Report Generation Flow

### 8.1 Daily Report Generation

```
┌────────────────────────────────────────────────────────────┐
│  Report Generator (reportGenerator.ts)                     │
│     │                                                      │
│     ├─▶ User Triggers Report                              │
│     │   - Click "Generate Daily Report" button            │
│     │   - Select date range                               │
│     │                                                      │
│     ├─▶ Fetch Data from Database                          │
│     │   SELECT * FROM pulse_readings                      │
│     │   WHERE user_id = :userId                           │
│     │   AND created_at BETWEEN :startDate AND :endDate    │
│     │   ORDER BY created_at ASC                           │
│     │                                                      │
│     ├─▶ Aggregate Statistics                              │
│     │   - avg_bpm = mean(bpm values)                      │
│     │   - min_bpm = min(bpm values)                       │
│     │   - max_bpm = max(bpm values)                       │
│     │   - total_readings = count(*)                       │
│     │   - emergency_count = count(is_emergency = true)    │
│     │   - abnormal_readings = filter(health_status != normal) │
│     │                                                      │
│     ├─▶ Store Report in Database                          │
│     │   UPSERT INTO health_reports {                      │
│     │     user_id, report_type: 'daily',                  │
│     │     report_date, avg_bpm, min_bpm, max_bpm,         │
│     │     total_readings, emergency_count,                │
│     │     abnormal_readings                               │
│     │   }                                                  │
│     │                                                      │
│     └─▶ Generate PDF                                      │
│         - Use jsPDF library                               │
│         - Add header, patient info, statistics           │
│         - Include abnormal readings table                 │
│         - Add charts (optional)                           │
│         - Download as PDF file                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 8.2 Email Report to Doctor

```
┌────────────────────────────────────────────────────────────┐
│  Email Flow (send-doctor-email edge function)              │
│     │                                                      │
│     ├─▶ Trigger                                            │
│     │   - Manual: User clicks "Send to Doctor"            │
│     │   - Automatic: Scheduled daily/weekly               │
│     │                                                      │
│     ├─▶ Fetch Data                                         │
│     │   1. Get user profile (full_name, age, gender)      │
│     │   2. Get doctor details (name, email)               │
│     │   3. Get health report (report_id)                  │
│     │                                                      │
│     ├─▶ Generate HTML Email                               │
│     │   - Header with patient name                        │
│     │   - Patient information section                     │
│     │   - Health summary (avg/min/max BPM)               │
│     │   - Emergency alerts section (if any)               │
│     │   - Abnormal readings list                          │
│     │   - Footer with timestamp                           │
│     │                                                      │
│     ├─▶ Send via Resend API                               │
│     │   resend.emails.send({                              │
│     │     from: "Health Monitor <reports@domain.com>",    │
│     │     to: [doctorEmail],                              │
│     │     subject: "Daily Health Report - Patient Name",  │
│     │     html: generatedHTML                             │
│     │   })                                                 │
│     │                                                      │
│     └─▶ Log & Confirm                                     │
│         - Store email_sent record                         │
│         - Show success toast to user                      │
│         - Handle errors gracefully                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Authentication & Authorization Flow

### 9.1 User Registration

```
┌────────────────────────────────────────────────────────────┐
│  Registration Flow (Register.tsx)                          │
│     │                                                      │
│     ├─▶ User Submits Form                                 │
│     │   - email                                            │
│     │   - password                                         │
│     │   - full_name                                        │
│     │   - age                                              │
│     │   - gender                                           │
│     │   - enable_email_reports                            │
│     │                                                      │
│     ├─▶ Call Supabase Auth                                │
│     │   supabase.auth.signUp({                            │
│     │     email, password,                                 │
│     │     options: {                                       │
│     │       emailRedirectTo: '/dashboard',                │
│     │       data: userData                                 │
│     │     }                                                │
│     │   })                                                 │
│     │                                                      │
│     ├─▶ Supabase Creates User                             │
│     │   - Insert into auth.users table                    │
│     │   - Generate user_id (UUID)                         │
│     │   - Hash password with bcrypt                       │
│     │   - Send confirmation email                         │
│     │                                                      │
│     ├─▶ Create User Profile                               │
│     │   INSERT INTO user_profiles {                       │
│     │     user_id, full_name, age, gender,                │
│     │     enable_doctor_reports                           │
│     │   }                                                  │
│     │                                                      │
│     ├─▶ Create Emergency Contacts (optional)              │
│     │   INSERT INTO emergency_contacts {                  │
│     │     user_id, name, phone, relation                  │
│     │   }                                                  │
│     │                                                      │
│     └─▶ Redirect to Dashboard                             │
│         - Set session in localStorage                     │
│         - Show welcome toast                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 9.2 Authentication State Management

```
┌────────────────────────────────────────────────────────────┐
│  Auth Context (useAuth.tsx)                                │
│     │                                                      │
│     ├─▶ Initialize Auth Listener                          │
│     │   supabase.auth.onAuthStateChange((event, session) => { │
│     │     setSession(session)                             │
│     │     setUser(session?.user ?? null)                  │
│     │                                                      │
│     │     if (event === 'SIGNED_IN') {                    │
│     │       toast('Welcome!')                             │
│     │     }                                                │
│     │     if (event === 'SIGNED_OUT') {                   │
│     │       toast('Goodbye!')                             │
│     │     }                                                │
│     │   })                                                 │
│     │                                                      │
│     ├─▶ Check Existing Session                            │
│     │   supabase.auth.getSession().then(({ session }) => { │
│     │     setSession(session)                             │
│     │     setUser(session?.user)                          │
│     │   })                                                 │
│     │                                                      │
│     ├─▶ Provide Auth Context                              │
│     │   <AuthContext.Provider value={{                    │
│     │     user, session, signIn, signUp, signOut          │
│     │   }}>                                                │
│     │     {children}                                       │
│     │   </AuthContext.Provider>                           │
│     │                                                      │
│     └─▶ Route Protection                                  │
│         ProtectedRoute: Redirect to /login if no session  │
│         PublicRoute: Redirect to /dashboard if session    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 9.3 Row Level Security (RLS) Flow

```
┌────────────────────────────────────────────────────────────┐
│  RLS Policy Enforcement                                    │
│     │                                                      │
│     ├─▶ User Makes Query                                  │
│     │   SELECT * FROM ecg_readings                        │
│     │                                                      │
│     ├─▶ Supabase Extracts JWT                             │
│     │   - From Authorization: Bearer {token}              │
│     │   - Decode JWT to get user_id                       │
│     │   - Set auth.uid() PostgreSQL function              │
│     │                                                      │
│     ├─▶ Apply RLS Policy                                  │
│     │   Policy: "Users can view their own ECG readings"   │
│     │   WHERE auth.uid() = user_id OR user_id IS NULL     │
│     │                                                      │
│     ├─▶ Filter Results                                    │
│     │   - Only return rows matching policy                │
│     │   - Invisible to user that filtering occurred       │
│     │                                                      │
│     └─▶ Return Data                                       │
│         - User only sees their own data                   │
│         - Plus device readings (user_id IS NULL)          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 10. Error Handling & Edge Cases

### 10.1 ESP32 Error Scenarios

```
┌────────────────────────────────────────────────────────────┐
│  ESP32 Error Handling                                      │
│     │                                                      │
│     ├─▶ WiFi Disconnected                                 │
│     │   - Skip upload, buffer data locally               │
│     │   - Log "WiFi lost, skipping upload"               │
│     │   - Continue sampling                               │
│     │                                                      │
│     ├─▶ HTTPS Timeout                                     │
│     │   - Wait for timeout (10s or 30s)                  │
│     │   - Set uploadInProgress = false                    │
│     │   - Next batch will retry                           │
│     │                                                      │
│     ├─▶ HTTP Error Response                               │
│     │   - Log response code (400, 401, 500)              │
│     │   - Continue to next batch                          │
│     │   - No retry logic (data loss acceptable)          │
│     │                                                      │
│     └─▶ Lead-Off Detected                                 │
│         - Send zeros in buffer                            │
│         - Edge function detects and returns lead_off flag │
│         - User sees "Please connect lead" message         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 10.2 Edge Function Error Scenarios

```
┌────────────────────────────────────────────────────────────┐
│  Edge Function Error Handling                              │
│     │                                                      │
│     ├─▶ Invalid API Key                                   │
│     │   - Return 401 Unauthorized                         │
│     │   - ESP32 logs error and continues                  │
│     │                                                      │
│     ├─▶ Invalid JSON Payload                              │
│     │   - Return 400 Bad Request                          │
│     │   - Log error details                               │
│     │                                                      │
│     ├─▶ Database Error                                    │
│     │   - Catch exception                                 │
│     │   - Return 500 Internal Server Error                │
│     │   - Log error to Supabase logs                      │
│     │                                                      │
│     ├─▶ HuggingFace API Timeout                           │
│     │   - Return error: true                              │
│     │   - No prediction stored                            │
│     │   - User sees "Processing failed" message           │
│     │                                                      │
│     └─▶ Buffer Not Full                                   │
│         - Return success: true, prediction: null          │
│         - Frontend shows "Building buffer..." status      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 10.3 Frontend Error Scenarios

```
┌────────────────────────────────────────────────────────────┐
│  Frontend Error Handling                                   │
│     │                                                      │
│     ├─▶ No Data Available                                 │
│     │   - Show "No ECG Data Yet" message                  │
│     │   - Display empty chart                             │
│     │   - Suggest checking ESP32 connection               │
│     │                                                      │
│     ├─▶ Realtime Subscription Failed                      │
│     │   - Show error toast                                │
│     │   - Fall back to polling (manual refresh)           │
│     │   - Retry subscription after delay                  │
│     │                                                      │
│     ├─▶ Authentication Error                              │
│     │   - Clear session from localStorage                 │
│     │   - Redirect to /login                              │
│     │   - Show error message                              │
│     │                                                      │
│     └─▶ Network Offline                                   │
│         - Show offline indicator                          │
│         - Disable real-time features                      │
│         - Allow viewing cached data                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 11. Data Retention & Archival Flow

### 11.1 Data Growth Estimation

```
Per Device Per Day:
  - Samples: 500 samples/sec × 86,400 sec = 43,200,000 samples
  - Raw Storage: 43.2M × 4 bytes (int32) = 172.8 MB/day
  - JSON Overhead: ~2-3× = 350-500 MB/day
  - Predictions: 8,640 predictions/day × 1 KB = 8.64 MB/day
  
Per User Per Month:
  - ECG Readings: ~10-15 GB
  - Predictions: ~250 MB
  - Reports: ~10 MB
  - Total: ~10-15 GB/user/month
```

### 11.2 Archival Strategy (Future)

```
┌────────────────────────────────────────────────────────────┐
│  Data Archival Flow (Not Yet Implemented)                  │
│     │                                                      │
│     ├─▶ Scheduled Job (Daily at 2 AM)                     │
│     │                                                      │
│     ├─▶ Identify Old Data                                 │
│     │   SELECT * FROM ecg_readings                        │
│     │   WHERE created_at < NOW() - INTERVAL '30 days'     │
│     │                                                      │
│     ├─▶ Export to Cold Storage                            │
│     │   - Supabase Storage bucket                         │
│     │   - AWS S3 Glacier                                  │
│     │   - Compressed JSON or Parquet format               │
│     │                                                      │
│     ├─▶ Delete from Hot Storage                           │
│     │   DELETE FROM ecg_readings                          │
│     │   WHERE created_at < NOW() - INTERVAL '30 days'     │
│     │                                                      │
│     └─▶ Keep Predictions Forever                          │
│         - Medical records retention requirement           │
│         - Small size (predictions only)                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 12. Complete End-to-End Flow Summary

```
┌───────────┐     1s batches      ┌──────────────────┐
│   ESP32   │ ─────HTTPS──────▶  │ ecg-prediction   │
│  (500 Hz) │                     │  Edge Function   │
└───────────┘                     │  (Deno Runtime)  │
                                  └──────────────────┘
                                           │
                                  ┌────────┴────────┐
                                  │                 │
                             Buffer (10s)      DSP Pipeline
                                  │                 │
                                  │            Normalization
                                  │                 │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  HuggingFace ML  │
                                  │  (5000 samples)  │
                                  └──────────────────┘
                                           │
                                      Predictions
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │   PostgreSQL     │
                                  │  - ecg_readings  │
                                  │  - predictions   │
                                  └──────────────────┘
                                           │
                                   Realtime Replication
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │   React App      │
                                  │  - Recharts      │
                                  │  - Toasts        │
                                  │  - Reports       │
                                  └──────────────────┘
                                           │
                                  ┌────────┴────────┐
                                  │                 │
                              User View       Email Doctor
                              Dashboard       (Resend API)
```

**Timing Breakdown:**
1. **ESP32 → Edge Function**: 1 second (500 samples)
2. **Edge Function Processing**: 100-500 ms
   - Validation: 10 ms
   - Database insert: 50 ms
   - Buffer stitching: 20 ms
   - DSP pipeline: 100 ms (every 10s)
   - HuggingFace API: 1-3 seconds (every 10s)
   - Prediction storage: 50 ms
3. **Database → Frontend**: <100 ms (Realtime)
4. **Frontend Rendering**: 16 ms (60 FPS)

**Total Latency:**
- Graph update: ~1.5-2 seconds from sensor to screen
- Prediction display: ~10-13 seconds (10s buffer + processing)

---

## 13. Data Format Specifications

### 13.1 ECG Data JSON Structure

```json
{
  "device_id": "ESP32-001",
  "sample_rate": 500,
  "timestamp": "1703174400000",
  "raw_ecg_data": [
    2048, 2050, 2055, 2062, 2070, 2080, 2092, 2105, 2120, 2135,
    // ... 490 more samples ...
  ]
}
```

### 13.2 Prediction Result Structure

```json
{
  "success": true,
  "graph_update": true,
  "prediction": [
    {
      "disease_name": "Atrial Fibrillation",
      "probability": 0.987,
      "class_id": 12
    }
  ],
  "buffer_status": "5000/5000"
}
```

### 13.3 Database Record Structure

**ecg_readings Table:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": null,
  "device_id": "ESP32-001",
  "reading_data": {
    "raw": [2048, 2050, ...],
    "timestamp": "2025-12-21T10:30:00Z"
  },
  "duration_seconds": 1,
  "sample_rate": 500,
  "created_at": "2025-12-21T10:30:00Z",
  "updated_at": "2025-12-21T10:30:00Z"
}
```

**disease_predictions Table:**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "user_id": null,
  "ecg_reading_id": "550e8400-e29b-41d4-a716-446655440000",
  "prediction_result": {
    "predictions": [
      {
        "disease_name": "Atrial Fibrillation",
        "probability": 0.987,
        "class_id": 12
      }
    ]
  },
  "confidence_score": 0.987,
  "predicted_conditions": ["Atrial Fibrillation"],
  "created_at": "2025-12-21T10:30:10Z"
}
```

---

## Conclusion

This data flow architecture ensures:
- **Real-time monitoring**: 1-2 second latency from sensor to screen
- **Medical accuracy**: 98% confidence threshold, SNOMED coding
- **Scalability**: Edge computing, buffering, efficient data structures
- **Reliability**: Error handling at every layer, fallback mechanisms
- **Security**: RLS policies, JWT authentication, API key validation
- **User experience**: Toast notifications, live charts, automated reports

The system processes **~43 million samples per day** per device while maintaining responsive real-time visualization and accurate AI-powered disease detection.
