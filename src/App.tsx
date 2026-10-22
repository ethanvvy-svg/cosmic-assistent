import React, { useState, useEffect, useRef } from 'react';
import {
  CosmicState,
  ChatMessage,
  ActiveTimer,
  ActiveAlarm,
  TaskItem,
  CalendarReminder,
  DeviceSettings,
  CosmicTheme,
  OperatingMode,
} from './types';
import { ArcCore } from './components/ArcCore';
import { CosmicHud } from './components/CosmicHud';
import { ChatConsole } from './components/ChatConsole';
import { TaskManager } from './components/TaskManager';
import { DesktopCompanionModal } from './components/DesktopCompanionModal';
import { GoogleWorkspaceHub } from './components/GoogleWorkspaceHub';
import { requestUserLocation, getCachedLocation } from './utils/location';
import { cosmicSpeech, isMobilePhone, isStopOrInterruptPhrase } from './utils/speech';
import { getLiveDeviceTelemetry } from './utils/deviceTelemetry';
import {
  playChime,
  playSuccessTone,
  playAlarmBuzzer,
  playClick,
  speakText,
  stopCurrentSpeech,
  setSystemVolume,
} from './utils/audio';
import {
  Mic,
  Send,
  Sparkles,
  Trash2,
  Calendar,
  Volume2,
  Sun,
  Sliders,
  Languages,
  Power,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export default function App() {
  // Assistant Core State
  const [cosmicState, setCosmicState] = useState<CosmicState>('standby');
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('normal');
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Charon'); // Charon = Bold Royal Butler Baritone
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ml' | 'hi'>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);
  const [isWorkspaceHubOpen, setIsWorkspaceHubOpen] = useState<boolean>(false);

  // Anti-Acoustic Echo and Feedback Loop Guard
  const lastQueryRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const chatAbortRef = useRef<AbortController | null>(null);

  // Device & Virtual Environment Settings
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(() => {
    const saved = localStorage.getItem('cosmic_device_settings');
    return saved
      ? JSON.parse(saved)
      : {
          volume: 80,
          brightness: 85,
          screenPower: true,
          nightShield: false,
          theme: 'cyan',
          dnd: false,
          fullscreen: false,
          batterySaver: false,
          overdrive: false,
          wifi: true,
          bluetooth: true,
          airplaneMode: false,
          lockdown: false,
        };
  });

  // Calendar Reminders
  const [calendarReminders, setCalendarReminders] = useState<CalendarReminder[]>(() => {
    const saved = localStorage.getItem('cosmic_calendar_reminders');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'rem-1',
            title: 'Executive Strategy Sync',
            date: 'Tomorrow',
            time: '10:00',
            notes: 'Quarterly review with leadership',
            location: 'Conference Room 4A',
            completed: false,
            createdAt: new Date().toISOString(),
          },
        ];
  });

  // Everyday Tasks
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('cosmic_tasks');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 't-1',
            title: 'Welcome to COSMIC. Fluent in English, Malayalam (മലയാളം), & Hindi (हिन्दी). Try saying "Hey Cosmic, study Malayalam with me"',
            priority: 'medium',
            completed: false,
            createdAt: new Date().toISOString(),
          },
        ];
  });

  // Timers & Alarms
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [alarms, setAlarms] = useState<ActiveAlarm[]>(() => {
    const saved = localStorage.getItem('cosmic_alarms');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'a-1',
            label: 'Daily Standup',
            time: '09:00',
            isActive: true,
          },
        ];
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('cosmic_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('cosmic_calendar_reminders', JSON.stringify(calendarReminders));
  }, [calendarReminders]);

  useEffect(() => {
    localStorage.setItem('cosmic_alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('cosmic_device_settings', JSON.stringify(deviceSettings));
    setSystemVolume(deviceSettings.volume);
  }, [deviceSettings]);

  // Update speech recognizer language when currentLanguage changes
  useEffect(() => {
    if (currentLanguage === 'ml') {
      cosmicSpeech.setLanguage('ml-IN');
    } else if (currentLanguage === 'hi') {
      cosmicSpeech.setLanguage('hi-IN');
    } else {
      cosmicSpeech.setLanguage('en-US');
    }
  }, [currentLanguage]);

  // Global Timers countdown loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (!timer.isRunning || timer.remainingSeconds <= 0) return timer;
          const nextSec = timer.remainingSeconds - 1;
          if (nextSec === 0) {
            playAlarmBuzzer();
          }
          return { ...timer, remainingSeconds: nextSec };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Alarms check loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHM = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const currentSec = now.getSeconds();

      if (currentSec === 0 && !deviceSettings.dnd) {
        alarms.forEach((alarm) => {
          if (alarm.isActive && alarm.time === currentHM) {
            playAlarmBuzzer();
            setMessages((prev) => [
              ...prev,
              {
                id: 'alarm-' + Date.now(),
                role: 'assistant',
                text: `⏰ ALARM NOTIFICATION: ${alarm.label} scheduled for ${alarm.time} has triggered, sir!`,
                spokenText: `Sir, your alarm for ${alarm.label} is ringing.`,
                timestamp: currentHM,
              },
            ]);
            if (!isVoiceMuted) {
              speakText(`Sir, your alarm for ${alarm.label} is ringing.`, {
                voice: selectedVoice,
              });
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, isVoiceMuted, selectedVoice, deviceSettings.dnd]);

  // Request GPS location fix quietly on boot
  useEffect(() => {
    requestUserLocation().catch(() => {});
  }, []);

  // Initialize Speech Recognition handlers
  useEffect(() => {
    if (!cosmicSpeech.isSupported()) return;

    cosmicSpeech.onTranscript((text: string, isFinal: boolean) => {
      setInterimTranscript(text);

      // Fast cutoff: if stop cosmic or any interrupt phrase is spoken, immediately halt speech
      if (isStopOrInterruptPhrase(text)) {
        stopCurrentSpeech();
        if (chatAbortRef.current) {
          chatAbortRef.current.abort();
          chatAbortRef.current = null;
        }
        setCosmicState('standby');
        if (isFinal) {
          setInterimTranscript('');
          handleUserQuery(text.trim());
        }
        return;
      }

      if (isFinal && text.trim()) {
        setInterimTranscript('');
        handleUserQuery(text.trim());
      }
    });

    // SIMULTANEOUS FULL-DUPLEX HEARING WHILE AI ANSWERS (Barge-in interruption)
    cosmicSpeech.onBargeIn((type, text) => {
      if (type === 'stop') {
        stopCurrentSpeech();
        if (chatAbortRef.current) {
          chatAbortRef.current.abort();
          chatAbortRef.current = null;
        }
        playClick();
        setCosmicState('standby');
        setMessages((prev) => [
          ...prev,
          {
            id: 'halt-' + Date.now(),
            role: 'assistant',
            text: 'Silenced at your command, sir. Standing by.',
            spokenText: '', // Zero speech output: stay completely silent!
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else if (type === 'wake_word') {
        stopCurrentSpeech();
        playChime();
        if (text && text.length > 2) {
          handleUserQuery(text);
        } else {
          setCosmicState('listening');
        }
      } else if (type === 'new_query') {
        stopCurrentSpeech();
        playChime();
        handleUserQuery(text);
      }
    });

    cosmicSpeech.onWakeWord((command: string) => {
      playChime();
      if (document.hidden && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification('⚡ COSMIC Activated: "Hey Cosmic"', {
            body: 'Listening to your command, sir! (Click to bring window to front)',
            icon: '/icon.svg',
          });
          notif.onclick = () => {
            window.focus();
          };
        } catch (e) {}
      }
      if (command && command.length > 2) {
        handleUserQuery(command);
      } else {
        setCosmicState('listening');
      }
    });

    cosmicSpeech.onStateChange((listening: boolean) => {
      if (listening && cosmicState === 'standby') {
        // armed
      } else if (!listening && cosmicState === 'listening') {
        setCosmicState('standby');
      }
    });

    if (wakeWordEnabled) {
      cosmicSpeech.startListening(true);
    }

    return () => {
      cosmicSpeech.stopListening();
    };
  }, [wakeWordEnabled, cosmicState]);

  // Handle User Voice or Text Query
  const handleUserQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    const clean = queryText.trim().toLowerCase();
    const now = Date.now();

    // Prevent runaway microphone acoustic feedback loops (especially on phone speakers)
    if (lastQueryRef.current.text === clean && now - lastQueryRef.current.time < 5000) {
      console.warn('Acoustic feedback loop detected and suppressed:', queryText);
      return;
    }

    // Check if what the microphone heard was simply the assistant's previous message
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        const lastSpoken = (lastMsg.spokenText || lastMsg.text).toLowerCase();
        if (clean.length > 8 && lastSpoken.includes(clean)) {
          console.warn('Acoustic self-hearing echo suppressed:', queryText);
          return;
        }
      }
    }

    lastQueryRef.current = { text: clean, time: now };

    // Stop previous voice output immediately
    stopCurrentSpeech();

    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // INSTANT STOP COMMAND INTERCEPTION:
    // If the user says "stop cosmic", "cosmic stop", "stop talking", "be quiet", "shut up",
    // immediately silence all audio, cancel any pending fetch, and stay completely silent!
    if (isStopOrInterruptPhrase(clean)) {
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
        chatAbortRef.current = null;
      }
      playClick();
      setCosmicState('standby');
      setInputText('');
      setInterimTranscript('');

      setMessages((prev) => [
        ...prev,
        {
          id: 'usr-' + Date.now(),
          role: 'user',
          text: queryText,
          timestamp,
        },
        {
          id: 'ast-' + (Date.now() + 1),
          role: 'assistant',
          text: 'Recitation silenced, sir. Standing by.',
          spokenText: '', // Empty: do NOT speak anything!
          timestamp,
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: queryText,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setInterimTranscript('');
    setCosmicState('thinking');

    // Prepare abort controller for in-flight query cancellation
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
    }
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const loc = getCachedLocation();
      let userLocation = loc
        ? `${loc.city || 'Detected City'}, ${loc.country || ''} (GPS: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`
        : 'Global';
      try {
        if (!loc) {
          userLocation = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
      } catch (e) {}

      const liveTelemetry = await getLiveDeviceTelemetry();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: queryText,
          operatingMode,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          userLocation,
          deviceTelemetry: liveTelemetry,
          context: `Operating Protocol: ${operatingMode === 'specific' ? 'SPECIFIC MODE (PROTOCOL RED)' : 'NORMAL MODE (BLUE HUD)'}. Device volume: ${deviceSettings.volume}%, brightness: ${deviceSettings.brightness}%, screenPower: ${deviceSettings.screenPower}, nightShield: ${deviceSettings.nightShield}, wifi: ${deviceSettings.wifi}, theme: ${deviceSettings.theme}, active language: ${currentLanguage}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || (operatingMode === 'specific' ? 'Execution confirmed.' : 'Ready for your command.');
      const spoken = data.spokenText || replyText;
      const action = data.action;

      // Execute side-effects for actions
      if (action) {
        playSuccessTone();

        // 0. Dynamic Operating Mode Shift (Specific Mode / Protocol Red vs Normal Mode)
        if (action.type === 'mode_shift') {
          const nextMode: OperatingMode = action.mode === 'specific' ? 'specific' : 'normal';
          setOperatingMode(nextMode);
          handleUpdateTheme(nextMode === 'specific' ? 'crimson' : 'cyan');
        }

        // 1. Task Action
        if (action.type === 'task') {
          handleAddTask(action.title || action.task || 'Everyday note', action.priority || 'medium');
        }

        // 2. Calendar Reminder Action
        if (action.type === 'calendar_reminder' || action.type === 'event') {
          handleAddCalendarReminder(
            action.title || 'Calendar Reminder',
            action.date || 'Tomorrow',
            action.time || '14:00',
            action.notes || action.location || ''
          );
        }

        // 3. Complete Device Controls
        if (action.type === 'device_control') {
          if (action.setting === 'volume' || action.setting === 'sound') {
            const newVol =
              typeof action.value === 'number'
                ? action.value
                : action.action === 'turn_off'
                ? 0
                : action.action === 'decrease'
                ? 25
                : 85;
            handleUpdateVolume(newVol);
          } else if (action.setting === 'brightness') {
            const newBright =
              typeof action.value === 'number'
                ? action.value
                : action.action === 'decrease'
                ? 30
                : 95;
            handleUpdateBrightness(newBright);
          } else if (action.setting === 'screen') {
            const isPowerOn = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('screenPower', isPowerOn);
          } else if (action.setting === 'night_shield') {
            const isShieldOn = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('nightShield', isShieldOn);
          } else if (action.setting === 'wifi') {
            const isWifiOn = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('wifi', isWifiOn);
          } else if (action.setting === 'bluetooth') {
            const isBtOn = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('bluetooth', isBtOn);
          } else if (action.setting === 'airplane_mode') {
            const isApOn = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('airplaneMode', isApOn);
          } else if (action.setting === 'battery_saver') {
            const isEco = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('batterySaver', isEco);
          } else if (action.setting === 'overdrive') {
            const isTurbo = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('overdrive', isTurbo);
          } else if (action.setting === 'lockdown') {
            const isLock = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('lockdown', isLock);
          } else if (action.setting === 'dnd') {
            const isDnd = action.action === 'turn_on' || action.value === true;
            handleToggleDeviceSetting('dnd', isDnd);
          } else if (action.setting === 'fullscreen') {
            handleToggleFullscreen();
          } else if (action.setting === 'theme' && action.value) {
            handleUpdateTheme(action.value as CosmicTheme);
          }
        }

        // 4. Executive Routines (Morning / Night)
        if (action.type === 'routine') {
          if (action.routine === 'morning') {
            handleUpdateBrightness(90);
            handleUpdateVolume(75);
            handleUpdateTheme('gold');
            handleToggleDeviceSetting('nightShield', false);
          } else if (action.routine === 'night') {
            handleUpdateBrightness(25);
            handleUpdateVolume(20);
            handleUpdateTheme('stealth');
            handleToggleDeviceSetting('nightShield', true);
          }
        }

        // 5. Timer Action
        if (action.type === 'timer' && action.seconds) {
          handleAddTimer(Number(action.seconds), action.label || 'Timer');
        }

        // 6. Alarm Action
        if (action.type === 'alarm' && action.time) {
          handleAddAlarm(action.time, action.label || 'Scheduled Alarm');
        }

        // 7. PC Desktop Companion
        if (action.type === 'pc_desktop_guide' || clean.includes('app in my pc') || clean.includes('desktop app') || clean.includes('run in background')) {
          setIsDesktopModalOpen(true);
        }

        // 8. Google Workspace Hub
        if (action.type === 'email' || clean.includes('gmail') || clean.includes('google workspace') || clean.includes('google calendar') || clean.includes('google tasks') || clean.includes('drive files')) {
          setIsWorkspaceHubOpen(true);
        }
      }

      const assistantMsg: ChatMessage = {
        id: 'ast-' + Date.now(),
        role: 'assistant',
        text: replyText,
        spokenText: spoken,
        action,
        sources: data.sources,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak answer out loud with butler / multilingual speech synthesis
      if (!isVoiceMuted && !deviceSettings.dnd) {
        setCosmicState('speaking');
        speakText(spoken, {
          voice: selectedVoice,
          lang: currentLanguage,
          onEnd: () => {
            setCosmicState('standby');
            if (wakeWordEnabled) {
              cosmicSpeech.startListening(true);
            }
          },
          onError: () => {
            setCosmicState('standby');
            if (wakeWordEnabled) {
              cosmicSpeech.startListening(true);
            }
          },
        });
      } else {
        setCosmicState('standby');
        if (wakeWordEnabled) {
          cosmicSpeech.startListening(true);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Query cancelled intentionally by user stop command: remain silent
        return;
      }
      console.error('Failed to communicate with Cosmic:', err);
      setCosmicState('error');

      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          text: `Neural telemetry alert: Unable to reach core services. (${err.message})`,
          timestamp,
        },
      ]);

      setTimeout(() => {
        setCosmicState('standby');
        if (wakeWordEnabled) cosmicSpeech.startListening(true);
      }, 3000);
    } finally {
      if (chatAbortRef.current === controller) {
        chatAbortRef.current = null;
      }
    }
  };

  // Toggle Wake-Word Listener
  const handleToggleWakeWord = () => {
    playClick();
    if (wakeWordEnabled) {
      cosmicSpeech.stopListening();
      setWakeWordEnabled(false);
    } else {
      cosmicSpeech.startListening(true);
      setWakeWordEnabled(true);
      playChime();
    }
  };

  // Click on Arc Reactor Core
  const handleCoreClick = () => {
    if (cosmicState === 'listening') {
      cosmicSpeech.stopListening();
      setCosmicState('standby');
      if (wakeWordEnabled) cosmicSpeech.startListening(true);
    } else if (cosmicState === 'speaking') {
      stopCurrentSpeech();
      setCosmicState('standby');
      if (wakeWordEnabled) cosmicSpeech.startListening(true);
    } else {
      stopCurrentSpeech();
      playChime();
      setCosmicState('listening');
      cosmicSpeech.startListening(false);
    }
  };

  // Device Settings Handlers
  const handleUpdateVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    setDeviceSettings((prev) => ({ ...prev, volume: clamped }));
    setSystemVolume(clamped);
    playClick();
  };

  const handleUpdateBrightness = (bright: number) => {
    const clamped = Math.max(15, Math.min(100, Math.round(bright)));
    setDeviceSettings((prev) => ({ ...prev, brightness: clamped }));
    playClick();
  };

  const handleUpdateTheme = (theme: CosmicTheme) => {
    setDeviceSettings((prev) => ({ ...prev, theme }));
    playSuccessTone();
  };

  const handleToggleOperatingMode = () => {
    const nextMode: OperatingMode = operatingMode === 'normal' ? 'specific' : 'normal';
    setOperatingMode(nextMode);
    handleUpdateTheme(nextMode === 'specific' ? 'crimson' : 'cyan');
    playSuccessTone();
    const noticeMsg: ChatMessage = {
      id: 'mode-' + Date.now(),
      role: 'assistant',
      text: nextMode === 'specific'
        ? '🔥 **PROTOCOL RED ENGAGED (SPECIFIC MODE)**\n- Performance Matrix: Maximum Compute Throughput\n- Operational Persona: Laser-focused technical rigor, zero casual banter\n- Sensory HUD: Radiant Crimson telemetry online\n\n*Awaiting high-priority objectives.*'
        : '💠 **NORMAL MODE RESTORED**\n- Balanced conversational copilot, creative brainstorming, and everyday operations active.',
      spokenText: nextMode === 'specific'
        ? 'Protocol Red engaged. Maximum performance online.'
        : 'Normal protocol restored. Ready for your command.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, noticeMsg]);
    if (!isVoiceMuted && !deviceSettings.dnd) {
      speakText(noticeMsg.spokenText || '', { voice: selectedVoice, lang: currentLanguage });
    }
  };

  const handleToggleDnd = () => {
    setDeviceSettings((prev) => ({ ...prev, dnd: !prev.dnd }));
    playClick();
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setDeviceSettings((prev) => ({ ...prev, fullscreen: true }));
    } else {
      document.exitFullscreen?.().catch(() => {});
      setDeviceSettings((prev) => ({ ...prev, fullscreen: false }));
    }
    playClick();
  };

  const handleToggleDeviceSetting = (setting: string, val?: boolean) => {
    setDeviceSettings((prev: any) => {
      const nextVal = val !== undefined ? val : !prev[setting];
      playClick();
      return { ...prev, [setting]: nextVal };
    });
  };

  // Calendar Reminder Handlers
  const handleAddCalendarReminder = (
    title: string,
    date: string,
    time?: string,
    notes?: string
  ) => {
    const newRem: CalendarReminder = {
      id: 'rem-' + Date.now(),
      title,
      date,
      time,
      notes,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setCalendarReminders((prev) => [newRem, ...prev]);
  };

  const handleToggleCalendarReminder = (id: string) => {
    setCalendarReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleDeleteCalendarReminder = (id: string) => {
    setCalendarReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Task Handlers
  const handleAddTask = (title: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    const newTask: TaskItem = {
      id: 'task-' + Date.now(),
      title,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Timer Handlers
  const handleAddTimer = (seconds: number, label: string) => {
    const newTimer: ActiveTimer = {
      id: 'tmr-' + Date.now(),
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
      createdAt: Date.now(),
    };
    setTimers((prev) => [newTimer, ...prev]);
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  // Alarm Handlers
  const handleAddAlarm = (time: string, label: string) => {
    const newAlarm: ActiveAlarm = {
      id: 'alm-' + Date.now(),
      time,
      label,
      isActive: true,
    };
    setAlarms((prev) => [newAlarm, ...prev]);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  // Multilingual quick prompt suggestions (Questions, Controls, Studies)
  const quickPromptsByLang = {
    en: [
      'What is the distance between Earth and Moon?',
      'Who is Albert Einstein?',
      'Why is the sky blue?',
      'Calculate 45 * 80',
      'Study Malayalam language with me',
      'Study Hindi language with me',
      'Turn off the screen',
      'Low the volume to 25%',
      'High the brightness to 95%',
      'Add reminder in calendar: Team sync tomorrow at 3pm',
      'Search the internet for James Webb discoveries',
      'Turn on night shield',
      'Turn on security lockdown',
    ],
    ml: [
      'ഭൂമിയും ചന്ദ്രനും തമ്മിലുള്ള ദൂരം എത്രയാണ്?',
      'ആരാണ് ആൽബർട്ട് ഐൻസ്റ്റീൻ?',
      'ആകാശത്തിന് നീലനിറം എന്തുകൊണ്ട്?',
      'ഹലോ കോസ്മിക്, സുഖമാണോ?',
      'മലയാളം പഠിപ്പിക്കൂ (Teach Malayalam)',
      'കോസ്മിക്, വോളിയം 25% ആക്കൂ',
      'കോസ്മിക്, സ്ക്രീൻ ഓഫ് ചെയ്യൂ',
      'കലണ്ടറിൽ മീറ്റിംഗ് റിമൈൻഡർ ചേർക്കൂ',
      'നൈറ്റ് ഷീൽഡ് ഓൺ ചെയ്യൂ',
    ],
    hi: [
      'पृथ्वी और चंद्रमा के बीच की दूरी कितनी है?',
      'अल्बर्ट आइंस्टीन कौन थे?',
      'आसमान का रंग नीला क्यों होता है?',
      'नमस्ते कॉस्मिक, आप कैसे हैं?',
      'मुझे हिन्दी सिखाओ (Teach Hindi)',
      'कॉस्मिक, वॉल्यूम 20% करो',
      'कॉस्मिक, स्क्रीन बंद करो',
      'कैलेंडर में मीटिंग का रिमाइंडर जोड़ो',
      'नाइट शील्ड चालू करो',
    ],
  };

  // Dynamic Theme Palette Class
  const getThemeClass = () => {
    switch (deviceSettings.theme) {
      case 'gold':
        return 'theme-gold selection:bg-amber-500 text-amber-50';
      case 'stealth':
        return 'theme-stealth selection:bg-emerald-500 text-emerald-50';
      case 'crimson':
        return 'theme-crimson selection:bg-rose-500 text-rose-50';
      case 'daylight':
        return 'theme-daylight selection:bg-sky-400 text-slate-100';
      default:
        return 'theme-cyan selection:bg-cyan-500 text-slate-100';
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full bg-slate-950 cosmic-grid overflow-hidden relative ${getThemeClass()}`}>
      {/* Real Screen Luminescence / Dimming Filter */}
      <div
        className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
        style={{
          backgroundColor: '#000000',
          opacity: Math.max(0, ((100 - deviceSettings.brightness) / 100) * 0.72),
        }}
      />

      {/* Night Shield Eye-Protection Overlay */}
      {deviceSettings.nightShield && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-amber-500/15 mix-blend-color transition-opacity duration-300" />
      )}

      {/* Screen Turn-Off / Sleep Standby Blackout Curtain */}
      {!deviceSettings.screenPower && (
        <div
          onClick={() => {
            playSuccessTone();
            handleToggleDeviceSetting('screenPower', true);
          }}
          className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
        >
          <div className="w-20 h-20 rounded-full border-2 border-cyan-500/40 flex items-center justify-center mb-6 animate-pulse bg-cyan-950/30">
            <Power className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="font-orbitron font-bold text-xl text-cyan-300 tracking-wider mb-2">
            DISPLAY POWERED OFF (STANDBY)
          </h2>
          <p className="font-chakra text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            All optical matrices are in sleep mode. Cosmic remains vigilant and listening.
            Say <span className="text-cyan-300 font-bold">"Hey Cosmic, turn on screen"</span> or tap anywhere on your display to awaken.
          </p>
          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center gap-2"
          >
            <Zap className="w-4 h-4" /> TAP SCREEN TO AWAKEN
          </button>
        </div>
      )}

      {/* Security Lockdown High-Priority Banner */}
      {deviceSettings.lockdown && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 py-1 px-4 flex items-center justify-center gap-2 text-rose-300 font-chakra text-xs z-30 font-bold animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>SECURITY LOCKDOWN ACTIVE — DEFENSIVE SHIELDS ENGAGED — PERIPHERALS RESTRICTED</span>
          <button
            onClick={() => handleToggleDeviceSetting('lockdown', false)}
            className="ml-3 underline hover:text-white text-[11px]"
          >
            DISENGAGE
          </button>
        </div>
      )}

      {/* Top Telemetry HUD */}
      <CosmicHud
        isVoiceMuted={isVoiceMuted}
        onToggleMute={() => setIsVoiceMuted(!isVoiceMuted)}
        selectedVoice={selectedVoice}
        onSelectVoice={(v) => setSelectedVoice(v)}
        onOpenTaskManager={() => setIsTaskManagerOpen(true)}
        onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
        onOpenWorkspaceHub={() => setIsWorkspaceHubOpen(true)}
        activeTaskCount={tasks.filter((t) => !t.completed).length}
        activeTimerCount={timers.filter((t) => t.remainingSeconds > 0).length}
        activeReminderCount={calendarReminders.filter((r) => !r.completed).length}
        currentVolume={deviceSettings.volume}
        currentBrightness={deviceSettings.brightness}
        currentTheme={deviceSettings.theme}
        deviceSettings={deviceSettings}
        operatingMode={operatingMode}
        onToggleOperatingMode={handleToggleOperatingMode}
      />

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left / Upper Holographic Arc Reactor Core Stage */}
        <div className="w-full md:w-5/12 lg:w-4/12 border-b md:border-b-0 md:border-r border-cyan-500/20 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-96 h-96 rounded-full border border-cyan-500/30 animate-pulse" />
            <div className="w-[500px] h-[500px] rounded-full border border-cyan-500/10" />
          </div>

          <ArcCore
            state={cosmicState}
            wakeWordEnabled={wakeWordEnabled}
            onCoreClick={handleCoreClick}
            onToggleWakeWord={handleToggleWakeWord}
            operatingMode={operatingMode}
          />
        </div>

        {/* Right / Center Chat & Actions Feed */}
        <div className="flex-1 flex flex-col h-full bg-slate-950/40 overflow-hidden">
          <ChatConsole
            messages={messages}
            interimTranscript={interimTranscript}
            isListening={cosmicState === 'listening'}
            onReplaySpeech={(text) =>
              speakText(text, { voice: selectedVoice, lang: currentLanguage })
            }
            onAddTask={handleAddTask}
            onAddTimer={handleAddTimer}
            onUpdateVolume={handleUpdateVolume}
            onUpdateBrightness={handleUpdateBrightness}
            onUpdateTheme={handleUpdateTheme}
            onToggleDeviceSetting={handleToggleDeviceSetting}
            onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
            onOpenWorkspaceHub={() => setIsWorkspaceHubOpen(true)}
            deviceSettings={deviceSettings}
            currentVolume={deviceSettings.volume}
            currentBrightness={deviceSettings.brightness}
          />

          {/* Language Selector + Quick Prompt Carousel */}
          <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Language Switcher Buttons */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 shrink-0">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              {(['en', 'ml', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    playClick();
                    setCurrentLanguage(lang);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-chakra font-bold uppercase transition-colors ${
                    currentLanguage === lang
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={
                    lang === 'en'
                      ? 'English'
                      : lang === 'ml'
                      ? 'മലയാളം (Malayalam)'
                      : 'हिन्दी (Hindi)'
                  }
                >
                  {lang === 'en' ? 'EN' : lang === 'ml' ? 'മല' : 'हिं'}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-cyan-400 font-chakra uppercase font-bold shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Quick:
            </span>

            {quickPromptsByLang[currentLanguage].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  playClick();
                  handleUserQuery(prompt);
                }}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 font-chakra text-[11px] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Bottom Command Input Bar */}
          <div className="p-3 bg-slate-950/90 border-t border-cyan-500/20">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputText.trim()) {
                  playClick();
                  handleUserQuery(inputText);
                }
              }}
              className="flex items-center gap-2 max-w-4xl mx-auto"
            >
              {/* Mic / Tap-to-Talk button */}
              <button
                type="button"
                onClick={handleCoreClick}
                className={`p-2.5 sm:px-3.5 rounded-xl border flex items-center gap-1.5 font-chakra text-xs font-bold transition-all ${
                  cosmicState === 'listening'
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                    : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/40'
                }`}
                title={
                  cosmicState === 'listening'
                    ? 'Listening... click to stop'
                    : `Click to talk (${currentLanguage === 'ml' ? 'Malayalam' : currentLanguage === 'hi' ? 'Hindi' : 'English'})`
                }
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {cosmicState === 'listening'
                    ? 'Listening...'
                    : currentLanguage === 'ml'
                    ? 'സംസാരിക്കൂ'
                    : currentLanguage === 'hi'
                    ? 'बोलिए'
                    : 'Speak'}
                </span>
              </button>

              {/* Text Input with multilingual placeholder */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    currentLanguage === 'ml'
                      ? "എന്തും ചോദിക്കൂ, 'സ്ക്രീൻ ഓഫ് ചെയ്യൂ', 'വോളിയം കുറയ്ക്കൂ'..."
                      : currentLanguage === 'hi'
                      ? "कुछ भी पूछें, 'स्क्रीन बंद करो', 'वॉल्यूम कम करो'..."
                      : "Ask anything, 'Study Malayalam with me', 'Turn off screen', 'Low volume'..."
                  }
                  className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none transition-colors shadow-inner"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2.5 rounded-xl font-chakra text-xs font-bold transition-all ${
                  inputText.trim()
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Send query to Cosmic"
              >
                <Send className="w-4 h-4" />
              </button>

              {/* Clear conversation button */}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setMessages([]);
                    stopCurrentSpeech();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Task, Calendar & Operations Manager Drawer */}
      <TaskManager
        isOpen={isTaskManagerOpen}
        onClose={() => setIsTaskManagerOpen(false)}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleAddTask}
        calendarReminders={calendarReminders}
        onToggleCalendarReminder={handleToggleCalendarReminder}
        onDeleteCalendarReminder={handleDeleteCalendarReminder}
        onAddCalendarReminder={handleAddCalendarReminder}
        timers={timers}
        onDeleteTimer={handleDeleteTimer}
        onToggleTimer={handleToggleTimer}
        onAddTimer={handleAddTimer}
        alarms={alarms}
        onToggleAlarm={handleToggleAlarm}
        onDeleteAlarm={handleDeleteAlarm}
        onAddAlarm={handleAddAlarm}
        deviceSettings={deviceSettings}
        onUpdateVolume={handleUpdateVolume}
        onUpdateBrightness={handleUpdateBrightness}
        onUpdateTheme={handleUpdateTheme}
        onToggleDnd={handleToggleDnd}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleDeviceSetting={handleToggleDeviceSetting}
        onQuickCommand={(cmd) => handleUserQuery(cmd)}
      />

      {/* PC Desktop App & Background Runner Modal */}
      <DesktopCompanionModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
        onTriggerWakeWordTest={() => {
          playChime();
          setCosmicState('listening');
        }}
      />

      {/* Google Workspace & Live GPS Location Hub */}
      <GoogleWorkspaceHub
        isOpen={isWorkspaceHubOpen}
        onClose={() => setIsWorkspaceHubOpen(false)}
        onSendSystemMessage={(txt) => {
          setMessages((prev) => [
            ...prev,
            {
              id: 'sys-' + Date.now(),
              role: 'assistant',
              text: txt,
              spokenText: txt,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ]);
        }}
      />
    </div>
  );
}
