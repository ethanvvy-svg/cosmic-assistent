// Voice Recognition & Wake-Word Listening Engine

export type SpeechCallback = (transcript: string, isFinal: boolean) => void;
export type WakeWordCallback = (commandAfterWakeWord: string) => void;

const WAKE_WORDS = ['hey cosmic', 'ok cosmic', 'okay cosmic', 'cosmic', 'jarvis', 'computer'];

export class CosmicSpeechRecognizer {
  private recognition: any = null;
  private isContinuousMode = false;
  private isListening = false;
  private onTranscriptCallback: SpeechCallback | null = null;
  private onWakeWordCallback: WakeWordCallback | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((listening: boolean) => void) | null = null;
  private shouldRestart = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.setupHandlers();
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
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
      // If continuous / wake-word mode is on, auto-restart
      if (this.shouldRestart) {
        setTimeout(() => {
          try {
            if (this.shouldRestart) {
              this.recognition.start();
            }
          } catch (e) {
            // Already started or error
          }
        }, 200);
      }
    };

    this.recognition.onerror = (event: any) => {
      // Don't crash on standard 'no-speech' or 'aborted'
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.onErrorCallback?.(event.error);
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

      // Check for wake words if continuous mode
      if (this.isContinuousMode && activeText) {
        const lower = activeText.toLowerCase();
        for (const wakeWord of WAKE_WORDS) {
          const idx = lower.indexOf(wakeWord);
          if (idx !== -1) {
            // Wake word detected! Extract command after it
            const after = activeText.slice(idx + wakeWord.length).replace(/^[,.\s]+/, '').trim();
            if (itemIsFinal(event.results)) {
              this.onWakeWordCallback?.(after);
            } else if (after.length > 3) {
              // Interim has command
              this.onTranscriptCallback?.(after, false);
            }
            return;
          }
        }
      }

      if (activeText) {
        const isFinal = itemIsFinal(event.results);
        this.onTranscriptCallback?.(activeText, isFinal);
      }
    };
  }

  public startListening(continuous = false) {
    if (!this.recognition) return;
    this.isContinuousMode = continuous;
    this.shouldRestart = continuous;

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
