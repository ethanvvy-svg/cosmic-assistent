import React, { useState, useEffect } from 'react';
import {
  Activity,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Sparkles,
  CheckSquare,
  ListTodo,
  Waves,
  Sliders,
} from 'lucide-react';
import { playClick } from '../utils/audio';

interface CosmicHudProps {
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  selectedVoice: string;
  onSelectVoice: (voice: string) => void;
  onOpenTaskManager: () => void;
  activeTaskCount: number;
  activeTimerCount: number;
}

export const CosmicHud: React.FC<CosmicHudProps> = ({
  isVoiceMuted,
  onToggleMute,
  selectedVoice,
  onSelectVoice,
  onOpenTaskManager,
  activeTaskCount,
  activeTimerCount,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [ambientAudio, setAmbientAudio] = useState<boolean>(false);
  const [ambientOsc, setAmbientOsc] = useState<any>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ambient sci-fi drone sound generator
  const toggleAmbientSound = () => {
    playClick();
    if (ambientAudio) {
      if (ambientOsc) {
        try {
          ambientOsc.stop();
        } catch (e) {}
      }
      setAmbientOsc(null);
      setAmbientAudio(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, ctx.currentTime); // Low A1 deep cosmic hum

        // Low pass filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, ctx.currentTime);

        gain.gain.setValueAtTime(0.015, ctx.currentTime); // Subtle background

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        setAmbientOsc(osc);
        setAmbientAudio(true);
      } catch (e) {
        console.warn('Ambient audio could not be initialized:', e);
      }
    }
  };

  return (
    <header className="w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between z-30 select-none">
      {/* Brand & Core Status */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-orbitron font-black text-sm tracking-widest text-cyan-400">
              COSMIC
            </h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 font-chakra text-cyan-300 uppercase tracking-wider hidden sm:inline-block">
              MARK IV AI
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-chakra">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ONLINE
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-cyan-300/80">GEMINI 3.8 REALTIME</span>
          </div>
        </div>
      </div>

      {/* Center Telemetry: Digital Clock */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-1 rounded-full bg-slate-900/60 border border-cyan-500/20">
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-orbitron text-xs tracking-wider text-cyan-200 font-semibold">
          {time || '--:--:--'}
        </span>
        <span className="text-[11px] font-chakra text-slate-400 uppercase">
          {date}
        </span>
      </div>

      {/* Right Controls: Tasks drawer, Voice selector, Mute, Ambient Drone */}
      <div className="flex items-center gap-2">
        {/* Active Tasks & Timers quick access button */}
        <button
          onClick={() => {
            playClick();
            onOpenTaskManager();
          }}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-xs font-chakra text-slate-200 transition-colors"
          title="Open Tasks & Timers drawer"
        >
          <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Tasks</span>
          {(activeTaskCount > 0 || activeTimerCount > 0) && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px]">
              {activeTaskCount + activeTimerCount}
            </span>
          )}
        </button>

        {/* Ambient Sci-Fi Drone Toggle */}
        <button
          onClick={toggleAmbientSound}
          className={`p-1.5 rounded-lg border transition-all text-xs font-chakra flex items-center gap-1 ${
            ambientAudio
              ? 'bg-purple-950/70 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={ambientAudio ? 'Mute Ambient Spaceship Drone' : 'Play Ambient Spaceship Drone'}
        >
          <Waves className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[10px]">Drone</span>
        </button>

        {/* Voice selector */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1">
          <Radio className="w-3 h-3 text-cyan-400" />
          <select
            value={selectedVoice}
            onChange={(e) => {
              playClick();
              onSelectVoice(e.target.value);
            }}
            className="bg-transparent text-xs font-chakra text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="Fenrir" className="bg-slate-900 text-slate-200">Fenrir (Suave Male)</option>
            <option value="Zephyr" className="bg-slate-900 text-slate-200">Zephyr (Calm Male)</option>
            <option value="Kore" className="bg-slate-900 text-slate-200">Kore (Crisp Female)</option>
            <option value="Puck" className="bg-slate-900 text-slate-200">Puck (Witty Male)</option>
            <option value="Charon" className="bg-slate-900 text-slate-200">Charon (Deep Male)</option>
          </select>
        </div>

        {/* Mute Voice Toggle */}
        <button
          onClick={() => {
            playClick();
            onToggleMute();
          }}
          className={`p-1.5 rounded-lg border transition-colors ${
            isVoiceMuted
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-400'
              : 'bg-slate-900/80 border-slate-800 text-cyan-400 hover:border-cyan-500/50'
          }`}
          title={isVoiceMuted ? 'Voice is Muted' : 'Voice is Active'}
        >
          {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
