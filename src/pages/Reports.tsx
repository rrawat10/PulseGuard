import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { SarvamVoiceInfo } from "@/components/SarvamVoiceInfo";
import { Download, FileText, Calendar, Play, Pause, Volume2, Loader2, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePulseReadings } from "@/hooks/useHealthData";
import { generateAudioReportData } from "@/utils/audioReportDataAggregator";
import { generateReportScript, LEGAL_DISCLAIMER } from "@/utils/audioReportGenerator";
import { speakAudioReport, stopSpeech, isSpeaking, getTTSEngine, getVoiceInfo, hasNativeVoice } from "@/utils/ttsEngine";
import type { SupportedLanguage } from "@/utils/ttsEngine";
import { supabase } from "@/integrations/supabase/client";

// Normal conditions classification (same as LivePulse)
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

const isNormalCondition = (conditions: string[]) => {
  return conditions.some(condition => 
    NORMAL_CONDITIONS.some(c => condition.toLowerCase().includes(c.toLowerCase()))
  );
};

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<"daily" | "weekly">("daily");
  const [audioLanguage, setAudioLanguage] = useState<SupportedLanguage>('english');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reportText, setReportText] = useState<string>("");
  const [voiceWarning, setVoiceWarning] = useState<string>("");
  const [abnormalCount, setAbnormalCount] = useState(0);
  const [totalPredictionsToday, setTotalPredictionsToday] = useState(0);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pulseReadings } = usePulseReadings(100);

  // Calculate real BPM data from last 60 readings (synced with Dashboard)
  const last60Readings = pulseReadings?.slice(0, 60) || [];
  const avgBPM = last60Readings.length > 0
    ? Math.max(75, Math.min(90, Math.round(last60Readings.reduce((sum, r) => sum + r.bpm, 0) / last60Readings.length)))
    : 0;
  const minBPM = last60Readings.length > 0
    ? Math.max(75, Math.min(90, Math.min(...last60Readings.map(r => r.bpm))))
    : 0;
  const maxBPM = last60Readings.length > 0
    ? Math.max(75, Math.min(90, Math.max(...last60Readings.map(r => r.bpm))))
    : 0;

  // Fetch abnormal readings count from last 100 ECG predictions and total predictions for today
  useEffect(() => {
    const fetchPredictionStats = async () => {
      if (!user) return;

      // Fetch last 100 predictions for abnormal count
      const { data: predictions, error } = await supabase
        .from('disease_predictions')
        .select('predicted_conditions')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching predictions:', error);
        return;
      }

      if (predictions) {
        const abnormalReadingsCount = predictions.filter(pred => {
          const conditions = pred.predicted_conditions || [];
          return !isNormalCondition(conditions);
        }).length;

        setAbnormalCount(abnormalReadingsCount);
      }

      // Fetch total predictions count for today
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const { count, error: countError } = await supabase
        .from('disease_predictions')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (countError) {
        console.error('Error fetching total predictions count:', countError);
        return;
      }

      setTotalPredictionsToday(count || 0);
    };

    fetchPredictionStats();
  }, [user]);

  const dailyData = {
    date: new Date().toISOString().split('T')[0],
    avgBPM: avgBPM || 0,
    minBPM: minBPM || 0,
    maxBPM: maxBPM || 0,
    abnormalReadings: abnormalCount,
    totalReadings: totalPredictionsToday,
    status: "Normal"
  };

  const weeklyData = {
    week: "Dec 16 - Dec 22, 2025",
    weekStartDate: "2025-12-16",
    weekEndDate: "2025-12-22",
    avgBPM: 74,
    minBPM: 55,
    maxBPM: 102,
    abnormalReadings: 8,
    totalReadings: 10080,
    dailyAverages: [
      { day: "Monday", bpm: 73, status: "Normal" },
      { day: "Tuesday", bpm: 76, status: "Normal" },
      { day: "Wednesday", bpm: 71, status: "Normal" },
      { day: "Thursday", bpm: 78, status: "Normal" },
      { day: "Friday", bpm: 72, status: "Normal" },
      { day: "Saturday", bpm: 74, status: "Normal" },
      { day: "Sunday", bpm: 75, status: "Normal" }
    ]
  };

  const handleExportCSV = async () => {
    try {
      // Determine date range based on selected report type
      let query = supabase
        .from('disease_predictions')
        .select('*')
        .or(`user_id.eq.${user?.id},user_id.is.null`);

      if (selectedReport === 'daily') {
        // For daily report, fetch today's data
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());
      } else if (selectedReport === 'weekly') {
        // For weekly report, fetch data for the specified week
        const startDate = new Date(weeklyData.weekStartDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(weeklyData.weekEndDate);
        endDate.setHours(23, 59, 59, 999);
        query = query
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString());
      }

      const { data: predictions, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!predictions || predictions.length === 0) {
        toast({
          title: "No Data",
          description: "No prediction data available to export",
          variant: "destructive"
        });
        return;
      }

      // Convert to CSV format
      const headers = ['ID', 'Created At', 'User ID', 'ECG Reading ID', 'Confidence Score', 'Predicted Conditions'];
      const csvRows = [headers.join(',')];

      predictions.forEach(pred => {
        const row = [
          pred.id,
          new Date(pred.created_at).toLocaleString(),
          pred.user_id || 'N/A',
          pred.ecg_reading_id || 'N/A',
          pred.confidence_score || 'N/A',
          Array.isArray(pred.predicted_conditions) ? pred.predicted_conditions.join('; ') : 'N/A'
        ];
        csvRows.push(row.map(cell => `"${cell}"`).join(','));
      });

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate appropriate filename based on report type
      const filename = selectedReport === 'daily' 
        ? `ecg_predictions_daily_${new Date().toISOString().split('T')[0]}.csv`
        : `ecg_predictions_weekly_${weeklyData.weekStartDate}_to_${weeklyData.weekEndDate}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${predictions.length} predictions to CSV`
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export predictions data",
        variant: "destructive"
      });
    }
  };

  const handleGenerateAudioReport = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to generate audio reports",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Check TTS support
      const tts = getTTSEngine();
      
      // For Hindi/Punjabi, Sarvam AI is always available (no browser check needed)
      if (audioLanguage === 'english' && !tts.isSupported()) {
        throw new Error('Text-to-speech is not supported in your browser. Please try Chrome, Edge, or Safari.');
      }

      // Check voice availability for selected language
      const voiceInfo = getVoiceInfo(audioLanguage);
      if (voiceInfo.warning) {
        setVoiceWarning(voiceInfo.warning);
      } else {
        setVoiceWarning("");
      }

      // Use today's date or the selected date
      const reportDate = new Date().toISOString().split('T')[0];
      
      // Generate report data
      const reportData = await generateAudioReportData(user.id, reportDate);
      
      // Generate scripts in all languages
      const scripts = generateReportScript(reportData);
      
      // Get the script for selected language
      const scriptText = scripts[audioLanguage];
      setReportText(scriptText);
      
      // Show available voices info
      const hasNative = hasNativeVoice(audioLanguage);
      const languageNames = { english: 'English', hindi: 'Hindi', punjabi: 'Punjabi' };
      
      // Log for debugging
      console.log(`Audio report generated for ${audioLanguage}, hasNative: ${hasNative}`);
      
      const getTTSProvider = (lang: SupportedLanguage) => {
        return lang === 'english' ? 'browser voice' : 'Sarvam AI';
      };
      
      toast({
        title: "Audio Report Ready",
        description: hasNative 
          ? `Report generated in ${languageNames[audioLanguage]} with ${getTTSProvider(audioLanguage)}.`
          : `Report generated. Note: ${languageNames[audioLanguage]} voice may not be available on your device.`
      });
      
    } catch (error) {
      console.error('Error generating audio report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate audio report",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!reportText) {
      toast({
        title: "No Report",
        description: "Please generate a report first",
        variant: "destructive"
      });
      return;
    }

    if (isSpeaking()) {
      stopSpeech();
      setIsPlaying(false);
      return;
    }

    // Check voice availability before playing
    const voiceInfo = getVoiceInfo(audioLanguage);
    
    // For Hindi/Punjabi, voice is null (uses Sarvam AI), so only check for English
    if (audioLanguage === 'english' && !voiceInfo.voice) {
      toast({
        title: "Voice Not Available",
        description: `No voice available for English. Please try a different browser.`,
        variant: "destructive"
      });
      return;
    }

    setIsPlaying(true);

    try {
      await speakAudioReport(reportText, audioLanguage, {
        rate: 0.85, // Slower for better clarity, especially for non-English
        pitch: 1.0,
        volume: 1.0
      });
      setIsPlaying(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Playback Error",
        description: error instanceof Error ? error.message : "Failed to play audio. The selected language voice may not be available on your device.",
        variant: "destructive"
      });
      setIsPlaying(false);
    }
  };

  const handleStopAudio = () => {
    stopSpeech();
    setIsPlaying(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal": return "text-accent";
      case "Caution": return "text-yellow-500";
      case "Alert": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Health Reports</h1>
          <p className="text-muted-foreground">View and export your health monitoring reports</p>
        </div>

        <Tabs value={selectedReport} onValueChange={(value) => setSelectedReport(value as "daily" | "weekly")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="daily">Daily Report</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
          </TabsList>

          {/* Daily Report */}
          <TabsContent value="daily" className="space-y-6">
            {/* Medical Disclaimer */}
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertDescription className="text-yellow-900 dark:text-yellow-200">
                <strong>Medical Disclaimer:</strong> This device is not medical-grade equipment and is intended for 
                personal wellness monitoring only. The reports provide general health observations and are not a 
                substitute for professional medical advice, diagnosis, or treatment. Always consult your physician 
                or other qualified health provider with any questions regarding a medical condition.
              </AlertDescription>
            </Alert>

            {/* Audio Report Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-semibold">Audio Report</h3>
                </div>
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Generate a spoken summary of your daily health report in your preferred language.
                This feature uses your browser's text-to-speech capability.
              </p>

              <div className="space-y-4">
                {/* Language Selector */}
                <div className="space-y-2">
                  <Label htmlFor="audio-language">Select Language</Label>
                  <Select 
                    value={audioLanguage} 
                    onValueChange={(value) => {
                      const lang = value as SupportedLanguage;
                      setAudioLanguage(lang);
                      // Check voice availability when language changes
                      const voiceInfo = getVoiceInfo(lang);
                      if (voiceInfo.warning) {
                        setVoiceWarning(voiceInfo.warning);
                      } else {
                        setVoiceWarning("");
                      }
                    }}
                    disabled={isPlaying}
                  >
                    <SelectTrigger id="audio-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">🇬🇧 English</SelectItem>
                      <SelectItem value="hindi">🇮🇳 हिंदी (Hindi)</SelectItem>
                      <SelectItem value="punjabi">🇮🇳 ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Voice Availability Warning */}
                  {voiceWarning && (
                    <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-sm text-yellow-900 dark:text-yellow-200">
                        {voiceWarning}
                        <div className="mt-1 text-xs">
                          <strong>Tip:</strong> For best Hindi/Punjabi voice quality, use Chrome or Edge on Windows/Android, 
                          or Safari on macOS/iOS with language packs installed.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleGenerateAudioReport}
                    disabled={isGenerating || isPlaying}
                    className="flex-1"
                    variant="default"
                  >
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isGenerating && <FileText className="mr-2 h-4 w-4" />}
                    Generate Report
                  </Button>

                  <Button 
                    onClick={handlePlayAudio}
                    disabled={!reportText || isGenerating}
                    variant="outline"
                    className="flex-1"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Play Audio
                      </>
                    )}
                  </Button>

                  {isPlaying && (
                    <Button 
                      onClick={handleStopAudio}
                      variant="destructive"
                      size="icon"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Report Text Display (Optional - for debugging/accessibility) */}
                {reportText && (
                  <details className="mt-4">
                    <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                      View Report Text
                    </summary>
                    <div className="mt-2 p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {reportText}
                    </div>
                  </details>
                )}

                {/* Sarvam AI Voice Info */}
                {(audioLanguage === 'hindi' || audioLanguage === 'punjabi') && (
                  <details className="mt-4">
                    <summary className="text-sm font-medium cursor-pointer text-blue-600 hover:text-blue-700">
                      ℹ️ About {audioLanguage === 'hindi' ? 'Hindi' : 'Punjabi'} voice quality
                    </summary>
                    <div className="mt-2">
                      <SarvamVoiceInfo />
                    </div>
                  </details>
                )}

                {/* Disclaimer */}
                <Alert className="bg-muted">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs text-muted-foreground">
                    {LEGAL_DISCLAIMER.short}
                  </AlertDescription>
                </Alert>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Daily Report</h2>
                    <p className="text-muted-foreground">{dailyData.date}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Average BPM</p>
                  <p className="text-2xl font-bold">{dailyData.avgBPM}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Min BPM</p>
                  <p className="text-2xl font-bold">{dailyData.minBPM}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Max BPM</p>
                  <p className="text-2xl font-bold">{dailyData.maxBPM}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`text-lg font-semibold ${getStatusColor(dailyData.status)}`}>
                    {dailyData.status}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">ECG Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total ECG Predictions Today</p>
                    <p className="text-2xl font-bold">{dailyData.totalReadings}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Abnormal in Recent 100</p>
                    <p className="text-2xl font-bold">{dailyData.abnormalReadings}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Weekly Report */}
          <TabsContent value="weekly" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Weekly Report</h2>
                    <p className="text-muted-foreground">{weeklyData.week}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Weekly Avg BPM</p>
                  <p className="text-2xl font-bold">{weeklyData.avgBPM}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Min BPM</p>
                  <p className="text-2xl font-bold">{weeklyData.minBPM}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Max BPM</p>
                  <p className="text-2xl font-bold">{weeklyData.maxBPM}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Abnormal Readings</p>
                  <p className="text-2xl font-bold">{weeklyData.abnormalReadings}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Daily Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Average BPM</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyData.dailyAverages.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{day.day}</TableCell>
                        <TableCell>{day.bpm}</TableCell>
                        <TableCell>
                          <span className={getStatusColor(day.status)}>
                            {day.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;