import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Sparkles,
  Calendar,
  ListTodo,
  Waves,
  Sun,
  Sliders,
  Wifi,
  WifiOff,
  Bluetooth,
  Plane,
  ShieldAlert,
  BatteryCharging,
  Zap,
  Eye,
  Monitor,
  Mail,
  Mic,
  Shield,
} from 'lucide-react';
import { playClick } from '../utils/audio';
import { CosmicTheme, DeviceSettings, LiveDeviceTelemetry, OperatingMode } from '../types';
import { getLiveDeviceTelemetry } from '../utils/deviceTelemetry';

interface CosmicHudProps {
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  selectedVoice: string;
  onSelectVoice: (voice: string) => void;
  onOpenTaskManager: () => void;
  onOpenDesktopModal: () => void;
  onOpenWorkspaceHub: () => void;
  activeTaskCount: number;
  activeTimerCount: number;
  activeReminderCount: number;
  currentVolume: number;
  currentBrightness: number;
  currentTheme: CosmicTheme;
  deviceSettings?: DeviceSettings;
  operatingMode?: OperatingMode;
  onToggleOperatingMode?: () => void;
}

export const CosmicHud: React.FC<CosmicHudProps> = ({
  isVoiceMuted,
  onToggleMute,
  selectedVoice,
  onSelectVoice,
  onOpenTaskManager,
  onOpenDesktopModal,
  onOpenWorkspaceHub,
  activeTaskCount,
  activeTimerCount,
  activeReminderCount,
  currentVolume,
  currentBrightness,
  currentTheme,
  deviceSettings,
  operatingMode = 'normal',
  onToggleOperatingMode,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [ambientAudio, setAmbientAudio] = useState<boolean>(false);
  const [ambientOsc, setAmbientOsc] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<LiveDeviceTelemetry | null>(null);

  useEffect(() => {
    getLiveDeviceTelemetry().then(setTelemetry).catch(() => {});
    const interval = setInterval(() => {
      getLiveDeviceTelemetry().then(setTelemetry).catch(() => {});
    }, 3500);
    return () => clearInterval(interval);
  }, []);

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
        osc.frequency.setValueAtTime(55, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, ctx.currentTime);

        gain.gain.setValueAtTime(0.015, ctx.currentTime);

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
    <header className="w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md px-3 sm:px-4 py-2.5 flex items-center justify-between z-30 select-none">
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
              JARVIS COPILOT
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-chakra">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SYSTEM ACTIVE
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:flex items-center gap-1.5 text-cyan-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              {operatingMode === 'specific' ? 'PROTOCOL RED ENGAGED' : 'STANDARD OPERATING MODE'}
            </span>
          </div>
        </div>
      </div>

      {/* Center Telemetry: Digital Clock, Device Status & Active Badges */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-1 rounded-full bg-slate-900/60 border border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-orbitron text-xs tracking-wider text-cyan-200 font-semibold">
            {time || '--:--:--'}
          </span>
          <span className="text-[11px] font-chakra text-slate-400 uppercase">
            {date}
          </span>
        </div>

        {/* Mini Device Status Meters & Live Sensory Radar */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800 text-[11px] font-chakra text-slate-400">
          <div className="flex items-center gap-1 text-cyan-300" title={`Master Volume: ${currentVolume}%`}>
            {currentVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="font-orbitron text-[10px]">{currentVolume}%</span>
          </div>
          <div className="flex items-center gap-1 text-amber-300" title={`Screen Brightness: ${currentBrightness}%`}>
            <Sun className="w-3.5 h-3.5" />
            <span className="font-orbitron text-[10px]">{currentBrightness}%</span>
          </div>

          {/* Live Host Battery Sensory */}
          {telemetry?.battery?.supported && (
            <div
              className={`flex items-center gap-1 ${
                telemetry.battery.level < 20 && !telemetry.battery.charging
                  ? 'text-rose-400 animate-pulse'
                  : 'text-emerald-400'
              }`}
              title={`Device Battery: ${telemetry.battery.level}% (${telemetry.battery.charging ? 'Charging via AC' : 'Discharging'})`}
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              <span className="font-orbitron text-[10px]">{telemetry.battery.level}%</span>
            </div>
          )}

          {/* Live Host Network Uplink */}
          {telemetry?.network && (
            <div
              className="flex items-center gap-1 text-cyan-300"
              title={`Host Network: ${(telemetry.network.effectiveType || '4G').toUpperCase()} (~${telemetry.network.downlinkMbps || 10} Mbps, ${telemetry.network.rttMs || 40}ms ping)`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="font-orbitron text-[10px]">{telemetry.network.downlinkMbps || 10}M</span>
            </div>
          )}

          {/* Live Device Posture & Gyroscope */}
          {telemetry?.motion && (
            <div
              className="hidden xl:flex items-center gap-1 text-purple-300"
              title={`Device Spatial Posture: ${telemetry.motion.posture} (Tilt: ${telemetry.motion.beta || 0}°, Moving: ${telemetry.motion.isMoving ? 'YES' : 'NO'})`}
            >
              <Radio className="w-3 h-3" />
              <span className="font-chakra text-[10px]">
                {telemetry.motion.posture === 'flat_table'
                  ? 'Desk Flat'
                  : telemetry.motion.posture === 'upright_portrait'
                  ? 'Handheld'
                  : 'Tilted'}
              </span>
            </div>
          )}

          {/* Acoustic Echo Cancellation Shield */}
          <span
            title="Acoustic Echo Cancellation Active - Phone Mic protected from speaker bleed"
            className="hidden sm:flex items-center gap-1 text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[9px] font-chakra font-bold"
          >
            <Shield className="w-2.5 h-2.5" /> AEC
          </span>
        </div>

        {/* Live Device Hardware Flags */}
        {deviceSettings && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            {deviceSettings.wifi ? (
              <span title="Wi-Fi Uplink Active" className="text-cyan-400"><Wifi className="w-3 h-3" /></span>
            ) : (
              <span title="Wi-Fi Off" className="text-rose-400"><WifiOff className="w-3 h-3" /></span>
            )}
            {deviceSettings.bluetooth && (
              <span title="Bluetooth Active" className="text-blue-400"><Bluetooth className="w-3 h-3" /></span>
            )}
            {deviceSettings.airplaneMode && (
              <span title="Airplane Mode Engaged" className="text-amber-400 bg-amber-950/60 px-1 rounded text-[9px] font-chakra font-bold flex items-center gap-0.5">
                <Plane className="w-2.5 h-2.5" /> AIR
              </span>
            )}
            {deviceSettings.nightShield && (
              <span title="Night Shield Eye Protection" className="text-amber-300 bg-amber-950/60 px-1 rounded text-[9px] font-chakra font-bold flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" /> EYE
              </span>
            )}
            {deviceSettings.lockdown && (
              <span title="Security Lockdown Active" className="text-rose-400 bg-rose-950/60 px-1 rounded text-[9px] font-chakra font-bold animate-pulse flex items-center gap-0.5">
                <ShieldAlert className="w-2.5 h-2.5" /> LOCK
              </span>
            )}
            {deviceSettings.overdrive && (
              <span title="Overdrive Performance Mode" className="text-cyan-300 bg-cyan-950/60 px-1 rounded text-[9px] font-chakra font-bold flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> TURBO
              </span>
            )}
            {deviceSettings.batterySaver && (
              <span title="Eco Battery Saver" className="text-emerald-400 bg-emerald-950/60 px-1 rounded text-[9px] font-chakra font-bold flex items-center gap-0.5">
                <BatteryCharging className="w-2.5 h-2.5" /> ECO
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Protocol Mode Switcher, PC Desktop, Google Workspace, Operations Drawer, Ambient Sound, Voice Selector, Mute */}
      <div className="flex items-center gap-2">
        {/* Dynamic Operating Mode Switcher */}
        {onToggleOperatingMode && (
          <button
            onClick={() => {
              playClick();
              onToggleOperatingMode();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-chakra transition-all shadow-sm ${
              operatingMode === 'specific'
                ? 'bg-rose-950/90 border-rose-500/70 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-slate-900/80 hover:bg-slate-800 border-cyan-500/30 text-cyan-300'
            }`}
            title="Switch between Normal State (Blue HUD) and Specific Mode (Protocol Red - High Intensity Compute)"
          >
            <Zap className={`w-3.5 h-3.5 ${operatingMode === 'specific' ? 'text-rose-400' : 'text-cyan-400'}`} />
            <span className="font-orbitron text-[10px] font-bold tracking-wider">
              {operatingMode === 'specific' ? '🔥 PROTOCOL RED' : '💠 NORMAL'}
            </span>
          </button>
        )}

        {/* PC Desktop App & Background Runner */}
        <button
          onClick={() => {
            playClick();
            onOpenDesktopModal();
          }}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/80 hover:to-blue-900/80 border border-cyan-500/40 text-xs font-chakra text-cyan-200 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          title="Install as PC Desktop App & Configure Background Wake-Word Runner"
        >
          <Monitor className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">PC App</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Google Workspace & Location Hub */}
        <button
          onClick={() => {
            playClick();
            onOpenWorkspaceHub();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-xs font-chakra text-slate-200 transition-colors shadow-sm"
          title="Open Google Workspace (Gmail, Calendar, Tasks, Drive & Live Location)"
        >
          <Mail className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Workspace</span>
        </button>

        {/* Operations Hub button (Calendar, Tasks, Timers, Settings) */}
        <button
          onClick={() => {
            playClick();
            onOpenTaskManager();
          }}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-xs font-chakra text-slate-200 transition-colors shadow-sm"
          title="Open Calendar, Tasks, Timers & Device Settings"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Hub</span>
          {(activeTaskCount > 0 || activeTimerCount > 0 || activeReminderCount > 0) && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px]">
              {activeTaskCount + activeTimerCount + activeReminderCount}
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

        {/* Voice selector with Charon Bold Butler as primary */}
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
            <option value="Charon" className="bg-slate-900 text-slate-200">Charon (Bold Butler Baritone)</option>
            <option value="Fenrir" className="bg-slate-900 text-slate-200">Fenrir (Deep Commander)</option>
            <option value="Zephyr" className="bg-slate-900 text-slate-200">Zephyr (Calm Tactician)</option>
            <option value="Kore" className="bg-slate-900 text-slate-200">Kore (Crisp Female Intelligence)</option>
            <option value="Puck" className="bg-slate-900 text-slate-200">Puck (Witty Aide)</option>
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
