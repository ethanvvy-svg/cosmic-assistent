import React from 'react';
import { CosmicState, OperatingMode } from '../types';
import { Mic, MicOff, Volume2, Sparkles, Cpu, AlertTriangle, Zap } from 'lucide-react';

interface ArcCoreProps {
  state: CosmicState;
  wakeWordEnabled: boolean;
  onCoreClick: () => void;
  onToggleWakeWord: () => void;
  operatingMode?: OperatingMode;
}

export const ArcCore: React.FC<ArcCoreProps> = ({
  state,
  wakeWordEnabled,
  onCoreClick,
  onToggleWakeWord,
  operatingMode = 'normal',
}) => {
  const isSpecific = operatingMode === 'specific';

  // Color configuration depending on state and active protocol
  const getThemeColors = () => {
    if (isSpecific) {
      switch (state) {
        case 'listening':
          return {
            coreGlow: 'from-rose-500 to-red-400',
            borderGlow: 'rgba(239, 68, 68, 0.9)',
            ringColor: '#ef4444',
            pulseSpeed: 'animate-ping duration-1000',
            statusText: 'PROTOCOL RED // LISTENING...',
            textColor: 'text-rose-400',
          };
        case 'thinking':
          return {
            coreGlow: 'from-red-600 to-amber-500',
            borderGlow: 'rgba(220, 38, 38, 0.95)',
            ringColor: '#dc2626',
            pulseSpeed: 'animate-spin duration-500',
            statusText: 'MAXIMUM COMPUTE THROUGHPUT ACTIVE...',
            textColor: 'text-red-400',
          };
        case 'speaking':
          return {
            coreGlow: 'from-red-500 to-orange-400',
            borderGlow: 'rgba(239, 68, 68, 0.9)',
            ringColor: '#ef4444',
            pulseSpeed: 'animate-pulse duration-500',
            statusText: 'TRANSMITTING TACTICAL SYNTHESIS...',
            textColor: 'text-rose-400',
          };
        case 'error':
          return {
            coreGlow: 'from-rose-700 to-red-600',
            borderGlow: 'rgba(244, 63, 94, 0.9)',
            ringColor: '#f43f5e',
            pulseSpeed: 'animate-pulse',
            statusText: 'SECURITY INTERFERENCE DETECTED',
            textColor: 'text-rose-400',
          };
        default:
          return {
            coreGlow: 'from-rose-600 via-red-500 to-amber-600',
            borderGlow: 'rgba(239, 68, 68, 0.85)',
            ringColor: '#ef4444',
            pulseSpeed: '',
            statusText: wakeWordEnabled ? 'PROTOCOL RED ARMED ("Hey Cosmic")' : 'PROTOCOL RED STANDBY',
            textColor: 'text-red-400',
          };
      }
    }

    switch (state) {
      case 'listening':
        return {
          coreGlow: 'from-cyan-400 to-teal-300',
          borderGlow: 'rgba(6, 182, 212, 0.8)',
          ringColor: '#06b6d4',
          pulseSpeed: 'animate-ping duration-1000',
          statusText: 'LISTENING FOR AUDIO INPUT...',
          textColor: 'text-cyan-400',
        };
      case 'thinking':
        return {
          coreGlow: 'from-amber-400 to-yellow-300',
          borderGlow: 'rgba(245, 158, 11, 0.8)',
          ringColor: '#f59e0b',
          pulseSpeed: 'animate-spin duration-700',
          statusText: 'COMPUTING NEURAL RESPONSE...',
          textColor: 'text-amber-400',
        };
      case 'speaking':
        return {
          coreGlow: 'from-blue-400 to-purple-400',
          borderGlow: 'rgba(139, 92, 246, 0.8)',
          ringColor: '#8b5cf6',
          pulseSpeed: 'animate-pulse duration-500',
          statusText: 'TRANSMITTING VOCAL SYNTHESIS...',
          textColor: 'text-purple-400',
        };
      case 'error':
        return {
          coreGlow: 'from-rose-500 to-red-400',
          borderGlow: 'rgba(244, 63, 94, 0.8)',
          ringColor: '#f43f5e',
          pulseSpeed: 'animate-pulse',
          statusText: 'COMMUNICATION INTERFERENCE',
          textColor: 'text-rose-400',
        };
      default:
        return {
          coreGlow: 'from-cyan-500 via-sky-400 to-blue-500',
          borderGlow: 'rgba(56, 189, 248, 0.5)',
          ringColor: '#0ea5e9',
          pulseSpeed: '',
          statusText: wakeWordEnabled ? 'WAKE-WORD ARMED ("Hey Cosmic")' : 'CORE STANDBY - TAP TO ACTIVATE',
          textColor: 'text-sky-400',
        };
    }
  };

  const theme = getThemeColors();

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Outer ambient glow field */}
      <div
        className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-25"
        style={{
          background: `radial-gradient(circle, ${theme.ringColor} 0%, transparent 70%)`,
        }}
      />

      {/* Interactive Reactor Housing */}
      <div
        onClick={onCoreClick}
        className="relative group cursor-pointer w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center select-none"
        title="Tap to speak or activate Cosmic"
      >
        {/* Layer 1: Outermost Tachometer Ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin-slow transition-transform"
          viewBox="0 0 200 200"
          style={{ animationDuration: state === 'thinking' ? '4s' : '30s' }}
        >
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={theme.ringColor}
            strokeWidth="1.2"
            strokeDasharray="4 8"
            opacity="0.4"
          />
          <circle
            cx="100"
            cy="100"
            r="96"
            fill="none"
            stroke={theme.ringColor}
            strokeWidth="0.8"
            strokeDasharray="20 40 10 20"
            opacity="0.6"
          />
        </svg>

        {/* Layer 2: Counter-Rotating Mechanical Segment Ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin-reverse"
          viewBox="0 0 200 200"
          style={{ animationDuration: state === 'thinking' ? '3s' : '22s' }}
        >
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            stroke={theme.ringColor}
            strokeWidth="2"
            strokeDasharray="35 25 15 25"
            opacity="0.75"
          />
          {/* Target reticle notches */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1="100"
              y1="16"
              x2="100"
              y2="24"
              stroke={theme.ringColor}
              strokeWidth="2"
              transform={`rotate(${angle} 100 100)`}
              opacity="0.7"
            />
          ))}
        </svg>

        {/* Layer 3: Middle Inner Segmented Ring */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            stroke={theme.ringColor}
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.5"
          />
        </svg>

        {/* Layer 4: Pulse Field */}
        <div
          className={`absolute w-36 h-36 rounded-full border border-cyan-400/30 transition-all duration-500 ${
            state === 'listening' ? 'animate-pulse-ring' : ''
          }`}
        />

        {/* Core Energy Center */}
        <div
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/90 border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-105`}
          style={{
            borderColor: theme.ringColor,
            boxShadow: `0 0 25px ${theme.borderGlow}, inset 0 0 20px ${theme.borderGlow}`,
          }}
        >
          {/* Glowing Center Orb */}
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-tr ${theme.coreGlow} flex items-center justify-center shadow-inner transition-all duration-300 ${
              state === 'thinking' ? 'animate-spin' : state === 'listening' ? 'scale-110' : ''
            }`}
          >
            {state === 'listening' ? (
              <Mic className="w-7 h-7 text-slate-950 animate-bounce" />
            ) : state === 'speaking' ? (
              <Volume2 className="w-7 h-7 text-slate-950 animate-pulse" />
            ) : state === 'thinking' ? (
              <Cpu className="w-7 h-7 text-slate-950" />
            ) : state === 'error' ? (
              <AlertTriangle className="w-7 h-7 text-slate-950" />
            ) : (
              <Sparkles className="w-7 h-7 text-slate-950 transition-transform group-hover:scale-125" />
            )}
          </div>

          {/* Micro text inside reactor */}
          <span className="font-orbitron text-[9px] tracking-widest mt-2 uppercase text-cyan-200/90 font-bold">
            COSMIC
          </span>
        </div>
      </div>

      {/* Live Audio Visualizer Waveform Bar */}
      <div className="flex items-center gap-1 sm:gap-1.5 h-10 mt-3 px-4 py-1 rounded-full bg-slate-900/60 border border-cyan-500/20 backdrop-blur-sm">
        {[...Array(14)].map((_, i) => {
          const isCenter = Math.abs(i - 7) < 3;
          const isActive = state === 'listening' || state === 'speaking';
          const height = isActive
            ? isCenter
              ? 'h-6 sm:h-7'
              : 'h-3 sm:h-4'
            : 'h-1.5';
          return (
            <div
              key={i}
              className={`w-1 sm:w-1.5 rounded-full transition-all duration-150 ${height}`}
              style={{
                backgroundColor: theme.ringColor,
                opacity: isActive ? 0.9 : 0.25,
                animation: isActive ? `waveform 0.6s ease-in-out infinite ${i * 0.08}s` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Core Telemetry Status Label */}
      <div className="flex flex-col items-center text-center mt-3 gap-1">
        <p className={`font-orbitron text-xs sm:text-sm tracking-wider font-semibold ${theme.textColor}`}>
          {theme.statusText}
        </p>
        <p className="font-chakra text-xs text-slate-400">
          Try saying: <span className="text-cyan-300 font-medium">"Hey Cosmic, what's the weather?"</span> or tap the core
        </p>
      </div>

      {/* Quick Wake-Word Mode Pill */}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={onToggleWakeWord}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-chakra tracking-wide border transition-all ${
            wakeWordEnabled
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {wakeWordEnabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Wake-Word: ACTIVE ("Hey Cosmic")</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5" />
              <span>Wake-Word: MANUAL TAP ONLY</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
