// Web Audio API Synthesizer for sci-fi HUD sound effects & speech

let audioCtx: AudioContext | null = null;

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

    gain.gain.setValueAtTime(0.08, now);
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

      gain.gain.setValueAtTime(0.06, start);
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

      gain.gain.setValueAtTime(0.12, start);
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
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.04, now);
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
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Primary TTS function: Attempts Gemini 3.8 Flash Lite TTS, falls back to Web Speech Synthesis
export async function speakText(
  text: string,
  options?: {
    voice?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<void> {
  stopCurrentSpeech();

  if (!text || text.trim() === '') {
    options?.onEnd?.();
    return;
  }

  // Clean text for speech
  const cleanSpeechText = text
    .replace(/```[\s\S]*?```/g, 'Details are displayed on your screen, sir.')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[#*`_~]/g, '')
    .trim();

  try {
    options?.onStart?.();

    // 1. Try Gemini 3.8 Flash Lite TTS endpoint
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanSpeechText.slice(0, 300),
        voice: options?.voice || 'Fenrir',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audio) {
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audio}`;
        const audio = new Audio(audioSrc);
        currentAudioElement = audio;

        audio.onended = () => {
          currentAudioElement = null;
          options?.onEnd?.();
        };

        audio.onerror = () => {
          currentAudioElement = null;
          fallbackWebSpeech(cleanSpeechText, options);
        };

        await audio.play();
        return;
      }
    }

    // Fallback if API returned non-audio
    fallbackWebSpeech(cleanSpeechText, options);
  } catch (error) {
    console.warn('Gemini TTS failed, using browser speech synthesis fallback:', error);
    fallbackWebSpeech(cleanSpeechText, options);
  }
}

// Browser Web Speech API Fallback
function fallbackWebSpeech(
  text: string,
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
  utterance.rate = 1.05;
  utterance.pitch = 0.95; // Slightly lower pitch for JARVIS aesthetic

  // Try to pick a crisp English voice
  const voices = synth.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      v.name.includes('Daniel') ||
      v.name.includes('Oliver') ||
      v.name.includes('Google UK English Male') ||
      (v.lang.startsWith('en') && v.name.includes('Male')) ||
      v.name.includes('Natural') ||
      v.lang.startsWith('en')
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn('Web speech synthesis error:', e);
    options?.onEnd?.();
  };

  synth.speak(utterance);
}
