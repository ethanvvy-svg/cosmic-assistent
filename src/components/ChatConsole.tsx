import React, { useRef, useEffect } from 'react';
import { ChatMessage, CosmicTheme, DeviceSettings } from '../types';
import { ActionCard } from './ActionCard';
import {
  Volume2,
  Copy,
  Check,
  Sparkles,
  User,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { playClick } from '../utils/audio';

interface ChatConsoleProps {
  messages: ChatMessage[];
  interimTranscript: string;
  isListening: boolean;
  onReplaySpeech: (text: string) => void;
  onAddTask?: (title: string, priority: 'low' | 'medium' | 'high') => void;
  onAddTimer?: (seconds: number, label: string) => void;
  onUpdateVolume?: (vol: number) => void;
  onUpdateBrightness?: (bright: number) => void;
  onUpdateTheme?: (theme: CosmicTheme) => void;
  onToggleDeviceSetting?: (setting: string, val?: boolean) => void;
  deviceSettings?: DeviceSettings;
  currentVolume?: number;
  currentBrightness?: number;
  onOpenDesktopModal?: () => void;
  onOpenWorkspaceHub?: () => void;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  messages,
  interimTranscript,
  isListening,
  onReplaySpeech,
  onAddTask,
  onAddTimer,
  onUpdateVolume,
  onUpdateBrightness,
  onUpdateTheme,
  onToggleDeviceSetting,
  deviceSettings,
  currentVolume,
  currentBrightness,
  onOpenDesktopModal,
  onOpenWorkspaceHub,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    playClick();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="font-orbitron font-bold text-lg text-cyan-200 tracking-wide mb-1">
            COSMIC // ADVANCED JARVIS COPILOT
          </h3>
          <p className="font-chakra text-xs text-slate-400 max-w-lg mb-6 leading-relaxed">
            Your ultra-advanced AI companion and system extension. Ask complex technical questions for comprehensive in-chat explanations, command device settings and timers, manage Google Workspace, or activate Specific Mode for maximum compute.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl w-full text-left font-chakra text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/30">
              <span className="text-cyan-400 font-bold block mb-1">💡 Deep Explanations</span>
              <p className="text-slate-400 text-[11px]">
                "Explain neural attention mechanisms simply", "How does a rocket engine work?"
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-rose-500/30">
              <span className="text-rose-400 font-bold block mb-1">🔥 Protocol Red</span>
              <p className="text-slate-400 text-[11px]">
                "COSMIC, go to Specific Mode", "Return to normal mode"
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-amber-500/30">
              <span className="text-amber-400 font-bold block mb-1">⚡ Instant Actions</span>
              <p className="text-slate-400 text-[11px]">
                "Put an alarm timer for 10 minutes", "Check host battery & network speed"
              </p>
            </div>
          </div>
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Sender tag */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-chakra text-slate-400">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-cyan-400" />
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="font-orbitron text-cyan-300 font-bold tracking-wider text-[10px]">
                    COSMIC
                  </span>
                </>
              )}
              <span className="text-slate-600 text-[10px]">{msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 shadow-lg transition-all ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-900/90 border border-cyan-500/30 text-slate-100 rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="text-sm font-sans leading-relaxed whitespace-pre-wrap break-words">
                {msg.text}
              </div>

              {/* Action Card if action returned */}
              {msg.action && (
                <ActionCard
                  action={msg.action}
                  onAddTask={onAddTask}
                  onAddTimer={onAddTimer}
                  onUpdateVolume={onUpdateVolume}
                  onUpdateBrightness={onUpdateBrightness}
                  onUpdateTheme={onUpdateTheme}
                  onToggleDeviceSetting={onToggleDeviceSetting}
                  onOpenDesktopModal={onOpenDesktopModal}
                  onOpenWorkspaceHub={onOpenWorkspaceHub}
                  deviceSettings={deviceSettings}
                  currentVolume={currentVolume}
                  currentBrightness={currentBrightness}
                />
              )}

              {/* Web Search Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-chakra text-slate-400">
                  <div className="flex items-center gap-1 mb-1.5 text-blue-400 font-medium">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Verified Web Sources:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 text-[10px] truncate max-w-[220px]"
                        title={src}
                      >
                        <span className="truncate">{src.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Toolbar on Assistant Messages */}
              {msg.role === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <button
                    onClick={() => {
                      playClick();
                      onReplaySpeech(msg.spokenText || msg.text);
                    }}
                    className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
                    title="Speak answer out loud in bold butler voice"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="font-chakra text-[10px]">Play Voice</span>
                  </button>

                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
                    title="Copy response text"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-chakra text-[10px] text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="font-chakra text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Live Interim Speech Preview when user is speaking */}
      {isListening && interimTranscript && (
        <div className="flex flex-col items-end animate-pulse">
          <span className="text-[10px] font-chakra text-cyan-400 mb-1">
            Hearing speech...
          </span>
          <div className="max-w-[85%] rounded-2xl rounded-tr-none px-4 py-2.5 bg-cyan-950/40 border border-cyan-400/50 text-cyan-200 text-sm italic font-chakra">
            "{interimTranscript}"
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
