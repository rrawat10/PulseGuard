import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PulseReading {
  id: string;
  bpm: number;
  signal_strength: number;
  health_status: string;
  is_emergency: boolean;
  created_at: string;
}

interface HealthReport {
  id: string;
  report_type: 'daily' | 'weekly';
  report_date: string;
  avg_bpm: number;
  min_bpm: number;
  max_bpm: number;
  total_readings: number;
  emergency_count: number;
  abnormal_readings: any;
}

export const generateDailyReport = async (userId: string, date: string) => {
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const { data: readings, error } = await supabase
    .from('pulse_readings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!readings || readings.length === 0) {
    return null;
  }

  const bpmValues = readings.map(r => r.bpm);
  const emergencyReadings = readings.filter(r => r.is_emergency);
  const abnormalReadings = readings.filter(r => r.health_status !== 'normal');

  const report = {
    report_type: 'daily' as const,
    report_date: date,
    avg_bpm: bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length,
    min_bpm: Math.min(...bpmValues),
    max_bpm: Math.max(...bpmValues),
    total_readings: readings.length,
    emergency_count: emergencyReadings.length,
    abnormal_readings: abnormalReadings.map(r => ({
      time: r.created_at,
      bpm: r.bpm,
      status: r.health_status
    }))
  };

  // Store the report in database
  const { data: savedReport, error: saveError } = await supabase
    .from('health_reports')
    .upsert({
      user_id: userId,
      ...report
    })
    .select()
    .single();

  if (saveError) throw saveError;

  return { report: savedReport, readings };
};

export const generateWeeklyReport = async (userId: string, weekStart: string) => {
  const startDate = new Date(weekStart);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 7);

  const { data: readings, error } = await supabase
    .from('pulse_readings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!readings || readings.length === 0) {
    return null;
  }

  const bpmValues = readings.map(r => r.bpm);
  const emergencyReadings = readings.filter(r => r.is_emergency);
  const abnormalReadings = readings.filter(r => r.health_status !== 'normal');

  const report = {
    report_type: 'weekly' as const,
    report_date: weekStart,
    avg_bpm: bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length,
    min_bpm: Math.min(...bpmValues),
    max_bpm: Math.max(...bpmValues),
    total_readings: readings.length,
    emergency_count: emergencyReadings.length,
    abnormal_readings: abnormalReadings.map(r => ({
      time: r.created_at,
      bpm: r.bpm,
      status: r.health_status
    }))
  };

  // Store the report in database
  const { data: savedReport, error: saveError } = await supabase
    .from('health_reports')
    .upsert({
      user_id: userId,
      ...report
    })
    .select()
    .single();

  if (saveError) throw saveError;

  return { report: savedReport, readings };
};

export const exportReportToPDF = async (
  report: HealthReport,
  readings: PulseReading[],
  userProfile: any
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Health Monitoring Report', 20, 20);
  
  // User info
  doc.setFontSize(12);
  doc.text(`Patient: ${userProfile?.full_name || 'Unknown'}`, 20, 35);
  doc.text(`Age: ${userProfile?.age || 'Unknown'}`, 20, 45);
  doc.text(`Report Type: ${report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}`, 20, 55);
  doc.text(`Report Date: ${new Date(report.report_date).toLocaleDateString()}`, 20, 65);
  
  // Summary statistics
  doc.setFontSize(14);
  doc.text('Summary Statistics', 20, 85);
  doc.setFontSize(11);
  doc.text(`Average BPM: ${Math.round(report.avg_bpm)}`, 20, 100);
  doc.text(`Min BPM: ${report.min_bpm}`, 20, 110);
  doc.text(`Max BPM: ${report.max_bpm}`, 20, 120);
  doc.text(`Total Readings: ${report.total_readings}`, 20, 130);
  doc.text(`Emergency Alerts: ${report.emergency_count}`, 20, 140);
  
  // Abnormal readings table
  if (report.abnormal_readings && report.abnormal_readings.length > 0) {
    doc.setFontSize(14);
    doc.text('Abnormal Readings', 20, 160);
    
    const tableData = report.abnormal_readings.map((reading: any) => [
      new Date(reading.time).toLocaleString(),
      reading.bpm.toString(),
      reading.status.replace('_', ' ').toUpperCase()
    ]);
    
    (doc as any).autoTable({
      head: [['Time', 'BPM', 'Status']],
      body: tableData,
      startY: 170,
      theme: 'grid',
      styles: { fontSize: 10 }
    });
  }
  
  // Save the PDF
  const fileName = `health-report-${report.report_type}-${report.report_date}.pdf`;
  doc.save(fileName);
};

export const exportReportToCSV = (
  report: HealthReport,
  readings: PulseReading[]
) => {
  const headers = ['Timestamp', 'BPM', 'Signal Strength', 'Health Status', 'Emergency'];
  const csvData = readings.map(reading => [
    new Date(reading.created_at).toISOString(),
    reading.bpm,
    reading.signal_strength,
    reading.health_status,
    reading.is_emergency
  ]);
  
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `health-data-${report.report_type}-${report.report_date}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};