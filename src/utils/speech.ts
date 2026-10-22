// Voice Recognition & Full-Duplex Wake-Word Listening Engine (English, Malayalam, Hindi)
// With Advanced Acoustic Echo Cancellation (AEC), Anti-Feedback Loop Shields & Mobile Loudspeaker Isolation

export type SpeechCallback = (transcript: string, isFinal: boolean) => void;
export type WakeWordCallback = (commandAfterWakeWord: string) => void;
export type BargeInCallback = (type: 'stop' | 'wake_word' | 'new_query', text: string) => void;

export function isMobilePhone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent || ''
    ) || ('ontouchstart' in window && window.innerWidth < 1024)
  );
}

const WAKE_WORDS = [
  'hey cosmic',
  'ok cosmic',
  'okay cosmic',
  'cosmic',
  'jarvis',
  'computer',
  'ഹേയ് കോസ്മിക്',
  'ഹലോ കോസ്മിക്',
  'കോസ്മിക്',
  'കോസ്മിക്ക്',
  'हे कॉस्मिक',
  'नमस्ते कॉस्मिक',
  'कॉस्मिक',
  'सुनो कॉस्मिक',
];

export const INTERRUPT_WORDS = [
  'stop cosmic',
  'cosmic stop',
  'stop talking',
  'cosmic stop talking',
  'shut up cosmic',
  'cosmic shut up',
  'be quiet cosmic',
  'cosmic be quiet',
  'stop',
  'wait',
  'hold on',
  'quiet',
  'be quiet',
  'pause',
  'shut up',
  'hush',
  'silence',
  'cancel',
  'enough',
  // Malayalam interruption words
  'നിർത്തൂ',
  'മതി',
  'ശാന്തമാകൂ',
  'പോരൂ',
  'നിൽക്ക്',
  'നിർത്ത്',
  'കോസ്മിക് നിർത്തൂ',
  'കോസ്മിക് നിർത്ത്',
  // Hindi interruption words
  'रुको',
  'चुप',
  'ठहरो',
  'बस',
  'शांत',
  'बंद करो',
  'रहने दो',
  'कॉस्मिक रुको',
  'कॉस्मिक चुप',
];

export function isStopOrInterruptPhrase(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return INTERRUPT_WORDS.some((word) => {
    return lower === word || lower.startsWith(word + ' ') || lower.endsWith(' ' + word) || lower.includes(word);
  });
}

export class CosmicSpeechRecognizer {
  private recognition: any = null;
  private isContinuousMode = false;
  private isListening = false;
  private currentLanguage = 'en-US';
  private onTranscriptCallback: SpeechCallback | null = null;
  private onWakeWordCallback: WakeWordCallback | null = null;
  private onBargeInCallback: BargeInCallback | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((listening: boolean) => void) | null = null;
  private shouldRestart = false;

  // Phone & Acoustic Echo Cancellation State
  private isAssistantSpeaking = false;
  private pauseForPhonePlayback = false;
  private recentSpokenText = '';
  private recentSpokenWords: Set<string> = new Set();
  private speechEndedTimestamp = 0;
  private phoneUnmuteTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;

