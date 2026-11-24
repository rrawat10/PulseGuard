// Test script to verify ECG prediction API
// Run with: node test-ecg-api.js

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://qxvlhdqdbkrhiqdohgio.supabase.co/functions/v1/ecg-prediction';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dmxoZHFkYmtyaGlxZG9oZ2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjE0NzIsImV4cCI6MjA2Mzk5NzQ3Mn0.mQHTOZwZNAtnmwEFmHl6_EerVgpDvQjoPXm0CwRd5Dc';
const DEVICE_API_KEY = 'ecg-device-2024-secure-key-xyz123';

// Generate 5000 random ECG-like samples
const generateECGData = () => {
  const samples = [];
  for (let i = 0; i < 5000; i++) {
    // Simulate ECG waveform with some variation
    const value = Math.sin(i / 50) * 0.5 + (Math.random() - 0.5) * 0.2;
    samples.push(value);
  }
  return samples;
};

const testAPI = async () => {
  console.log('🧪 Testing ECG Prediction API...\n');
  
  const payload = {
    raw_ecg_data: generateECGData(),
    device_id: 'TEST-DEVICE',
    sample_rate: 250,
    timestamp: new Date().toISOString()
  };

  console.log(`📦 Payload: ${payload.raw_ecg_data.length} samples`);
  console.log(`📍 URL: ${SUPABASE_URL}\n`);

  try {
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Device-API-Key': DEVICE_API_KEY
      },
      body: JSON.stringify(payload)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('\n📥 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ SUCCESS!');
      console.log(`Reading ID: ${data.ecg_reading_id}`);
      console.log(`Predictions: ${data.predictions.length}`);
      data.predictions.forEach(p => {
        console.log(`  - ${p.disease_name}: ${(p.probability * 100).toFixed(1)}%`);
      });
    } else {
      console.log('\n❌ FAILED');
      console.log(`Error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
};

testAPI();
