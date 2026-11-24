"""
ECG Testing Script for Abnormal Cases
Reads .hea and .dat files (WFDB/PhysioNet format) and sends to Supabase via REST API
"""

import struct
import time
import json
import requests
from pathlib import Path

class WFDBReader:
    """Read WFDB format ECG files (.hea and .dat)"""
    
    def __init__(self, record_name):
        """
        Initialize reader with record name (without extension)
        Example: if you have 100.hea and 100.dat, use record_name='100'
        """
        self.record_name = record_name
        self.header_file = f"{record_name}.hea"
        self.data_file = f"{record_name}.dat"
        
        self.sampling_rate = 360  # Default, will be read from .hea
        self.num_samples = 0
        self.num_leads = 0
        self.gain = []
        self.baseline = []
        self.format_code = 16  # Default format
        
        self._read_header()
    
    def _read_header(self):
        """Parse .hea file to get metadata"""
        with open(self.header_file, 'r') as f:
            lines = f.readlines()
        
        # First line: record_name num_leads sampling_rate num_samples
        parts = lines[0].strip().split()
        self.num_leads = int(parts[1])
        self.sampling_rate = int(parts[2])
        self.num_samples = int(parts[3])
        
        print(f"Record: {self.record_name}")
        print(f"Sampling Rate: {self.sampling_rate} Hz")
        print(f"Number of Leads: {self.num_leads}")
        print(f"Number of Samples: {self.num_samples}")
        
        # Read lead information from subsequent lines
        for i in range(1, self.num_leads + 1):
            parts = lines[i].strip().split()
            # Format: filename format gain(ADC_units/physical_unit) baseline ADC_resolution ADC_zero label
            gain = float(parts[2].split('/')[0]) if '/' in parts[2] else float(parts[2])
            baseline = int(parts[3]) if len(parts) > 3 else 0
            
            self.gain.append(gain)
            self.baseline.append(baseline)
    
    def read_samples(self, lead_index=0):
        """
        Read ECG samples from .dat file for a specific lead
        Returns: list of float values in mV
        """
        samples = []
        
        with open(self.data_file, 'rb') as f:
            # Read all data
            data = f.read()
            
            # Format 16: 2 bytes per sample per lead
            bytes_per_sample = 2 * self.num_leads
            
            for i in range(self.num_samples):
                offset = i * bytes_per_sample + (lead_index * 2)
                
                if offset + 2 <= len(data):
                    # Read 2 bytes as signed 16-bit integer
                    raw_value = struct.unpack('<h', data[offset:offset+2])[0]
                    
                    # Convert ADC units to physical units (mV)
                    # Physical value = (ADC value - baseline) / gain
                    physical_value = (raw_value - self.baseline[lead_index]) / self.gain[lead_index]
                    samples.append(physical_value)
        
        return samples


def resample_to_500hz(samples, original_rate):
    """
    Resample ECG data to 500 Hz if needed
    """
    if original_rate == 500:
        return samples
    
    try:
        from scipy import signal as sp_signal
        import numpy as np
        
        # Calculate resampling ratio
        num_samples = int(len(samples) * 500 / original_rate)
        resampled = sp_signal.resample(samples, num_samples)
        return resampled.tolist()
    except ImportError:
        print("Warning: scipy not installed. Cannot resample. Install with: pip install scipy")
        print(f"Using original {original_rate}Hz data (may cause issues)")
        return samples


