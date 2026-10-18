import React, { useState, useEffect } from 'react';
import { ActionPayload } from '../types';
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
  Plus,
} from 'lucide-react';
import { playClick, playSuccessTone, playAlarmBuzzer } from '../utils/audio';

interface ActionCardProps {
  action: ActionPayload;
  onAddTask?: (title: string, priority: 'low' | 'medium' | 'high') => void;
  onAddTimer?: (seconds: number, label: string) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onAddTask,
  onAddTimer,
}) => {
  const [copied, setCopied] = useState(false);

  // Timer local state if action is timer
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

  // 1. WEATHER CARD
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

  // 2. ACTIVE COUNTDOWN TIMER
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
                <Plus className="w-3.5 h-3.5" /> +1 Min
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

  // 3. SCHEDULED ALARM
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
                Alarm Arming: {action.time || '07:00'}
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

  // 4. TASK ITEM CREATION
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

  // 5. EMAIL DRAFT / MESSAGE COMPOSER
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

  // 6. CALCULATOR & CONVERTER
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

  // 7. OPEN LINK / ONLINE DESTINATION
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

  // 8. SYSTEM PROTOCOL
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

  return null;
};
