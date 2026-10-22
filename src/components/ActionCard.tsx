import React, { useState, useEffect } from 'react';
import { ActionPayload, CalendarReminder, CosmicTheme, DeviceSettings } from '../types';
import {
  CloudSun,
  Timer as TimerIcon,
  Bell,
  CheckSquare,
  Mail,
  Calculator,
  ExternalLink,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Send,
  Calendar,
  Volume2,
  VolumeX,
  Sun,
  Sliders,
  Moon,
  Download,
  Power,
  Eye,
  Wifi,
  WifiOff,
  Bluetooth,
  Plane,
  BatteryCharging,
  Zap,
  Shield,
  ShieldOff,
  Radio,
  Waves,
  Search,
  Globe,
  Monitor,
} from 'lucide-react';
import { playClick, playSuccessTone, playAlarmBuzzer } from '../utils/audio';

interface ActionCardProps {
  action: ActionPayload;
  onAddTask?: (title: string, priority: 'low' | 'medium' | 'high') => void;
  onAddTimer?: (seconds: number, label: string) => void;
  onOpenDesktopModal?: () => void;
  onOpenWorkspaceHub?: () => void;
  onUpdateVolume?: (vol: number) => void;
  onUpdateBrightness?: (bright: number) => void;
  onUpdateTheme?: (theme: CosmicTheme) => void;
  onToggleDeviceSetting?: (setting: string, val?: boolean) => void;
  deviceSettings?: DeviceSettings;
  currentVolume?: number;
  currentBrightness?: number;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onAddTask,
  onAddTimer,
  onOpenDesktopModal,
  onOpenWorkspaceHub,
  onUpdateVolume,
  onUpdateBrightness,
  onUpdateTheme,
  onToggleDeviceSetting,
  deviceSettings,
  currentVolume = 80,
  currentBrightness = 85,
}) => {
  const [copied, setCopied] = useState(false);

  // Timer local state
  const [timerRemaining, setTimerRemaining] = useState<number>(
    action.type === 'timer' && action.seconds ? Number(action.seconds) : 0
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  useEffect(() => {
    if (action.type !== 'timer' || !isTimerRunning || timerRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          playAlarmBuzzer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [action.type, isTimerRunning, timerRemaining]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. CALENDAR REMINDER & EVENT CARD
  if (action.type === 'calendar_reminder' || action.type === 'event') {
    const title = action.title || 'Scheduled Event';
    const date = action.date || 'Tomorrow';
    const time = action.time || '14:00';
    const notes = action.notes || 'Logged via Cosmic Butler';

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent(notes)}&location=${encodeURIComponent(
      action.location || ''
    )}`;

    const handleDownloadIcs = () => {
      playClick();
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//COSMIC AI Assistant//EN\nBEGIN:VEVENT\nSUMMARY:${title}\nDESCRIPTION:${notes}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-cyan-950/70 to-slate-900/90 border border-cyan-500/40 shadow-lg text-slate-100">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Calendar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-cyan-400 uppercase tracking-widest font-semibold block">
                CALENDAR PROTOCOL
              </span>
              <h4 className="font-orbitron font-bold text-sm tracking-wide text-cyan-200">
                {title}
              </h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-chakra text-[10px] uppercase font-bold border border-cyan-500/30">
            CONFIRMED
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 my-2.5 text-xs font-chakra bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px]">Date:</span>
            <span className="text-cyan-200 font-medium">{date}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Time:</span>
            <span className="text-cyan-200 font-medium">{time}</span>
          </div>
          {action.location && (
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">Location:</span>
              <span className="text-slate-200">{action.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-cyan-500/20">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-chakra text-xs font-bold transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Add to Google Calendar</span>
          </a>
          <button
            onClick={handleDownloadIcs}
            className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-chakra text-xs border border-slate-700 transition-colors"
            title="Download .ics file for Apple Calendar / Outlook"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.ICS</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. GOOGLE DATABASE & INTERNET SEARCH CARD
  if (action.type === 'web_search') {
    const q = action.query || 'Internet Search';
    const googleUrl = action.googleUrl || `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    const results = action.results || [];

    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-blue-950/70 to-slate-900/90 border border-blue-500/40 shadow-lg text-slate-100">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-blue-400 uppercase tracking-widest font-semibold block">
                GOOGLE DATABASE & INTERNET TELEMETRY
              </span>
              <h4 className="font-orbitron font-bold text-sm tracking-wide text-blue-200">
                "{q}"
              </h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-chakra text-[10px] uppercase font-bold border border-blue-500/30">
            CONNECTED
          </span>
        </div>

        {results.length > 0 ? (
          <div className="space-y-2 my-2.5">
            {results.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={playClick}
                className="block p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-cyan-300 font-chakra group-hover:text-blue-300">
                  <span className="truncate">{item.title}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-300 shrink-0 ml-1" />
                </div>
                <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2 leading-relaxed">
                  {item.snippet}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-chakra my-2">
            Global search queries dispatched across Google servers and web indices.
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-chakra text-xs font-bold transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Open in Google Search</span>
          </a>
          <a
            href={`https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-chakra text-xs border border-slate-700"
            title="Search Google Scholar"
          >
            Scholar
          </a>
        </div>
      </div>
    );
  }

  // 3. DEVICE CONTROL (SCREEN, SOUND, BRIGHTNESS, WIFI, NIGHT SHIELD, ETC.)
  if (action.type === 'device_control') {
    // Screen Power (Turn On / Turn Off)
    if (action.setting === 'screen') {
      const isOff = action.action === 'turn_off' || action.value === false;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isOff ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-orbitron font-bold text-xs uppercase text-slate-200">
                  SCREEN DISPLAY POWER
                </h4>
                <p className="font-chakra text-[11px] text-slate-400">
                  {isOff ? 'Display powered off (Sleep Blackout mode)' : 'Display powered on (Active)'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playClick();
                onToggleDeviceSetting?.('screen', isOff);
              }}
              className={`px-3 py-1 rounded-lg font-chakra text-xs font-bold border transition-colors ${
                isOff
                  ? 'bg-rose-600/30 text-rose-300 border-rose-500/50 hover:bg-rose-600/40'
                  : 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 hover:bg-cyan-600/40'
              }`}
            >
              {isOff ? 'AWAKEN SCREEN' : 'TURN OFF SCREEN'}
            </button>
          </div>
        </div>
      );
    }

    // Sound / Volume Control Card
    if (action.setting === 'volume' || action.setting === 'sound') {
      const vol = typeof action.value === 'number' ? action.value : currentVolume;
      const isMuted = vol === 0 || action.action === 'turn_off';

      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-cyan-400">
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              <span className="font-orbitron text-xs font-bold tracking-wide uppercase text-cyan-200">
                SYSTEM AUDIO TELEMETRY
              </span>
            </div>
            <span className={`font-orbitron text-sm font-black ${isMuted ? 'text-rose-400' : 'text-cyan-300'}`}>
              {isMuted ? 'MUTED (0%)' : `${vol}%`}
            </span>
          </div>

          <div className="space-y-2 mt-2">
            <input
              type="range"
              min="0"
              max="100"
              value={vol}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateVolume?.(val);
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex items-center justify-between text-[10px] font-chakra text-slate-400">
              <button
                onClick={() => onUpdateVolume?.(0)}
                className="hover:text-rose-400"
              >
                Turn Off (Mute)
              </button>
              <button
                onClick={() => onUpdateVolume?.(25)}
                className="hover:text-cyan-300"
              >
                Soft (25%)
              </button>
              <button
                onClick={() => onUpdateVolume?.(75)}
                className="hover:text-cyan-300"
              >
                Standard (75%)
              </button>
              <button
                onClick={() => onUpdateVolume?.(100)}
                className="hover:text-cyan-300"
              >
                Max (100%)
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Brightness Control Card
    if (action.setting === 'brightness') {
      const bright = typeof action.value === 'number' ? action.value : currentBrightness;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Sun className="w-5 h-5" />
              <span className="font-orbitron text-xs font-bold tracking-wide uppercase text-amber-200">
                DISPLAY LUMINESCENCE
              </span>
            </div>
            <span className="font-orbitron text-sm font-black text-amber-300">
              {bright}%
            </span>
          </div>

          <div className="space-y-2 mt-2">
            <input
              type="range"
              min="15"
              max="100"
              value={bright}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateBrightness?.(val);
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex items-center justify-between text-[10px] font-chakra text-slate-400">
              <button
                onClick={() => onUpdateBrightness?.(25)}
                className="hover:text-amber-300"
              >
                Night Dim (25%)
              </button>
              <button
                onClick={() => onUpdateBrightness?.(60)}
                className="hover:text-amber-300"
              >
                Balanced (60%)
              </button>
              <button
                onClick={() => onUpdateBrightness?.(100)}
                className="hover:text-amber-300"
              >
                Overdrive (100%)
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Night Shield (Blue Light Eye Protection)
    if (action.setting === 'night_shield') {
      const isOn = action.action === 'turn_on' || action.value === true;
      return (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-orbitron text-xs font-bold text-amber-200 uppercase">
                NIGHT SHIELD (EYE COMFORT)
              </h4>
              <p className="font-chakra text-[10px] text-slate-400">
                {isOn ? 'Active (Blue light spectrum filtered)' : 'Inactive (Standard display)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onToggleDeviceSetting?.('night_shield', !isOn);
            }}
            className={`px-3 py-1 rounded text-xs font-chakra font-bold border transition-colors ${
              isOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isOn ? 'TURN OFF' : 'TURN ON'}
          </button>
        </div>
      );
    }

    // WiFi, Bluetooth, Airplane Mode, Lockdown, Battery Saver, Overdrive
    const genericSettings = [
      { key: 'wifi', title: 'WIFI TELEMETRY UPLINK', icon: Wifi, offIcon: WifiOff, color: 'text-cyan-400', border: 'border-cyan-500/40' },
      { key: 'bluetooth', title: 'BLUETOOTH PERIPHERALS', icon: Bluetooth, offIcon: Bluetooth, color: 'text-blue-400', border: 'border-blue-500/40' },
      { key: 'airplane_mode', title: 'AIRPLANE SHIELD', icon: Plane, offIcon: Plane, color: 'text-amber-400', border: 'border-amber-500/40' },
      { key: 'battery_saver', title: 'BATTERY SAVER (ECO)', icon: BatteryCharging, offIcon: BatteryCharging, color: 'text-emerald-400', border: 'border-emerald-500/40' },
      { key: 'overdrive', title: 'OVERDRIVE PERFORMANCE', icon: Zap, offIcon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/40' },
      { key: 'lockdown', title: 'SECURITY LOCKDOWN', icon: ShieldAlert, offIcon: Shield, color: 'text-rose-400', border: 'border-rose-500/40' },
      { key: 'dnd', title: 'DO NOT DISTURB', icon: ShieldOff, offIcon: Shield, color: 'text-purple-400', border: 'border-purple-500/40' },
      { key: 'ambient', title: 'AMBIENT ACOUSTIC DRONE', icon: Waves, offIcon: Waves, color: 'text-indigo-400', border: 'border-indigo-500/40' },
    ];

    const matchSetting = genericSettings.find((s) => s.key === action.setting);
    if (matchSetting) {
      const isOn = action.action === 'turn_on' || action.value === true;
      const Icon = isOn ? matchSetting.icon : matchSetting.offIcon;

      return (
        <div className={`mt-3 p-3.5 rounded-xl bg-slate-900/90 border ${matchSetting.border} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg bg-slate-800 ${matchSetting.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-orbitron text-xs font-bold text-slate-200 uppercase">
                {matchSetting.title}
              </h4>
              <p className="font-chakra text-[10px] text-slate-400">
                {isOn ? 'Status: ENGAGED & OPERATIONAL' : 'Status: DISENGAGED (OFF)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onToggleDeviceSetting?.(matchSetting.key, !isOn);
            }}
            className={`px-3 py-1 rounded text-xs font-chakra font-bold border transition-colors ${
              isOn
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isOn ? 'TURN OFF' : 'TURN ON'}
          </button>
        </div>
      );
    }

    // Theme & Mode switch
    if (action.setting === 'theme') {
      return (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-chakra text-xs text-slate-200">
              HUD Theme Engaged: <span className="font-bold uppercase text-cyan-300">{action.value}</span>
            </span>
          </div>
        </div>
      );
    }
  }

  // 3. EXECUTIVE ROUTINES (MORNING / NIGHT)
  if (action.type === 'routine') {
    const isMorning = action.routine === 'morning';
    return (
      <div className={`mt-3 p-4 rounded-xl border shadow-lg ${
        isMorning
          ? 'bg-gradient-to-r from-amber-950/60 to-slate-900/90 border-amber-500/40 text-amber-100'
          : 'bg-gradient-to-r from-indigo-950/60 to-slate-900/90 border-indigo-500/40 text-indigo-100'
      }`}>
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {isMorning ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            <span className="font-orbitron font-bold text-xs uppercase tracking-wider text-slate-200">
              {action.title || (isMorning ? 'Morning Executive Routine' : 'Night Sleep Routine')}
            </span>
          </div>
          <span className="text-[10px] font-chakra px-2 py-0.5 rounded-full bg-slate-800 font-bold">
            EXECUTED
          </span>
        </div>
        <p className="font-chakra text-xs text-slate-300">
          {isMorning
            ? '☀️ Daylight luminance calibrated, morning alarms deactivated, schedule synchronized.'
            : '🌙 Dimmers reduced to 25%, ambient audio softened, defensive alarms primed for morning.'}
        </p>
      </div>
    );
  }

  // 4. WEATHER CARD
  if (action.type === 'weather') {
    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-sky-950/70 to-slate-900/80 border border-sky-500/40 shadow-lg text-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <CloudSun className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-orbitron font-bold text-sm tracking-wide text-sky-200">
                {action.city || 'Telemetry Location'}
              </h4>
              <p className="text-xs text-sky-300/80 font-chakra">{action.condition || 'Clear Atmosphere'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-orbitron text-2xl font-black text-cyan-300">
              {action.temp || '--'}
            </span>
            {(action.high || action.low) && (
              <p className="text-[10px] text-slate-400 font-chakra">
                H: {action.high || '--'} | L: {action.low || '--'}
              </p>
            )}
          </div>
        </div>

        {(action.humidity || action.wind || action.summary) && (
          <div className="mt-3 pt-3 border-t border-sky-500/20 grid grid-cols-2 gap-2 text-xs font-chakra">
            {action.humidity && (
              <div className="bg-slate-950/40 p-1.5 rounded border border-sky-900/30">
                <span className="text-slate-400">Humidity: </span>
                <span className="text-cyan-200 font-medium">{action.humidity}</span>
              </div>
            )}
            {action.wind && (
              <div className="bg-slate-950/40 p-1.5 rounded border border-sky-900/30">
                <span className="text-slate-400">Wind: </span>
                <span className="text-cyan-200 font-medium">{action.wind}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 5. ACTIVE COUNTDOWN TIMER
  if (action.type === 'timer') {
    const isCompleted = timerRemaining === 0;

    return (
      <div className={`mt-3 p-4 rounded-xl border transition-all ${
        isCompleted
          ? 'bg-rose-950/70 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
          : 'bg-slate-900/90 border-cyan-500/40 shadow-lg'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TimerIcon className={`w-5 h-5 ${isCompleted ? 'text-rose-400 animate-bounce' : 'text-cyan-400'}`} />
            <span className="font-orbitron text-xs tracking-wider uppercase text-slate-300">
              {action.label || 'Cosmic Countdown'}
            </span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-chakra ${
            isCompleted ? 'bg-rose-500 text-white font-bold animate-ping' : 'bg-cyan-500/20 text-cyan-300'
          }`}>
            {isCompleted ? 'TIME EXPIRED!' : isTimerRunning ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>

        <div className="text-center my-3">
          <span className={`font-orbitron text-4xl sm:text-5xl font-extrabold tracking-widest ${
            isCompleted ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
          }`}>
            {formatSeconds(timerRemaining)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800">
          {!isCompleted ? (
            <>
              <button
                onClick={() => {
                  playClick();
                  setIsTimerRunning(!isTimerRunning);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-chakra border border-cyan-500/30"
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isTimerRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => {
                  playClick();
                  setTimerRemaining((prev) => prev + 60);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra border border-slate-700"
              >
                +1 Min
              </button>
              <button
                onClick={() => {
                  playClick();
                  setTimerRemaining(Number(action.seconds) || 60);
                  setIsTimerRunning(true);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                title="Reset timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                playClick();
                setTimerRemaining(Number(action.seconds) || 60);
                setIsTimerRunning(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-chakra text-xs font-bold"
            >
              <RotateCcw className="w-4 h-4" /> Restart Timer
            </button>
          )}
        </div>
      </div>
    );
  }

  // 6. SCHEDULED ALARM
  if (action.type === 'alarm') {
    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-orbitron font-bold text-sm text-amber-200">
                Alarm Armed: {action.time || '07:00'}
              </h4>
              <p className="text-xs text-slate-400 font-chakra">{action.label || 'Wake up / Briefing'}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-chakra text-[10px] uppercase font-bold border border-amber-500/30">
            ARMED
          </span>
        </div>
      </div>
    );
  }

  // 6B. DEVICE TELEMETRY & HARDWARE SENSORY MATRIX
  if (action.type === 'device_telemetry') {
    const t = action.telemetry || {};
    const b = t.battery || { level: 85, charging: true, supported: true };
    const n = t.network || { online: true, effectiveType: '4g', downlinkMbps: 12, rttMs: 35 };
    const s = t.screen || { width: 1920, height: 1080, orientation: 'portrait' };
    const m = t.motion || { posture: 'flat_table', beta: 2, gamma: 1, isMoving: false };
    const h = t.hardware || { cpuCores: 8, deviceMemoryGb: 8 };
    const platform = t.platform || 'Host Workstation';

    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-slate-100">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-cyan-400 uppercase tracking-widest font-semibold block">
                DEVICE TELEMETRY & SENSORY MATRIX
              </span>
              <h4 className="font-orbitron font-bold text-sm tracking-wide text-cyan-200">
                {platform}
              </h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-chakra text-[10px] uppercase font-bold border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE SENSORS
          </span>
        </div>

        {/* 4 Sensor Telemetry Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-chakra mb-3">
          {/* 1. Battery Gauge */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span>BATTERY</span>
              {b.charging ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <div className="font-orbitron text-lg font-bold text-emerald-400">
              {b.level}%
            </div>
            <div className="text-[10px] text-slate-400">
              {b.charging ? 'Charging (AC)' : 'On Battery'}
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${b.level}%` }} />
            </div>
          </div>

          {/* 2. Network Speed */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span>UPLINK</span>
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-orbitron text-lg font-bold text-cyan-300">
              {n.downlinkMbps || 10} <span className="text-[10px] font-normal font-chakra">Mbps</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {(n.effectiveType || '4G').toUpperCase()} • {n.rttMs || 40}ms ping
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-cyan-400 animate-pulse" style={{ width: `${Math.min(100, (n.downlinkMbps || 10) * 5)}%` }} />
            </div>
          </div>

          {/* 3. Orientation & Posture */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span>POSTURE</span>
              <Radio className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="font-orbitron text-sm font-bold text-purple-300 capitalize truncate mt-0.5">
              {m.posture === 'flat_table' ? 'Flat on Desk' : m.posture === 'upright_portrait' ? 'Upright Hand' : m.posture || 'Portrait'}
            </div>
            <div className="text-[10px] text-slate-400">
              Tilt: {m.beta || 0}° • {m.isMoving ? 'Moving' : 'Resting'}
            </div>
            <div className="text-[9px] text-purple-400 mt-1">
              Compass: {m.alpha || 0}°
            </div>
          </div>

          {/* 4. Processing & RAM */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span>HARDWARE</span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-orbitron text-lg font-bold text-amber-300">
              {h.cpuCores} <span className="text-[10px] font-normal font-chakra">Cores</span>
            </div>
            <div className="text-[10px] text-slate-400">
              ~{h.deviceMemoryGb} GB RAM
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              {s.width}x{s.height} Matrix
            </div>
          </div>
        </div>

        {/* Footer info & Local Time */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-chakra text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Timezone: {t.timezone || 'Local'}</span>
          </div>
          <span className="text-cyan-300 font-orbitron">{t.localTime || ''}</span>
        </div>
      </div>
    );
  }

  // 7. TASK ITEM CREATION
  if (action.type === 'task') {
    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 mt-0.5 rounded bg-emerald-500/20 text-emerald-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-chakra text-emerald-400 uppercase tracking-widest font-semibold">
                TASK LOGGED TO DATABASE
              </span>
              <p className="font-medium text-sm text-slate-100 mt-0.5">
                {action.title || action.task || 'Everyday item logged'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-chakra font-bold border ${
            action.priority === 'high'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {action.priority || 'NORMAL'}
          </span>
        </div>
      </div>
    );
  }

  // 8. EMAIL DRAFT / MESSAGE COMPOSER
  if (action.type === 'email') {
    const mailtoLink = `mailto:${action.recipient || ''}?subject=${encodeURIComponent(
      action.subject || ''
    )}&body=${encodeURIComponent(action.body || '')}`;

    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <Mail className="w-5 h-5" />
            <span className="font-orbitron text-xs font-bold tracking-wide uppercase text-indigo-200">
              EMAIL DISPATCH PREPARED
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopy(`${action.subject ? `Subject: ${action.subject}\n\n` : ''}${action.body}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={mailtoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-chakra font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </a>
          </div>
        </div>

        {action.recipient && (
          <p className="text-xs text-slate-400 font-chakra mb-1">
            <span className="text-slate-500">To:</span> {action.recipient}
          </p>
        )}
        {action.subject && (
          <p className="text-xs font-medium text-slate-200 font-chakra mb-2">
            <span className="text-slate-500">Subject:</span> {action.subject}
          </p>
        )}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
          {action.body}
        </div>
      </div>
    );
  }

  // 9. CALCULATOR & CONVERTER
  if (action.type === 'calc') {
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-chakra">{action.expression || 'Calculation'}</p>
            <p className="font-orbitron font-bold text-base text-cyan-300 mt-0.5">
              = {action.result || '0'}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleCopy(action.result || '')}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          title="Copy result"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  // 10. OPEN LINK
  if (action.type === 'open_link' && action.url) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-blue-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-blue-400" />
          <span className="font-chakra text-xs text-slate-200 font-medium">
            Launch {action.name || 'Web Resource'}
          </span>
        </div>
        <a
          href={action.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-chakra text-xs transition-colors"
        >
          Open Link <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // 10B. YOUTUBE VIDEO SEARCH & MEDIA
  if (action.type === 'youtube_search') {
    const videos = action.videos || [];
    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-red-950/80 via-slate-900/95 to-slate-950 border border-red-500/40 shadow-[0_4px_25px_rgba(239,68,68,0.15)] text-slate-100">
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-red-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                YOUTUBE MEDIA UPLINK
              </span>
              <h4 className="font-orbitron font-bold text-sm text-red-100">
                Videos for "{action.query || 'YouTube'}"
              </h4>
            </div>
          </div>
          <span className="text-[10px] font-chakra px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shrink-0 font-bold">
            {videos.length} RESULTS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.slice(0, 4).map((vid: any, i: number) => (
            <a
              key={i}
              href={vid.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl bg-slate-950/80 border border-slate-800 hover:border-red-500/50 p-2.5 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]"
            >
              {vid.thumbnail && (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-2 bg-slate-900">
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
              <h5 className="font-chakra text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-red-300 transition-colors leading-snug">
                {vid.title}
              </h5>
              <div className="text-[10px] font-chakra text-slate-400 mt-1.5 flex items-center justify-between">
                <span className="truncate max-w-[140px] text-red-400/90 font-medium">{vid.channelTitle || 'YouTube'}</span>
                <span className="flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors">
                  <span>Watch</span>
                  <ExternalLink className="w-2.5 h-2.5 text-red-400" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // 11. SYSTEM PROTOCOL
  if (action.type === 'system') {
    return (
      <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-yellow-500/30 flex items-center gap-2.5 text-xs font-chakra">
        <ShieldAlert className="w-4 h-4 text-yellow-400" />
        <span className="text-slate-300">
          Cosmic Protocol Engaged: <span className="text-yellow-300 font-bold uppercase">{action.mode || 'STANDARD'}</span>
        </span>
      </div>
    );
  }

  // 12. KNOWLEDGE BASE & ANSWER ENGINE (Gemini & Google Database Uplink)
  if (action.type === 'knowledge_answer') {
    const googleSearchUrl =
      action.googleUrl ||
      `https://www.google.com/search?q=${encodeURIComponent(action.query || action.title || 'Cosmic Query')}`;

    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-sky-950/80 via-slate-900/95 to-cyan-950/80 border border-sky-500/40 shadow-[0_4px_25px_rgba(14,165,233,0.15)] text-slate-100">
        <div className="flex items-start justify-between gap-3 mb-2 pb-2.5 border-b border-sky-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Globe className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-sky-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                GOOGLE DATABASE & GEMINI CORE
              </span>
              <h4 className="font-orbitron font-bold text-sm tracking-wide text-sky-200">
                {action.title || action.query || 'Knowledge Registry'}
              </h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-chakra text-[10px] uppercase font-bold border border-sky-500/30 shrink-0">
            {action.source === 'google' ? 'GOOGLE GROUNDED' : 'ANSWER VERIFIED'}
          </span>
        </div>

        {action.summary && (
          <div className="p-3 my-2 rounded-lg bg-slate-950/70 border border-sky-900/40 text-xs text-slate-200 font-sans leading-relaxed">
            {action.summary}
          </div>
        )}

        {action.results && action.results.length > 0 && (
          <div className="space-y-1.5 my-2">
            <span className="text-[10px] font-chakra text-slate-400 uppercase tracking-wider block">
              Related Database Records:
            </span>
            {action.results.slice(0, 2).map((res, i) => (
              <div key={i} className="p-2 rounded bg-slate-950/50 border border-slate-800 text-[11px] font-chakra">
                <span className="text-sky-300 font-medium block">{res.title}</span>
                <p className="text-slate-400 line-clamp-2 mt-0.5">{res.snippet}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-sky-500/20 flex flex-wrap items-center justify-between gap-2 text-xs font-chakra">
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 hover:text-white border border-sky-500/40 font-medium transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Google Live</span>
            <ExternalLink className="w-3 h-3 text-sky-400" />
          </a>

          {action.summary && (
            <button
              onClick={() => handleCopy(action.summary || '')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 13. PC DESKTOP APP & BACKGROUND RUNNER
  if (action.type === 'pc_desktop_guide') {
    const launcherScript = `@echo off\nstart chrome.exe --app=${window.location.origin} --start-maximized`;
    return (
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-blue-950/90 border border-cyan-500/40 shadow-[0_4px_25px_rgba(6,182,212,0.2)] text-slate-100">
        <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-cyan-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PC APP & BACKGROUND RUNNER READY
              </span>
              <h4 className="font-orbitron font-bold text-sm text-cyan-200">
                Desktop Installation & Wake-Word Pop-Up
              </h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-chakra text-[10px] uppercase font-bold border border-cyan-500/30">
            SYSTEM PROTOCOL
          </span>
        </div>

        <div className="p-3 my-2 rounded-lg bg-slate-950/70 border border-cyan-900/40 text-xs text-slate-300 space-y-1.5 font-sans leading-relaxed">
          <p>
            • <strong>Install as App:</strong> Run COSMIC as a borderless PC app with a dedicated Desktop & Taskbar shortcut.
          </p>
          <p>
            • <strong>Background Wake-Word:</strong> Minimized window keeps listening; say <span className="text-cyan-300 font-semibold">"Hey Cosmic"</span> and it immediately chimes, pops up an alert, and speaks the answer.
          </p>
          <p>
            • <strong>Auto-Boot:</strong> Place shortcut in <code className="text-cyan-400 font-mono">shell:startup</code> to launch automatically on PC boot.
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs font-chakra">
          {onOpenDesktopModal && (
            <button
              onClick={() => {
                playClick();
                onOpenDesktopModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-md cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Open PC Setup Console</span>
            </button>
          )}

          <button
            onClick={() => handleCopy(launcherScript)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Batch Script' : 'Copy PC Launcher Script'}</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