def send_ecg_to_api(samples, supabase_url, device_api_key, device_id="test_device", batch_size=500):
    """
    Send ECG samples to Supabase via REST API
    Sends in batches to simulate real-time streaming
    """
    url = f"{supabase_url}/functions/v1/ecg-prediction"
    headers = {
        "Content-Type": "application/json",
        "X-Device-API-Key": device_api_key
    }
    
    print(f"\nSending to: {url}")
    print(f"Total samples: {len(samples)}")
    print(f"Batch size: {batch_size} samples (simulating {batch_size/500:.1f} second chunks)")
    print("=" * 60)
    
    predictions = []
    num_batches = (len(samples) + batch_size - 1) // batch_size
    
    for i in range(0, len(samples), batch_size):
        batch = samples[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        payload = {
            "raw_ecg_data": batch,
            "timestamp": int(time.time() * 1000),
            "sample_rate": 500,
            "device_id": device_id
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                
                print(f"✅ Batch {batch_num}/{num_batches} sent")
                print(f"   Buffer: {result.get('buffer_status', 'N/A')}")
                
                if result.get('prediction'):
                    pred = result['prediction'][0]  # Get first prediction
                    disease = pred.get('disease_name', 'Unknown')
                    confidence = pred.get('probability', 0) * 100
                    
                    print(f"   🎯 PREDICTION: {disease} ({confidence:.1f}% confidence)")
                    predictions.append(pred)
                else:
                    print(f"   ⏳ Buffering... (need 5000 samples for prediction)")
                    
            else:
                print(f"❌ Batch {batch_num} failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error on batch {batch_num}: {e}")
        
        # Small delay between batches (simulate real-time)
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print(f"✅ Completed sending {len(samples)} samples in {num_batches} batches")
    
    if predictions:
        print(f"\n📊 PREDICTIONS RECEIVED: {len(predictions)}")
        for i, pred in enumerate(predictions, 1):
            disease = pred.get('disease_name', 'Unknown')
            confidence = pred.get('probability', 0) * 100
            print(f"   {i}. {disease} ({confidence:.1f}% confidence)")
    else:
        print("\n⚠️  No predictions received (may need more data)")
    
    return predictions


def main():
    """Main function"""
    import sys
    
    if len(sys.argv) < 4:
        print("=" * 70)
        print("ECG TESTING TOOL - Send Abnormal Cases to Supabase")
        print("=" * 70)
        print("\nUsage:")
        print("  python test_abnormal_ecg.py <record_name> <supabase_url> <device_api_key> [options]")
        print("\nRequired Arguments:")
        print("  record_name     - Path to WFDB record without extension")
        print("                    Example: '100' for 100.hea/100.dat")
        print("  supabase_url    - Your Supabase project URL")
        print("                    Example: https://xxxxx.supabase.co")
        print("  device_api_key  - Device API key from Supabase env")
        print("\nOptional Arguments:")
        print("  --lead N        - ECG lead to use (default: 0)")
        print("  --device-id ID  - Device ID (default: test_device)")
        print("  --iterations N  - Number of times to send (default: 5 for SMS testing)")
        print("  --batch-size N  - Samples per batch (default: 500)")
        print("\nExample:")
        print("  python test_abnormal_ecg.py abnormal_case https://xxx.supabase.co your-api-key")
        print("  python test_abnormal_ecg.py 100 https://xxx.supabase.co key123 --iterations 5")
        print("=" * 70)
        sys.exit(1)
    
    record_name = sys.argv[1]
    supabase_url = sys.argv[2]
    device_api_key = sys.argv[3]
    
    # Parse optional arguments
    lead_index = 0
    device_id = "test_device"
    iterations = 5  # Send 5 times to trigger SMS alert (needs 5 consecutive abnormal)
    batch_size = 500
    
    i = 4
    while i < len(sys.argv):
        if sys.argv[i] == "--lead" and i + 1 < len(sys.argv):
            lead_index = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == "--device-id" and i + 1 < len(sys.argv):
            device_id = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--iterations" and i + 1 < len(sys.argv):
            iterations = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == "--batch-size" and i + 1 < len(sys.argv):
            batch_size = int(sys.argv[i + 1])
            i += 2
        else:
            i += 1
    
    print("\n" + "=" * 70)
    print("🏥 ECG ABNORMAL CASE TESTING TOOL")
    print("=" * 70)
    print()
    
    # Check if files exist
    hea_file = f"{record_name}.hea"
    dat_file = f"{record_name}.dat"
    
    if not Path(hea_file).exists():
        print(f"❌ Error: Header file '{hea_file}' not found!")
        print(f"   Make sure the file is in the current directory: {Path.cwd()}")
        sys.exit(1)
    
    if not Path(dat_file).exists():
        print(f"❌ Error: Data file '{dat_file}' not found!")
        print(f"   Make sure the file is in the current directory: {Path.cwd()}")
        sys.exit(1)
    
    # Read ECG data
    print("📖 Reading WFDB files...")
    reader = WFDBReader(record_name)
    
    if lead_index >= reader.num_leads:
        print(f"❌ Error: Lead index {lead_index} out of range (0-{reader.num_leads-1})")
        sys.exit(1)
    
    print(f"   Lead: {lead_index}")
    print(f"   Device ID: {device_id}")
    print(f"   Iterations: {iterations}")
    samples = reader.read_samples(lead_index)
    
    print(f"\n✅ Read {len(samples)} samples")
    print(f"   Duration: {len(samples)/reader.sampling_rate:.1f} seconds")
    print(f"   Value range: {min(samples):.2f} to {max(samples):.2f} mV")
    
    # Resample if needed
    if reader.sampling_rate != 500:
        print(f"\n🔄 Resampling from {reader.sampling_rate}Hz to 500Hz...")
        samples = resample_to_500hz(samples, reader.sampling_rate)
        print(f"   New sample count: {len(samples)}")
    
    # Send multiple times to test SMS alert (needs 5 consecutive abnormal)
    print(f"\n🚀 Starting {iterations} iteration(s)...")
    print(f"   (SMS alerts trigger after 5 consecutive abnormal readings)")
    print()
    
    all_predictions = []
    for iteration in range(1, iterations + 1):
        print(f"\n{'='*70}")
        print(f"ITERATION {iteration}/{iterations}")
        print(f"{'='*70}")
        
        predictions = send_ecg_to_api(
            samples=samples,
            supabase_url=supabase_url,
            device_api_key=device_api_key,
            device_id=device_id,
            batch_size=batch_size
        )
        
        all_predictions.extend(predictions)
        
        if iteration < iterations:
            print(f"\n⏳ Waiting 3 seconds before next iteration...")
            time.sleep(3)
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 FINAL SUMMARY")
    print("=" * 70)
    print(f"Total iterations: {iterations}")
    print(f"Total predictions: {len(all_predictions)}")
    
    if all_predictions:
        # Count disease types
        disease_counts = {}
        for pred in all_predictions:
            disease = pred.get('disease_name', 'Unknown')
            disease_counts[disease] = disease_counts.get(disease, 0) + 1
        
        print(f"\n📈 Disease Distribution:")
        for disease, count in disease_counts.items():
            print(f"   {disease}: {count} time(s)")
        
        # Check if abnormal (for SMS testing)
        abnormal_count = sum(1 for p in all_predictions if p.get('disease_name') != 'Normal ECG')
        if abnormal_count >= 5:
            print(f"\n✅ {abnormal_count} abnormal readings detected!")
            print(f"   SMS alert should have been triggered")
        else:
            print(f"\n⚠️  Only {abnormal_count} abnormal readings")
            print(f"   Need 5 consecutive abnormal for SMS alert")
    else:
        print("\n⚠️  No predictions received")
        print("   Check your API key and Supabase configuration")
    
    print("\n💡 Check your React dashboard for live updates!")
    print("=" * 70)


if __name__ == "__main__":
    main()
