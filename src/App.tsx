import React, { useState, useEffect, useRef } from 'react';
import { CosmicState, ChatMessage, ActiveTimer, ActiveAlarm, TaskItem } from './types';
import { ArcCore } from './components/ArcCore';
import { CosmicHud } from './components/CosmicHud';
import { ChatConsole } from './components/ChatConsole';
import { TaskManager } from './components/TaskManager';
import { cosmicSpeech } from './utils/speech';
import {
  playChime,
  playSuccessTone,
  playAlarmBuzzer,
  playClick,
  speakText,
  stopCurrentSpeech,
} from './utils/audio';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trash2,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';

export default function App() {
  // State
  const [cosmicState, setCosmicState] = useState<CosmicState>('standby');
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Fenrir');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState<boolean>(false);

  // Active user data
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('cosmic_tasks');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 't-1',
            title: 'Welcome to COSMIC AI. Try saying "Hey Cosmic, what is the weather?"',
            priority: 'medium',
            completed: false,
            createdAt: new Date().toISOString(),
          },
        ];
  });

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
    localStorage.setItem('cosmic_alarms', JSON.stringify(alarms));
  }, [alarms]);

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

      if (currentSec === 0) {
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
  }, [alarms, isVoiceMuted, selectedVoice]);

  // Initialize Speech Recognition handlers
  useEffect(() => {
    if (!cosmicSpeech.isSupported()) return;

    cosmicSpeech.onTranscript((text: string, isFinal: boolean) => {
      setInterimTranscript(text);
      if (isFinal && text.trim()) {
        setInterimTranscript('');
        handleUserQuery(text.trim());
      }
    });

    cosmicSpeech.onWakeWord((command: string) => {
      playChime();
      if (command && command.length > 2) {
        handleUserQuery(command);
      } else {
        // Just woke up, enter active listening
        setCosmicState('listening');
      }
    });

    cosmicSpeech.onStateChange((listening: boolean) => {
      if (listening && cosmicState === 'standby') {
        // In wake-word mode, stay standby unless triggered
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

    stopCurrentSpeech();
    cosmicSpeech.stopListening();

    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Add user message to feed
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

    try {
      // User location context if available
      let userLocation = 'Unknown';
      try {
        userLocation = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {}

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          userLocation,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || "I'm standing by, sir.";
      const spoken = data.spokenText || replyText;
      const action = data.action;

      // Execute side-effects for actions
      if (action) {
        playSuccessTone();

        // 1. Task Action
        if (action.type === 'task') {
          handleAddTask(action.title || action.task || 'Everyday note', action.priority || 'medium');
        }

        // 2. Timer Action
        if (action.type === 'timer' && action.seconds) {
          handleAddTimer(Number(action.seconds), action.label || 'Timer');
        }

        // 3. Alarm Action
        if (action.type === 'alarm' && action.time) {
          handleAddAlarm(action.time, action.label || 'Scheduled Alarm');
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

      // Speak answer out loud
      if (!isVoiceMuted) {
        setCosmicState('speaking');
        speakText(spoken, {
          voice: selectedVoice,
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
      console.error('Failed to communicate with Cosmic:', err);
      setCosmicState('error');

      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          text: `Neural telemetry alert: Unable to reach core services. Please verify system connection. (${err.message})`,
          timestamp,
        },
      ]);

      setTimeout(() => {
        setCosmicState('standby');
        if (wakeWordEnabled) cosmicSpeech.startListening(true);
      }, 3000);
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
      // Tap to talk
      stopCurrentSpeech();
      playChime();
      setCosmicState('listening');
      cosmicSpeech.startListening(false);
    }
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

  // Quick prompt suggestions
  const quickPrompts = [
    "What's the weather today?",
    'Set a 5 minute timer',
    'Add task: Review proposal',
    'Draft a polite follow-up email',
    'Explain quantum computing simply',
    'Calculate 20% tip on $85.50',
    'Who won the most recent Super Bowl?',
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 cosmic-grid selection:bg-cyan-500 selection:text-black overflow-hidden">
      {/* Top Telemetry HUD */}
      <CosmicHud
        isVoiceMuted={isVoiceMuted}
        onToggleMute={() => setIsVoiceMuted(!isVoiceMuted)}
        selectedVoice={selectedVoice}
        onSelectVoice={(v) => setSelectedVoice(v)}
        onOpenTaskManager={() => setIsTaskManagerOpen(true)}
        activeTaskCount={tasks.filter((t) => !t.completed).length}
        activeTimerCount={timers.filter((t) => t.remainingSeconds > 0).length}
      />

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left / Upper Holographic Arc Reactor Core Stage */}
        <div className="w-full md:w-5/12 lg:w-4/12 border-b md:border-b-0 md:border-r border-cyan-500/20 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
          {/* Subtle background radar circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-96 h-96 rounded-full border border-cyan-500/30 animate-pulse" />
            <div className="w-[500px] h-[500px] rounded-full border border-cyan-500/10" />
          </div>

          <ArcCore
            state={cosmicState}
            wakeWordEnabled={wakeWordEnabled}
            onCoreClick={handleCoreClick}
            onToggleWakeWord={handleToggleWakeWord}
          />
        </div>

        {/* Right / Center Chat & Actions Feed */}
        <div className="flex-1 flex flex-col h-full bg-slate-950/40 overflow-hidden">
          {/* Messages Console */}
          <ChatConsole
            messages={messages}
            interimTranscript={interimTranscript}
            isListening={cosmicState === 'listening'}
            onReplaySpeech={(text) =>
              speakText(text, { voice: selectedVoice })
            }
            onAddTask={handleAddTask}
            onAddTimer={handleAddTimer}
          />

          {/* Quick Prompt Carousel Chips */}
          <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-cyan-400 font-chakra uppercase font-bold shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Quick:
            </span>
            {quickPrompts.map((prompt) => (
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
                  cosmicState === 'listening' ? 'Listening... click to stop' : 'Click to talk'
                }
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {cosmicState === 'listening' ? 'Listening...' : 'Speak'}
                </span>
              </button>

              {/* Text Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask anything, say 'What is the weather', 'Set timer', 'Draft email'..."
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

      {/* Task & Operations Manager Drawer */}
      <TaskManager
        isOpen={isTaskManagerOpen}
        onClose={() => setIsTaskManagerOpen(false)}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleAddTask}
        timers={timers}
        onDeleteTimer={handleDeleteTimer}
        onToggleTimer={handleToggleTimer}
        onAddTimer={handleAddTimer}
        alarms={alarms}
        onToggleAlarm={handleToggleAlarm}
        onDeleteAlarm={handleDeleteAlarm}
        onAddAlarm={handleAddAlarm}
        onQuickCommand={(cmd) => handleUserQuery(cmd)}
      />
    </div>
  );
}