        this.setupHandlers();
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public setLanguage(lang: 'en-US' | 'ml-IN' | 'hi-IN' | string) {
    this.currentLanguage = lang;
    if (this.recognition) {
      const wasListening = this.isListening;
      this.recognition.lang = lang;
      if (wasListening) {
        this.stopListening();
        setTimeout(() => this.startListening(this.isContinuousMode), 200);
      }
    }
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  // Called when assistant starts or stops speech output
  public setAssistantSpeaking(speaking: boolean, text: string = '') {
    this.isAssistantSpeaking = speaking;

    if (speaking) {
      this.recentSpokenText = text;
      // Index spoken words to detect and eliminate any acoustic bleed
      const words = text
        .toLowerCase()
        .replace(/[^\w\s\u0D00-\u0D7F\u0900-\u097F]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      words.forEach((w) => this.recentSpokenWords.add(w));

      if (this.phoneUnmuteTimer) {
        clearTimeout(this.phoneUnmuteTimer);
        this.phoneUnmuteTimer = null;
      }

      // Keep microphone active so user can say "stop cosmic", "stop", "be quiet" at any time.
      if (this.shouldRestart && !this.isListening) {
        try {
          this.recognition?.start();
        } catch (e) {}
      }
    } else {
      // Speech playback ended
      this.speechEndedTimestamp = Date.now();
      this.pauseForPhonePlayback = false;

      if (this.phoneUnmuteTimer) clearTimeout(this.phoneUnmuteTimer);
      if (this.shouldRestart && !this.isListening) {
        setTimeout(() => {
          try {
            if (this.shouldRestart && !this.isListening) {
              this.recognition?.start();
            }
          } catch (e) {}
        }, 150);
      }

      // Retain memory of recently spoken words for 15 seconds
      setTimeout(() => {
        this.recentSpokenWords.clear();
      }, 15000);
    }
  }

  public getIsAssistantSpeaking(): boolean {
    return this.isAssistantSpeaking;
  }

  private setupHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChangeCallback?.(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChangeCallback?.(false);

      if (this.shouldRestart) {
        setTimeout(() => {
          try {
            if (this.shouldRestart && !this.isListening) {
              this.recognition.start();
            }
          } catch (e) {
            // Already started or busy
          }
        }, 200);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.onErrorCallback?.(event.error);
      }
      if (this.shouldRestart) {
        setTimeout(() => {
          try {
            if (this.shouldRestart && !this.isListening) {
              this.recognition.start();
            }
          } catch (e) {}
        }, 300);
      }
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0].transcript;
        if (item.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      const activeText = (finalTranscript || interimTranscript).trim();
      if (!activeText) return;

      const isFinal = itemIsFinal(event.results);
      const lower = activeText.toLowerCase();

      // 1. INSTANT STOP INTERRUPT CHECK:
      // If the user says "stop cosmic", "stop", "be quiet", "shut up", cut off IMMEDIATELY!
      if (isStopOrInterruptPhrase(lower)) {
        this.onBargeInCallback?.('stop', activeText);
        return;
      }

      // 2. If assistant is currently speaking, filter out acoustic speaker echo
      if (this.isAssistantSpeaking) {
        const words = lower
          .replace(/[^\w\s\u0D00-\u0D7F\u0900-\u097F]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 2);

        let matchCount = 0;
        for (const w of words) {
          if (this.recentSpokenWords.has(w)) matchCount++;
        }

        const isEchoOfAssistant =
          (words.length > 0 && matchCount / words.length >= 0.25) ||
          (this.recentSpokenText.length > 0 && this.recentSpokenText.toLowerCase().includes(lower));

        if (isEchoOfAssistant) {
          // Acoustic echo from assistant loudspeaker suppressed
          return;
        }

        // Check if user is interrupting with a new wake word or command
        for (const wakeWord of WAKE_WORDS) {
          if (lower.includes(wakeWord.toLowerCase())) {
            this.onBargeInCallback?.('wake_word', activeText);
            return;
          }
        }

        // If non-echo speech while assistant speaks
        if (words.length >= 2) {
          this.onBargeInCallback?.('new_query', activeText);
          return;
        }
        return;
      }

      // 3. ACOUSTIC TAIL GUARD: If speech ended less than 400ms ago, drop potential trailing reverberation
      if (Date.now() - this.speechEndedTimestamp < 400) {
        return;
      }

      // 4. WAKE WORD DETECTION (When running in continuous background listening mode)
      if (this.isContinuousMode) {
        for (const wakeWord of WAKE_WORDS) {
          const idx = lower.indexOf(wakeWord.toLowerCase());
          if (idx !== -1) {
            const after = activeText.slice(idx + wakeWord.length).replace(/^[,.\s]+/, '').trim();
            if (isFinal) {
              this.onWakeWordCallback?.(after);
            } else if (after.length > 2) {
              this.onTranscriptCallback?.(after, false);
            }
            return;
          }
        }
      }

      // 5. Standard transcript propagation
      this.onTranscriptCallback?.(activeText, isFinal);
    };
  }

  public startListening(continuous = false) {
    if (!this.recognition) return;
    this.isContinuousMode = continuous;
    this.shouldRestart = continuous;

    if (this.pauseForPhonePlayback || this.isAssistantSpeaking) return;

    try {
      this.recognition.start();
    } catch (e) {
      // If already running
    }
  }

  public stopListening() {
    this.shouldRestart = false;
    this.isContinuousMode = false;
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {
      // Ignore
    }
  }

  public onTranscript(cb: SpeechCallback) {
    this.onTranscriptCallback = cb;
  }

  public onWakeWord(cb: WakeWordCallback) {
    this.onWakeWordCallback = cb;
  }

  public onBargeIn(cb: BargeInCallback) {
    this.onBargeInCallback = cb;
  }

  public onError(cb: (err: string) => void) {
    this.onErrorCallback = cb;
  }

  public onStateChange(cb: (listening: boolean) => void) {
    this.onStateChangeCallback = cb;
  }
}

function itemIsFinal(results: any): boolean {
  for (let i = 0; i < results.length; i++) {
    if (results[i].isFinal) return true;
  }
  return false;
}

export const cosmicSpeech = new CosmicSpeechRecognizer();
