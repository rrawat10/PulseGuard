/**
 * Text-to-Speech Engine for Audio Reports
 * - English: Web Speech API (browser-based, free)
 * - Hindi/Punjabi: Sarvam AI (API-based, high quality)
 */

import { supabase } from '@/integrations/supabase/client';

export type SupportedLanguage = 'english' | 'hindi' | 'punjabi';

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface SarvamTTSResponse {
  success: boolean;
  audio_base64?: string;
  error?: string;
  language?: string;
  speaker?: string;
}

const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  english: 'en-US',
  hindi: 'hi-IN',
  punjabi: 'pa-IN'
};

class TTSEngine {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
      
      // Chrome needs this event listener to load voices
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices(): void {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices();
    }
  }

  /**
   * Call Sarvam AI TTS API via Supabase Edge Function
   */
  private async generateSarvamTTS(
    text: string, 
    language: 'hindi' | 'punjabi'
  ): Promise<string> {
    const languageCode = language === 'hindi' ? 'hi-IN' : 'pa-IN';
    
    console.log(`Calling Sarvam AI for ${language} TTS...`);
    console.log(`Text preview: ${text.substring(0, 100)}...`);

    const { data, error } = await supabase.functions.invoke('sarvam-tts', {
      body: {
        text,
        language_code: languageCode,
      }
    });

    if (error) {
      console.error('Sarvam TTS error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to generate ${language} audio: ${error.message}`);
    }

    console.log('Sarvam API response:', data);

    if (!data || !data.success) {
      const errorMsg = data?.error || 'Unknown error from TTS service';
      console.error('TTS service error:', errorMsg);
      throw new Error(errorMsg);
    }

    if (!data.audio_base64) {
      throw new Error('No audio data received from TTS service');
    }

    console.log(`Sarvam TTS successful: ${language} audio generated (${data.audio_base64.length} chars)`);
    return data.audio_base64;
  }

  /**
   * Play audio from base64 string
   */
  private playBase64Audio(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      // Convert base64 to audio blob
      const audioBlob = this.base64ToBlob(base64Audio);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (event) => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(new Error('Audio playback error'));
      };

      audio.play().catch(err => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(err);
      });
    });
  }

  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:audio\/\w+;base64,/, '');
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'audio/wav' });
  }

  private findVoice(languageCode: string): SpeechSynthesisVoice | null {
    // Refresh voices in case they weren't loaded yet
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const langPrefix = languageCode.split('-')[0]; // e.g., 'hi' from 'hi-IN'

    // Priority 1: Find exact match (e.g., 'hi-IN')
    let voice = this.voices.find(v => v.lang === languageCode);
    
    // Priority 2: Find language family match with local voice (better quality)
    if (!voice) {
      voice = this.voices.find(v => 
        v.lang.startsWith(langPrefix) && v.localService === true
      );
    }

    // Priority 3: Find any language family match
    if (!voice) {
      voice = this.voices.find(v => v.lang.startsWith(langPrefix));
    }

    // Priority 4: For Hindi, also check for 'hin' code
    if (!voice && langPrefix === 'hi') {
      voice = this.voices.find(v => v.lang.startsWith('hin'));
    }

    // Priority 5: For Punjabi, also check alternative codes
    if (!voice && langPrefix === 'pa') {
      voice = this.voices.find(v => 
        v.lang.startsWith('pan') || v.lang.startsWith('pnb')
      );
    }

    console.log(`Voice search for ${languageCode}:`, voice ? 
      `Found: ${voice.name} (${voice.lang})` : 'No voice found');

    return voice || null;
  }

  /**
   * Check if a specific language has native voice support
   * For Hindi/Punjabi, returns true (Sarvam AI)
   * For English, checks Web Speech API
   */
  hasVoiceForLanguage(language: SupportedLanguage): boolean {
    // Hindi and Punjabi use Sarvam AI (always available)
    if (language === 'hindi' || language === 'punjabi') {
      console.log(`hasVoiceForLanguage(${language}): true (Sarvam AI)`);
      return true;
    }

    // English uses Web Speech API
    const languageCode = LANGUAGE_CODES[language];
    const langPrefix = languageCode.split('-')[0];
    
    // Refresh voices
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const hasVoice = this.voices.some(v => 
      v.lang === languageCode || 
      v.lang.startsWith(langPrefix)
    );
    
    console.log(`hasVoiceForLanguage(${language}): ${hasVoice} (Web Speech API)`);
    return hasVoice;
  }

  /**
   * Get the best available voice for a language with details
   * Hindi/Punjabi always return success (Sarvam AI)
   */
  getBestVoiceForLanguage(language: SupportedLanguage): {
    voice: SpeechSynthesisVoice | null;
    isNative: boolean;
    warning?: string;
  } {
    // Hindi and Punjabi use Sarvam AI
    if (language === 'hindi' || language === 'punjabi') {
      console.log(`getBestVoiceForLanguage(${language}): Using Sarvam AI`);
      return {
        voice: null, // Not using Web Speech API
        isNative: true,
        warning: undefined
      };
    }

    // English uses Web Speech API
    const languageCode = LANGUAGE_CODES[language];
    const voice = this.findVoice(languageCode);
    
    if (!voice) {
      console.log(`getBestVoiceForLanguage(${language}): No voice found`);
      return {
        voice: null,
        isNative: false,
        warning: `No voice available for ${language}. Text-to-speech may not work properly.`
      };
    }

    const langPrefix = languageCode.split('-')[0];
    const isNative = voice.lang === languageCode || voice.lang.startsWith(langPrefix);

    console.log(`getBestVoiceForLanguage(${language}): Found ${voice.name}, isNative: ${isNative}`);

    if (!isNative) {
      return {
        voice,
        isNative: false,
        warning: `Using fallback voice. ${language} may not sound natural.`
      };
    }

    return {
      voice,
      isNative: true
    };
  }

  /**
   * Check if TTS is supported in the current browser
   */
  isSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get list of available voices for a language
   */
  getAvailableVoices(language: SupportedLanguage): SpeechSynthesisVoice[] {
    const languageCode = LANGUAGE_CODES[language];
    const langPrefix = languageCode.split('-')[0];
    
    return this.voices.filter(v => 
      v.lang === languageCode || v.lang.startsWith(langPrefix)
    );
  }

  /**
   * Speak the given text
   * - English: Uses Web Speech API
   * - Hindi/Punjabi: Uses Sarvam AI
   */
  async speak(
    text: string, 
    language: SupportedLanguage,
    options: TTSOptions = {}
  ): Promise<void> {
    // Stop any ongoing speech/audio
    this.stop();

    // For Hindi and Punjabi, use Sarvam AI
    if (language === 'hindi' || language === 'punjabi') {
      try {
        console.log(`Using Sarvam AI for ${language} TTS`);
        const audioBase64 = await this.generateSarvamTTS(text, language);
        await this.playBase64Audio(audioBase64);
      } catch (error) {
        console.error(`Sarvam AI TTS failed for ${language}:`, error);
        throw error;
      }
      return;
    }

    // For English, use Web Speech API
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const languageCode = LANGUAGE_CODES[language];
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language and voice
      utterance.lang = languageCode;
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // Find and set appropriate voice
      const voiceInfo = this.getBestVoiceForLanguage(language);
      if (voiceInfo.voice) {
        utterance.voice = voiceInfo.voice;
        console.log(`Using voice: ${voiceInfo.voice.name} (${voiceInfo.voice.lang})`);
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      console.log(`Speaking ${language} via Web Speech API, text length: ${text.length}`);

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Pause ongoing speech
   */
  pause(): void {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Stop ongoing speech (Web Speech API or audio playback)
   */
  stop(): void {
    // Stop Web Speech API
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }

    // Stop audio playback (Sarvam AI)
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  /**
   * Check if currently speaking (Web Speech API or audio playing)
   */
  isSpeaking(): boolean {
    const webSpeaking = this.synthesis?.speaking || false;
    const audioPlaying = this.currentAudio && !this.currentAudio.paused;
    return webSpeaking || !!audioPlaying;
  }

  /**
   * Check if speech is paused
   */
  isPaused(): boolean {
    return this.synthesis?.paused || false;
  }
}

// Singleton instance
let ttsInstance: TTSEngine | null = null;

export function getTTSEngine(): TTSEngine {
  if (!ttsInstance) {
    ttsInstance = new TTSEngine();
  }
  return ttsInstance;
}

/**
 * Convenience function to speak audio report
 */
export async function speakAudioReport(
  text: string,
  language: SupportedLanguage,
  options?: TTSOptions
): Promise<void> {
  const tts = getTTSEngine();
  
  if (!tts.isSupported()) {
    throw new Error('Text-to-speech is not supported in this browser');
  }

  return tts.speak(text, language, options);
}

/**
 * Stop any ongoing speech
 */
export function stopSpeech(): void {
  const tts = getTTSEngine();
  tts.stop();
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  const tts = getTTSEngine();
  return tts.isSpeaking();
}

/**
 * Get available voices for a language
 */
export function getVoicesForLanguage(language: SupportedLanguage): SpeechSynthesisVoice[] {
  const tts = getTTSEngine();
  return tts.getAvailableVoices(language);
}

/**
 * Check if a language has native voice support
 */
export function hasNativeVoice(language: SupportedLanguage): boolean {
  const tts = getTTSEngine();
  return tts.hasVoiceForLanguage(language);
}

/**
 * Get voice information for a language
 */
export function getVoiceInfo(language: SupportedLanguage): {
  voice: SpeechSynthesisVoice | null;
  isNative: boolean;
  warning?: string;
} {
  const tts = getTTSEngine();
  return tts.getBestVoiceForLanguage(language);
}
