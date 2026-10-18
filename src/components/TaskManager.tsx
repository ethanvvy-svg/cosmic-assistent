import React, { useState } from 'react';
import { ActiveTimer, ActiveAlarm, TaskItem } from '../types';
import {
  X,
  Timer as TimerIcon,
  Bell,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { playClick, playSuccessTone } from '../utils/audio';

interface TaskManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (title: string, priority: 'low' | 'medium' | 'high') => void;
  timers: ActiveTimer[];
  onDeleteTimer: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onAddTimer: (seconds: number, label: string) => void;
  alarms: ActiveAlarm[];
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onAddAlarm: (time: string, label: string) => void;
  onQuickCommand: (cmd: string) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  isOpen,
  onClose,
  tasks,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  timers,
  onDeleteTimer,
  onToggleTimer,
  onAddTimer,
  alarms,
  onToggleAlarm,
  onDeleteAlarm,
  onAddAlarm,
  onQuickCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'timers' | 'alarms'>('tasks');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Manual timer inputs
  const [timerMinutes, setTimerMinutes] = useState('5');
  const [timerLabel, setTimerLabel] = useState('Focus');

  // Manual alarm inputs
  const [alarmTime, setAlarmTime] = useState('08:00');
  const [alarmLabel, setAlarmLabel] = useState('Morning Briefing');

  if (!isOpen) return null;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    playSuccessTone();
    onAddTask(newTaskInput.trim(), newTaskPriority);
    setNewTaskInput('');
  };

  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(timerMinutes);
    if (isNaN(mins) || mins <= 0) return;
    playSuccessTone();
    onAddTimer(Math.round(mins * 60), timerLabel || 'Timer');
  };

  const handleCreateAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTime) return;
    playSuccessTone();
    onAddAlarm(alarmTime, alarmLabel || 'Alarm');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-slate-950 border-l border-cyan-500/30 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-sm tracking-wide text-cyan-200">
              OPERATIONS & TASKS
            </h2>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 font-chakra text-xs">
          <button
            onClick={() => {
              playClick();
              setActiveTab('tasks');
            }}
            className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
              activeTab === 'tasks'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tasks ({tasks.filter((t) => !t.completed).length})
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('timers');
            }}
            className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
              activeTab === 'timers'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Timers ({timers.length})
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('alarms');
            }}
            className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
              activeTab === 'alarms'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Alarms ({alarms.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Add Task Form */}
              <form onSubmit={handleCreateTask} className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder="Add a new task (e.g. Schedule meeting)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-chakra"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 font-chakra text-[11px]">
                    <span className="text-slate-400">Priority:</span>
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className={`px-2 py-0.5 rounded capitalize ${
                          newTaskPriority === p
                            ? p === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-chakra transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>
              </form>

              {/* Task list */}
              {tasks.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-chakra">
                  No active tasks. Tell Cosmic <span className="text-cyan-400">"Add task..."</span> or type above.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start justify-between gap-2 p-3 rounded-lg border transition-all ${
                        task.completed
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <button
                        onClick={() => {
                          playClick();
                          onToggleTask(task.id);
                        }}
                        className="mt-0.5 text-cyan-400 hover:text-cyan-300"
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium font-sans break-words ${
                            task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {task.title}
                        </p>
                        <span className={`inline-block text-[9px] font-chakra uppercase font-bold mt-1 px-1.5 py-0.2 rounded border ${
                          task.priority === 'high'
                            ? 'text-rose-400 border-rose-500/30'
                            : task.priority === 'medium'
                            ? 'text-amber-400 border-amber-500/30'
                            : 'text-slate-400 border-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          playClick();
                          onDeleteTask(task.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMERS */}
          {activeTab === 'timers' && (
            <div className="space-y-4">
              {/* Add Timer Form */}
              <form onSubmit={handleCreateTimer} className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-chakra block mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-chakra focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-chakra block mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={timerLabel}
                      onChange={(e) => setTimerLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-chakra focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-chakra transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Start Timer
                </button>
              </form>

              {/* Timer list */}
              {timers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-chakra">
                  No active countdown timers. Say <span className="text-cyan-400">"Set a timer for 10 minutes"</span>.
                </div>
              ) : (
                <div className="space-y-2">
                  {timers.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-chakra text-xs text-slate-300 font-medium">
                          {t.label}
                        </span>
                        <div className="font-orbitron text-xl font-bold text-cyan-300 mt-0.5">
                          {formatSeconds(t.remainingSeconds)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            playClick();
                            onToggleTimer(t.id);
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                        >
                          {t.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            playClick();
                            onDeleteTimer(t.id);
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALARMS */}
          {activeTab === 'alarms' && (
            <div className="space-y-4">
              {/* Add Alarm Form */}
              <form onSubmit={handleCreateAlarm} className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-chakra block mb-1">
                      Alarm Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={alarmTime}
                      onChange={(e) => setAlarmTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-chakra focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-chakra block mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={alarmLabel}
                      onChange={(e) => setAlarmLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-chakra focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs font-chakra transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Arm Alarm
                </button>
              </form>

              {/* Alarm list */}
              {alarms.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-chakra">
                  No scheduled alarms. Say <span className="text-amber-400">"Set alarm for 7:30 AM"</span>.
                </div>
              ) : (
                <div className="space-y-2">
                  {alarms.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-orbitron text-lg font-bold text-amber-300">
                          {a.time}
                        </div>
                        <span className="font-chakra text-xs text-slate-400">
                          {a.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            playClick();
                            onToggleAlarm(a.id);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-chakra font-bold border transition-colors ${
                            a.isActive
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {a.isActive ? 'ACTIVE' : 'OFF'}
                        </button>
                        <button
                          onClick={() => {
                            playClick();
                            onDeleteAlarm(a.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Voice Prompt Shortcuts */}
        <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs font-chakra">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            Cosmic Quick Commands
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "What's the weather today?",
              'Set a 5 minute timer',
              'Draft an email to client',
              'Summarize latest 2026 tech news',
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => {
                  playClick();
                  onClose();
                  onQuickCommand(cmd);
                }}
                className="px-2 py-1 rounded-full bg-slate-950 border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-colors text-[11px]"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
