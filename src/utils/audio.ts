// Web Audio API Synthesizer for sci-fi HUD sound effects & multilingual speech (English, Malayalam, Hindi)
import { cosmicSpeech } from './speech';

let audioCtx: AudioContext | null = null;
let currentVolume: number = 0.8; // default 80%

export function setSystemVolume(percent: number) {
  currentVolume = Math.max(0, Math.min(1, percent / 100));
}

export function getSystemVolume(): number {
  return Math.round(currentVolume * 100);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Sci-Fi Activation Chime (Ascending frequencies)
export function playChime() {
  if (currentVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

    const baseGain = 0.08 * currentVolume;
    gain.gain.setValueAtTime(baseGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio effect failed:', err);
  }
}

// Confirmation / Action Executed Tone
export function playSuccessTone() {
  if (currentVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      const baseGain = 0.06 * currentVolume;
      gain.gain.setValueAtTime(baseGain, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (err) {
    console.warn('Audio tone failed:', err);
  }
}

// Timer / Alarm Buzzer
export function playAlarmBuzzer() {
  if (currentVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.25;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, start);
      osc.frequency.setValueAtTime(1174.66, start + 0.1);

      const baseGain = 0.12 * currentVolume;
      gain.gain.setValueAtTime(baseGain, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.22);
    }
  } catch (err) {
    console.warn('Alarm buzzer failed:', err);
  }
}

// Subtle UI Click
export function playClick() {
  if (currentVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    const baseGain = 0.04 * currentVolume;
    gain.gain.setValueAtTime(baseGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch (err) {
    // Ignore audio errors
  }
}

// Active speech tracking
let currentAudioElement: HTMLAudioElement | null = null;

export function stopCurrentSpeech() {
  cosmicSpeech.setAssistantSpeaking(false, '');
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Detect language of text: Malayalam, Hindi, or English
export function detectLanguage(text: string): 'ml' | 'hi' | 'en' {
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

// Primary TTS function: Attempts Gemini 3.8 Flash Lite TTS, falls back to Web Speech Synthesis
export async function speakText(
  text: string,
  options?: {
    voice?: string;
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<void> {
  stopCurrentSpeech();

  if (!text || text.trim() === '' || currentVolume <= 0) {
    options?.onEnd?.();
    return;
  }

  // Clean text for speech
  const cleanSpeechText = text
    .replace(/```[\s\S]*?```/g, 'I have displayed the operational telemetry on your HUD, sir.')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[#*`_~]/g, '')
    .trim();

  const lang = options?.lang || detectLanguage(cleanSpeechText);

  try {
    options?.onStart?.();

    // 1. Try Gemini 3.8 Flash Lite TTS endpoint with Bold Butler voice
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanSpeechText.slice(0, 1800),
        voice: options?.voice || 'Charon', // Default to Charon (bold, deep butler baritone)
        lang,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audio) {
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audio}`;
        const audio = new Audio(audioSrc);
        audio.volume = currentVolume;
        currentAudioElement = audio;

        audio.onended = () => {
          cosmicSpeech.setAssistantSpeaking(false, '');
          currentAudioElement = null;
          options?.onEnd?.();
        };

        audio.onerror = () => {
          cosmicSpeech.setAssistantSpeaking(false, '');
          currentAudioElement = null;
          fallbackWebSpeech(cleanSpeechText, lang, options);
        };

        cosmicSpeech.setAssistantSpeaking(true, cleanSpeechText);
        await audio.play();
        return;
      }
    }

    // Fallback if API returned non-audio
    fallbackWebSpeech(cleanSpeechText, lang, options);
  } catch (error) {
    console.warn('Gemini TTS failed, using browser speech synthesis fallback:', error);
    fallbackWebSpeech(cleanSpeechText, lang, options);
  }
}

// Browser Web Speech API Fallback tuned to Bold British Butler / Malayalam / Hindi
function fallbackWebSpeech(
  text: string,
  lang: 'ml' | 'hi' | 'en' | string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = currentVolume;

  const voices = synth.getVoices();

  if (lang === 'ml') {
    utterance.lang = 'ml-IN';
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    const mlVoice = voices.find(
      (v) =>
        v.lang === 'ml-IN' ||
        v.lang.startsWith('ml') ||
        v.name.toLowerCase().includes('malayalam') ||
        v.lang === 'en-IN' ||
        v.lang === 'hi-IN'
    );
    if (mlVoice) utterance.voice = mlVoice;
  } else if (lang === 'hi') {
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 0.92;
    const hiVoice = voices.find(
      (v) =>
        v.lang === 'hi-IN' ||
        v.lang.startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('kalpana') ||
        v.name.toLowerCase().includes('lekha')
    );
    if (hiVoice) utterance.voice = hiVoice;
  } else {
    // English Bold British Royal Butler
    utterance.lang = 'en-GB';
    utterance.rate = 0.98; // Dignified, deliberate, crisp cadence
    utterance.pitch = 0.88; // Deep resonant baritone for a bold loyal butler

    const preferredVoice = voices.find(
      (v) =>
        v.name.includes('Daniel') ||
        v.name.includes('Google UK English Male') ||
        v.name.includes('Oliver') ||
        v.name.includes('Arthur') ||
        v.name.includes('George') ||
        (v.lang === 'en-GB' && v.name.includes('Male')) ||
        (v.lang.startsWith('en') && v.name.includes('Male')) ||
        v.name.includes('Natural')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
  }

  utterance.onstart = () => {
    cosmicSpeech.setAssistantSpeaking(true, text);
    options?.onStart?.();
  };

  utterance.onend = () => {
    cosmicSpeech.setAssistantSpeaking(false, '');
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    cosmicSpeech.setAssistantSpeaking(false, '');
    console.warn('Web speech synthesis error:', e);
    options?.onEnd?.();
  };

  synth.speak(utterance);
}
