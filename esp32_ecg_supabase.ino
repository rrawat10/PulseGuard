#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ==========================================
// 🛠️ USER CONFIGURATION (CHANGE THESE!)
// ==========================================
const char* ssid          = "EACCESS-M2";        // Your WiFi Name
const char* password      = "hostelnet";         // Your WiFi Password

// Your Supabase Edge Function URL
const char* supabaseUrl   = "https://qxvlhdqdbkrhiqdohgio.supabase.co/functions/v1/ecg-prediction";

// Your Supabase Anon Key (The long JWT string)
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dmxoZHFkYmtyaGlxZG9oZ2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjE0NzIsImV4cCI6MjA2Mzk5NzQ3Mn0.mQHTOZwZNAtnmwEFmHl6_EerVgpDvQjoPXm0CwRd5Dc";

// Your Custom Device Security Key
const char* deviceApiKey  = "ecg-device-2024-secure-key-xyz123";

// Unique Name for this Device
const char* deviceId      = "ESP32-001"; 

// ==========================================
// ⚙️ SYSTEM SETTINGS
// ==========================================
#define SAMPLE_RATE     500   // Hz
#define BATCH_SIZE      500   // Send every 500 samples (1 Second)
#define ECG_PIN         36    // VP Pin
#define LO_PLUS_PIN     34    // Leads Off +
#define LO_MINUS_PIN    35    // Leads Off -

// Timing variables
unsigned long lastSampleTime = 0;
const unsigned long sampleInterval = 1000000 / SAMPLE_RATE; // 2000 microseconds

// Data Buffer
int ecgBuffer[BATCH_SIZE];    // Store as Int (Raw ADC) to save RAM
int bufferIndex = 0;
int chunkCounter = 0;         // Track which chunk we're on (for timeout handling)
bool uploadInProgress = false; // Prevent overlapping requests

void setup() {
  Serial.begin(115200);
  
  // Pin Setup
  pinMode(ECG_PIN, INPUT);
  pinMode(LO_PLUS_PIN, INPUT);
  pinMode(LO_MINUS_PIN, INPUT);

  // WiFi Setup
  Serial.println("\n\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMicros = micros();

  // 1. Precise Sampling Timer (500Hz)
  if (currentMicros - lastSampleTime >= sampleInterval) {
    lastSampleTime = currentMicros;

    // 2. Read Sensor
    int rawValue = 0;
    
    // Check Leads Off
    if (digitalRead(LO_PLUS_PIN) == 1 || digitalRead(LO_MINUS_PIN) == 1) {
      rawValue = 0; // Flatline if disconnected
    } else {
      rawValue = analogRead(ECG_PIN);
    }

    // 3. Add to Buffer
    ecgBuffer[bufferIndex] = rawValue;
    bufferIndex++;

    // 4. If Buffer Full (1 Second Passed) -> Upload
    if (bufferIndex >= BATCH_SIZE) {
      uploadChunkToCloud();
      bufferIndex = 0; // Reset for next second
    }
  }
}

// Function to upload data using Raw JSON String building (Memory Efficient)
void uploadChunkToCloud() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost, skipping upload...");
    return;
  }
  
  // Skip if previous upload still in progress (prevents -1, -5 errors)
  if (uploadInProgress) {
    Serial.println("⏳ Previous upload still running, buffering...");
    return;
  }
  
  uploadInProgress = true;
  chunkCounter++;
  
  // Use shorter timeout for regular chunks, longer only when prediction expected
  int timeout = (chunkCounter % 10 == 0) ? 30000 : 10000; // 30s for prediction, 10s for regular

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL Validation for Speed
  client.setTimeout(timeout);

  HTTPClient http;
  http.setTimeout(timeout);
  
  if (http.begin(client, supabaseUrl)) {
    // Set Headers
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + supabaseAnonKey);
    http.addHeader("X-Device-API-Key", deviceApiKey);

    // ------------------------------------------------
    // ⚡ OPTIMIZED JSON CONSTRUCTION
    // We build the string manually to avoid ArduinoJson overhead
    // Format: {"device_id":"X", "sample_rate":500, "timestamp":"123", "raw_ecg_data":[...]}
    // ------------------------------------------------
    String jsonPayload = "{\"device_id\":\"";
    jsonPayload += deviceId;
    jsonPayload += "\",\"sample_rate\":";
    jsonPayload += String(SAMPLE_RATE);
    jsonPayload += ",\"timestamp\":\"";
    jsonPayload += String(millis());
    jsonPayload += "\",\"raw_ecg_data\":[";

    // Loop through buffer and append numbers
    for (int i = 0; i < BATCH_SIZE; i++) {
      jsonPayload += String(ecgBuffer[i]);
      if (i < BATCH_SIZE - 1) jsonPayload += ",";
    }
    jsonPayload += "]}";

    // Send POST
    // Serial.println("📤 Sending 1s Chunk...");
    int httpResponseCode = http.POST(jsonPayload);

    // Check Response
    if (httpResponseCode > 0) {
      String response = http.getString();
      // Serial.printf("✅ Success (%d)\n", httpResponseCode);
      
      // Check if the Cloud returned a Prediction (it happens every 10th chunk)
      if (response.indexOf("\"predictions\":null") == -1 && response.indexOf("\"predictions\":") > 0) {
        Serial.println("\n***********************************");
        Serial.println("🚨 CLOUD DIAGNOSIS RECEIVED:");
        Serial.println(response); // You can parse this if you want to display on OLED
        Serial.println("***********************************\n");
      }
      
      // Check for Lead Off Message
      if (response.indexOf("Please connect lead first") > 0) {
        Serial.println("⚠️ CLOUD SAYS: LEADS OFF!");
      }
      
      // Check for AI Summary (session end)
      if (response.indexOf("\"ai_summary\":{\"text\":") > 0) {
        Serial.println("\n📋 SESSION SUMMARY:");
        Serial.println(response);
      }

    } else {
      Serial.printf("❌ Error: %d\n", httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("❌ Unable to connect to server");
  }
  
  uploadInProgress = false; // Allow next upload
}