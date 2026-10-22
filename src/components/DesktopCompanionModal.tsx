import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Download,
  Copy,
  Check,
  Bell,
  Mic,
  Volume2,
  ExternalLink,
  X,
  Sparkles,
  Radio,
  Maximize2,
  ArrowRight,
  ShieldCheck,
  Laptop,
} from 'lucide-react';
import { playClick, playChime } from '../utils/audio';

interface DesktopCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerWakeWordTest: () => void;
}

export const DesktopCompanionModal: React.FC<DesktopCompanionModalProps> = ({
  isOpen,
  onClose,
  onTriggerWakeWordTest,
}) => {
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedVbs, setCopiedVbs] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [pipActive, setPipActive] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    playClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install COSMIC on your PC:\n\n1. Look at the right end of your browser address bar\n2. Click the "Install COSMIC" icon (⊕ or computer display)\n3. Click "Install" to create a Desktop icon and borderless PC app!');
    }
  };

  const handleRequestNotifications = async () => {
    playClick();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('⚡ COSMIC Butler Activated', {
          body: 'Background Wake-Word is active! Say "Hey Cosmic" anytime to pop up and speak.',
          icon: '/icon.svg',
        });
      }
    }
  };

  const batchScriptContent = `@echo off
title COSMIC AI Desktop Runner
echo Launching COSMIC Butler in dedicated PC Desktop App mode...
start chrome.exe --app=${window.location.origin} --start-maximized
exit`;

  const vbsSilentRunner = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "chrome.exe --app=${window.location.origin} --start-minimized", 0, False`;

  const copyToClipboard = (text: string, type: 'bat' | 'vbs') => {
    playClick();
    navigator.clipboard.writeText(text);
    if (type === 'bat') {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2000);
    } else {
      setCopiedVbs(true);
      setTimeout(() => setCopiedVbs(false), 2000);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    playClick();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 p-5 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-cyan-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                PC DESKTOP COMPANION & BACKGROUND RUNNER
              </span>
              <h2 className="font-orbitron font-bold text-lg text-white">
                Install & Run in Background on PC
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocol Steps */}
        <div className="mt-5 space-y-4">
          {/* 1. Install as Standalone App */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                  1-Click Install as PC App
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Opens in a dedicated borderless native window with its own Desktop & Taskbar shortcut.
              </p>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-chakra text-xs font-semibold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Install COSMIC on PC</span>
            </button>
          </div>

          {/* 2. Background Wake-Word & Pop-up Configuration */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                Always-On Background Hearing & Pop-Up
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              When minimized or running behind other windows (games, code editors, browsers), COSMIC continues listening. Say <strong className="text-cyan-300">"Hey Cosmic"</strong> (or Malayalam <strong className="text-cyan-300">"ഹേയ് കോസ്മിക്"</strong> / Hindi <strong className="text-cyan-300">"हे कॉस्मिक"</strong>) and it will immediately chime, send a pop-up alert, and answer through your PC speakers!
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={handleRequestNotifications}
                className={`px-3 py-1.5 rounded-lg border text-xs font-chakra font-medium flex items-center gap-1.5 transition-colors ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {notificationPermission === 'granted'
                    ? '✓ Desktop Pop-Ups Enabled'
                    : 'Enable Pop-Up Notifications'}
                </span>
              </button>

              <button
                onClick={() => {
                  playClick();
                  onTriggerWakeWordTest();
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-xs font-chakra font-medium flex items-center gap-1.5 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Test "Hey Cosmic" Wake Chime</span>
              </button>
            </div>
          </div>

          {/* 3. Startup on PC Boot */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                Launch Automatically on PC Boot
              </h3>
            </div>
            <ul className="text-xs text-slate-300 font-sans space-y-1 list-disc list-inside">
              <li>
                <strong>Windows:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-cyan-300">Win + R</kbd>, type <code className="text-cyan-400 font-mono">shell:startup</code>, and drag the COSMIC Desktop shortcut inside.
              </li>
              <li>
                <strong>Chrome/Edge Setting:</strong> Ensure <em>"Continue running background apps when browser is closed"</em> is checked in <code className="text-cyan-400 font-mono">chrome://settings/system</code>.
              </li>
            </ul>
          </div>

          {/* 4. One-Click Desktop Scripts */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                Optional Windows Desktop Launcher Scripts
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Batch Script */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-chakra text-slate-300 font-bold block mb-1">
                    cosmic-app.bat
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Launches COSMIC directly in full borderless desktop app mode.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <button
                    onClick={() => downloadFile('cosmic-app.bat', batchScriptContent)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-chakra text-cyan-300 flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button
                    onClick={() => copyToClipboard(batchScriptContent, 'bat')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy batch code"
                  >
                    {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* VBS Silent Runner */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-chakra text-slate-300 font-bold block mb-1">
                    cosmic-silent-runner.vbs
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Runs COSMIC minimized in background silently without command window.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <button
                    onClick={() => downloadFile('cosmic-silent-runner.vbs', vbsSilentRunner)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-chakra text-cyan-300 flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button
                    onClick={() => copyToClipboard(vbsSilentRunner, 'vbs')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy VBS code"
                  >
                    {copiedVbs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-chakra">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Full-Duplex Speech & Background Engine Ready</span>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-chakra transition-colors"
          >
            Close Protocol
          </button>
        </div>
      </div>
    </div>
  );
};
