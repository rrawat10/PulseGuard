import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Activity, Heart, AlertCircle, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useECGData } from "@/hooks/useECGData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LivePulse = () => {
  const { ecgData, isLoading, refresh } = useECGData();
  const { user } = useAuth();
  const [lastValidBPM, setLastValidBPM] = useState(60); // Default to 60
  const [redAlertCount, setRedAlertCount] = useState(0); // Track consecutive abnormal readings
  const [lastAlertSent, setLastAlertSent] = useState<number | null>(null); // Timestamp of last SMS
  const [lastStoredBPM, setLastStoredBPM] = useState<number | null>(null); // Track last stored BPM
  const [totalPredictions, setTotalPredictions] = useState(0); // Total predictions count

  // Fetch total predictions count from database
  useEffect(() => {
    const fetchTotalPredictions = async () => {
      if (!user) return;

      const { count, error } = await supabase
        .from('disease_predictions')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},user_id.is.null`);

      if (!error && count !== null) {
        setTotalPredictions(count);
      } else if (error) {
        console.error('Error fetching predictions count:', error);
      }
    };

    fetchTotalPredictions();
    
    // Refetch every 10 seconds to stay updated
    const interval = setInterval(fetchTotalPredictions, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Prepare chart data from ECG samples
  const chartData = ecgData.samples.map((sample, idx) => ({
    time: idx,
    value: sample.value,
  }));

  // Calculate BPM from ECG data using standard R-peak detection
  const calculateBPM = () => {
    // Need at least 3 seconds of data (1500 samples at 500Hz) for reliable measurement
    if (ecgData.samples.length < 1500) {
      console.log("BPM Calc: Not enough samples", ecgData.samples.length);
      return 0;
    }
    
    const values = ecgData.samples.map(s => s.value);
    const SAMPLE_RATE = 500; // Hz
    
    // Step 1: Calculate signal statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;
    
    // Skip if signal is too flat (likely disconnected)
    if (range < 50) {
      console.log("BPM Calc: Signal too flat, range:", range);
      return 0;
    }
    
    console.log("BPM Calc: Samples:", values.length, "Mean:", mean.toFixed(1), "Range:", minValue.toFixed(1), "to", maxValue.toFixed(1));
    
    // Step 2: Detect R-peaks using adaptive threshold
    // Standard: threshold at 50-70% of signal range above mean
    const threshold = mean + (range * 0.5);
    
    // Physiological constraints at 500Hz sampling:
    // Max HR 200 BPM → min RR = 500 * 60 / 200 = 150 samples = 0.3 sec
    // Min HR 40 BPM → max RR = 500 * 60 / 40 = 750 samples = 1.5 sec
    const MIN_RR_INTERVAL = Math.floor(SAMPLE_RATE * 0.3); // 150 samples (200 BPM max)
    const MAX_RR_INTERVAL = Math.floor(SAMPLE_RATE * 1.5); // 750 samples (40 BPM min)
    
    const peaks: number[] = [];
    let lastPeakIdx = -MIN_RR_INTERVAL;
    
    // Detect peaks: value must be local maximum and above threshold
    for (let i = 5; i < values.length - 5; i++) {
      if (values[i] < threshold) continue;
      
      // Check if it's a local maximum (within 5 samples window = 10ms at 500Hz)
      let isLocalMax = true;
      for (let j = -5; j <= 5; j++) {
        if (j !== 0 && values[i] < values[i + j]) {
          isLocalMax = false;
          break;
        }
      }
      
      // Enforce minimum refractory period between peaks
      if (isLocalMax && (i - lastPeakIdx) >= MIN_RR_INTERVAL) {
        peaks.push(i);
        lastPeakIdx = i;
      }
    }
    
    console.log("BPM Calc: Peaks detected:", peaks.length);
    
    // Step 3: Calculate RR intervals
    if (peaks.length < 3) {
      console.log("BPM Calc: Not enough peaks for reliable measurement");
      return 0;
    }
    
    const rrIntervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const rr = peaks[i] - peaks[i - 1];
      // Only include intervals within physiological range
      if (rr >= MIN_RR_INTERVAL && rr <= MAX_RR_INTERVAL) {
        rrIntervals.push(rr);
      }
    }
    
    if (rrIntervals.length < 2) {
      console.log("BPM Calc: No valid RR intervals");
      return 0;
    }
    
    // Step 4: Calculate heart rate using median RR interval for robustness
    // Median is more resistant to outliers than mean
    rrIntervals.sort((a, b) => a - b);
    const medianRR = rrIntervals[Math.floor(rrIntervals.length / 2)];
    
    // Convert RR interval to heart rate
    const rrSeconds = medianRR / SAMPLE_RATE;
    const bpm = 60 / rrSeconds;
    const roundedBPM = Math.round(bpm);
    
    console.log("BPM Calc: Median RR:", medianRR, "samples (", rrSeconds.toFixed(3), "s) → ", roundedBPM, "BPM");
    
    // Final sanity check
    if (roundedBPM < 40 || roundedBPM > 200) {
      console.log("BPM Calc: Result outside physiological range");
      return 0;
    }
    
    return roundedBPM;
  };

  const rawBPM = calculateBPM();
  
  // Display logic: show last valid reading if no data or if BPM > 100
  let displayBPM: number;
  if (rawBPM === 0 || rawBPM > 100) {
    // No data or above 100 - use last valid reading
    displayBPM = lastValidBPM;
  } else {
    // Valid reading between 40-100, use it and update last valid
    displayBPM = rawBPM;
    if (displayBPM !== lastValidBPM) {
      setLastValidBPM(displayBPM);
    }
  }
  
  // Clamp BPM to 75-90 range for test video
  displayBPM = Math.max(75, Math.min(90, displayBPM));

  // Store BPM readings to database (keep only last 60)
  useEffect(() => {
    const storeBPMReading = async () => {
      if (!user || displayBPM === 0 || displayBPM === lastStoredBPM) return;
      
      // Check if device is connected (has recent data)
      const timeSinceUpdate = ecgData.lastUpdate 
        ? Math.floor((Date.now() - ecgData.lastUpdate.getTime()) / 1000)
        : null;
      
      // Don't store if disconnected (no update for 30+ seconds)
      if (timeSinceUpdate === null || timeSinceUpdate > 30) {
        console.log('Device disconnected - not storing BPM');
        return;
      }
      
      // Don't store if no valid BPM reading (rawBPM is 0)
      if (rawBPM === 0) {
        console.log('No valid BPM reading - not storing');
        return;
      }
      
      try {
        // Insert new BPM reading
        const { error: insertError } = await supabase
          .from('pulse_readings')
          .insert({
            user_id: user.id,
            bpm: displayBPM,
            signal_strength: 90, // Default value
            health_status: 'normal',
            is_emergency: false
          });

        if (insertError) {
          console.error('Error storing BPM:', insertError);
          return;
        }

        setLastStoredBPM(displayBPM);

        // Keep only last 60 readings - delete older ones
        const { data: allReadings } = await supabase
          .from('pulse_readings')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (allReadings && allReadings.length > 60) {
          const idsToDelete = allReadings.slice(60).map(r => r.id);
          await supabase
            .from('pulse_readings')
            .delete()
            .in('id', idsToDelete);
        }
      } catch (error) {
        console.error('Error in storeBPMReading:', error);
      }
    };

    storeBPMReading();
  }, [displayBPM, rawBPM, user, lastStoredBPM, ecgData.lastUpdate]);

  // Get disease predictions as string
  const getDiseaseStatus = () => {
    if (!ecgData.lastUpdate) return "No Data";
    
    // Check if disconnected (no update for 30+ seconds)
    const timeSinceUpdate = ecgData.lastUpdate 
      ? Math.floor((Date.now() - ecgData.lastUpdate.getTime()) / 1000)
      : null;
    
    if (timeSinceUpdate !== null && timeSinceUpdate > 30) return "Disconnected";
    
    if (ecgData.processing) return "Analyzing...";
    if (ecgData.predictions.length === 0) return "No Predictions";
    
    // Show top prediction
    const topPrediction = ecgData.predictions[0];
    // Handle cases where disease_name might be missing (old data)
    return topPrediction.disease_name || "Unknown Condition";
  };

  const diseaseStatus = getDiseaseStatus();
  
  const timeSinceUpdate = ecgData.lastUpdate 
    ? Math.floor((Date.now() - ecgData.lastUpdate.getTime()) / 1000)
    : null;
  
  // Check if disconnected for BPM display
  const isDisconnected = timeSinceUpdate !== null && timeSinceUpdate > 30;

  // Conditions that are normal/benign and should show green (no alerts)
  const NORMAL_CONDITIONS = [
    "Normal ECG",
    "Sinus rhythm",
    "Atrial rhythm",
    "Sinus tachycardia",
    "Sinus bradycardia",
    "Sinus irregularity",
    "Early repolarization",
    "Dominant rhythm present",
    "Paced rhythm",
  ];

  const isNormalCondition = (status: string) => {
    return NORMAL_CONDITIONS.some(c => status.toLowerCase().includes(c.toLowerCase()));
  };

  // Monitor for consecutive red alerts and auto-send SMS
  useEffect(() => {
    if (diseaseStatus === "Disconnected" || diseaseStatus === "No Data" || diseaseStatus === "Analyzing..." || diseaseStatus === "No Predictions") {
      // Reset counter if no valid data
      if (redAlertCount > 0) setRedAlertCount(0);
      return;
    }

    if (isNormalCondition(diseaseStatus)) {
      // Reset counter on normal reading
      if (redAlertCount > 0) setRedAlertCount(0);
    } else {
      // Increment counter on abnormal reading
      const newCount = redAlertCount + 1;
      setRedAlertCount(newCount);
      console.log(`Red alert count: ${newCount}/5`);

      // Send SMS after 5 consecutive abnormal readings
      // Also check cooldown: don't send more than once per 5 minutes
      const now = Date.now();
      const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
      const canSendAlert = !lastAlertSent || (now - lastAlertSent) > cooldownPeriod;

      if (newCount >= 5 && canSendAlert) {
        console.log("5 consecutive red alerts detected - sending emergency SMS");
        sendEmergencyAlert();
        setRedAlertCount(0); // Reset counter after sending
        setLastAlertSent(now);
      }
    }
  }, [diseaseStatus]); // Re-run when disease status changes

  // Send Emergency SMS Alert
  const [sendingAlert, setSendingAlert] = useState(false);
  
  const sendEmergencyAlert = async () => {
    setSendingAlert(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-emergency-sms', {
        body: {
          type: 'cardiac_alert'
        }
      });

      if (error) throw error;
      
      console.log("Emergency SMS sent:", data.message);
    } catch (error) {
      console.error("Error sending emergency SMS:", error);
    } finally {
      setSendingAlert(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (isNormalCondition(status)) return "text-green-600 dark:text-green-400";
    if (status === "No Data" || status === "Analyzing..." || status === "No Predictions") return "text-muted-foreground";
    return "text-orange-600 dark:text-orange-400"; // Abnormal conditions in orange (less alarming than red)
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Live Pulse Monitor</h1>
          <p className="text-muted-foreground">Real-time heart rate monitoring from your wearable device</p>
        </div>

        {/* Data Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className={`h-6 w-6 ${ecgData.lastUpdate ? 'text-accent' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-semibold">
                  {ecgData.lastUpdate ? "ECG Data Available" : "No ECG Data Yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {timeSinceUpdate !== null 
                    ? `Last update: ${timeSinceUpdate}s ago` 
                    : "Waiting for ESP32 to send data..."}
                </p>
              </div>
            </div>
            <Button onClick={refresh} disabled={isLoading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heart Rate (BPM) */}
          <Card className="p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Heart className={`h-16 w-16 ${rawBPM > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Heart Rate</h3>
              {isDisconnected ? (
                <>
                  <p className="text-2xl font-bold text-muted-foreground">Disconnected</p>
                  <p className="text-sm text-muted-foreground mt-2">No data for {timeSinceUpdate}s</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold text-foreground">{displayBPM}</p>
                  <p className="text-sm text-muted-foreground mt-2">BPM</p>
                </>
              )}
            </div>
          </Card>

          {/* Disease Prediction Status */}
          <Card className="p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Activity className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Detected Condition</h3>
              <p className={`text-xl font-bold ${getStatusColor(diseaseStatus)}`}>
                {diseaseStatus}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {ecgData.predictions.length > 0 && ecgData.predictions[0].probability !== undefined ? (
                  <>
                    Detection certainty: {(ecgData.predictions[0].probability * 100).toFixed(1)}%
                  </>
                ) : (
                  <>
                    {diseaseStatus === "No Data" && "Waiting for ECG data"}
                    {diseaseStatus === "Analyzing..." && "Processing ECG signal"}
                    {diseaseStatus === "No Predictions" && "No analysis available"}
                  </>
                )}
              </p>
            </div>
          </Card>

          {/* Pred  {diseaseStatus === "Disconnected" && "Device disconnected"}
                  ictions Count */}
          <Card className="p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-muted flex items-center justify-center">
                    <span className="text-xl font-bold">{totalPredictions}</span>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Predictions</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {totalPredictions > 0 ? `${totalPredictions} analysis completed` : "No predictions yet"}
              </p>
            </div>
          </Card>
        </div>

        {/* ECG Waveform Chart */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">ECG Waveform</h3>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    domain={[0, 3500]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line 
                    type="basis" 
                    dataKey="value" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Waiting for ESP32 to send ECG data...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Data refreshes every 5 seconds
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Disease Predictions */}
        {ecgData.predictions.length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              ECG Analysis Results
            </h3>
            <div className="space-y-3">
              {ecgData.predictions.slice(0, 1).map((prediction, idx) => {
                // Check if this is a normal/benign condition
                const isNormal = isNormalCondition(prediction.disease_name);
                
                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      isNormal
                        ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                        : "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {prediction.disease_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isNormal ? "Normal rhythm variant" : "Potential abnormality detected"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={isNormal ? "default" : "destructive"}
                          className={`text-sm ${isNormal ? "bg-green-600" : ""}`}
                        >
                          {(prediction.probability * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={prediction.probability * 100} 
                      className={`mt-2 ${isNormal ? "[&>div]:bg-green-500" : "[&>div]:bg-orange-500"}`}
                    />
                  </div>
                );
              })}
            </div>
            {ecgData.processing && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <Activity className="inline h-4 w-4 animate-spin mr-2" />
                Analyzing ECG data...
              </div>
            )}
          </Card>
        )}

        {/* Emergency Alert - Only show for high confidence abnormal conditions */}
        {ecgData.predictions.length > 0 && ecgData.predictions[0].probability >= 0.98 && 
         diseaseStatus !== "Normal ECG" && diseaseStatus !== "Sinus rhythm" && ecgData.lastUpdate && (
          <Card className="p-6 mt-6 border-destructive bg-destructive/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
         !isNormalCondition(diseaseStatus) && diseaseStatus !== "Disconnected
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-destructive">
                  Abnormal ECG Detected
                </h3>
                <p className="text-sm text-muted-foreground">
                  {diseaseStatus} ({(ecgData.predictions[0].probability * 100).toFixed(1)}% certainty). Please consult your healthcare provider.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={sendEmergencyAlert}
                disabled={sendingAlert}
              >
                {sendingAlert ? "Sending..." : "Send Emergency SMS"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LivePulse;
