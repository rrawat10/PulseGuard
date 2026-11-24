// Test script to verify ECG prediction API
// Run with: node test-ecg-api.js

// Requires Node.js 18 or newer for built-in fetch.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const DEVICE_API_KEY = process.env.DEVICE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DEVICE_API_KEY) {
  throw new Error('Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and DEVICE_API_KEY before running this script.');
}

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
