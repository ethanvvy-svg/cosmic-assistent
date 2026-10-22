import React, { useState } from 'react';
import { ActiveTimer, ActiveAlarm, TaskItem, CalendarReminder, DeviceSettings, CosmicTheme } from '../types';
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
  Calendar,
  Volume2,
  VolumeX,
  Sun,
  Sliders,
  Moon,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  Shield,
  ShieldOff,
} from 'lucide-react';
import { playClick, playSuccessTone } from '../utils/audio';

interface TaskManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (title: string, priority: 'low' | 'medium' | 'high') => void;
  calendarReminders: CalendarReminder[];
  onToggleCalendarReminder: (id: string) => void;
  onDeleteCalendarReminder: (id: string) => void;
  onAddCalendarReminder: (title: string, date: string, time?: string, notes?: string) => void;
  timers: ActiveTimer[];
  onDeleteTimer: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onAddTimer: (seconds: number, label: string) => void;
  alarms: ActiveAlarm[];
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onAddAlarm: (time: string, label: string) => void;
  deviceSettings: DeviceSettings;
  onUpdateVolume: (vol: number) => void;
  onUpdateBrightness: (bright: number) => void;
  onUpdateTheme: (theme: CosmicTheme) => void;
  onToggleDnd: () => void;
  onToggleFullscreen: () => void;
  onToggleDeviceSetting: (setting: string, val?: boolean) => void;
  onQuickCommand: (cmd: string) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  isOpen,
  onClose,
  tasks,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  calendarReminders,
  onToggleCalendarReminder,
  onDeleteCalendarReminder,
  onAddCalendarReminder,
  timers,
  onDeleteTimer,
  onToggleTimer,
  onAddTimer,
  alarms,
  onToggleAlarm,
  onDeleteAlarm,
  onAddAlarm,
  deviceSettings,
  onUpdateVolume,
  onUpdateBrightness,
  onUpdateTheme,
  onToggleDnd,
  onToggleFullscreen,
  onQuickCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'timers' | 'device'>('calendar');

  // Manual task inputs
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Manual calendar reminder inputs
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [reminderTime, setReminderTime] = useState('14:00');
  const [reminderNotes, setReminderNotes] = useState('');

  // Manual timer inputs
  const [timerMinutes, setTimerMinutes] = useState('5');
  const [timerLabel, setTimerLabel] = useState('Focus Session');

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

  const handleCreateCalendarReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;
    playSuccessTone();
    onAddCalendarReminder(reminderTitle.trim(), reminderDate, reminderTime, reminderNotes);
    setReminderTitle('');
    setReminderNotes('');
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

  const downloadIcs = (reminder: CalendarReminder) => {
    playClick();
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//COSMIC AI Assistant//EN\nBEGIN:VEVENT\nSUMMARY:${reminder.title}\nDESCRIPTION:${reminder.notes || 'Cosmic Calendar Reminder'}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reminder.title.replace(/\s+/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-slate-950 border-l border-cyan-500/30 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-sm tracking-wide text-cyan-200">
              COSMIC COMMAND & CONTROL
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
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/40 font-chakra text-[11px]">
          <button
            onClick={() => {
              playClick();
              setActiveTab('calendar');
            }}
            className={`py-2.5 text-center font-medium border-b-2 transition-all flex flex-col items-center gap-1 ${
              activeTab === 'calendar'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar ({calendarReminders.filter((r) => !r.completed).length})</span>
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('tasks');
            }}
            className={`py-2.5 text-center font-medium border-b-2 transition-all flex flex-col items-center gap-1 ${
              activeTab === 'tasks'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks ({tasks.filter((t) => !t.completed).length})</span>
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('timers');
            }}
            className={`py-2.5 text-center font-medium border-b-2 transition-all flex flex-col items-center gap-1 ${
              activeTab === 'timers'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TimerIcon className="w-3.5 h-3.5" />
            <span>Timers ({timers.length})</span>
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('device');
            }}
            className={`py-2.5 text-center font-medium border-b-2 transition-all flex flex-col items-center gap-1 ${
              activeTab === 'device'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: CALENDAR & REMINDERS */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              {/* Add Calendar Reminder Form */}
              <form onSubmit={handleCreateCalendarReminder} className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Event / Reminder title (e.g. Doctor sync)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-chakra"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-chakra block mb-1">Date</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-chakra focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-chakra block mb-1">Time</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-chakra focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="Notes or location (optional)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-chakra"
                />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-chakra transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Calendar Reminder
                </button>
              </form>

              {/* Reminders list */}
              {calendarReminders.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-chakra">
                  No upcoming calendar reminders. Tell Cosmic <span className="text-cyan-400">"Add reminder in calendar..."</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {calendarReminders.map((rem) => {
                    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      rem.title
                    )}&details=${encodeURIComponent(rem.notes || 'Cosmic Reminder')}`;

                    return (
                      <div
                        key={rem.id}
                        className={`p-3 rounded-xl border transition-all ${
                          rem.completed
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-900/80 border-cyan-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => {
                                playClick();
                                onToggleCalendarReminder(rem.id);
                              }}
                              className="mt-0.5 text-cyan-400 hover:text-cyan-300"
                            >
                              {rem.completed ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <div>
                              <h4 className={`text-xs font-bold font-orbitron ${
                                rem.completed ? 'line-through text-slate-500' : 'text-slate-100'
                              }`}>
                                {rem.title}
                              </h4>
                              <p className="text-[11px] text-cyan-300/80 font-chakra">
                                {rem.date} {rem.time ? `at ${rem.time}` : ''}
                              </p>
                              {rem.notes && (
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                                  {rem.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              playClick();
                              onDeleteCalendarReminder(rem.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[10px] font-chakra">
                          <a
                            href={googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={playClick}
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Calendar</span>
                          </a>
                          <span className="text-slate-600">|</span>
                          <button
                            onClick={() => downloadIcs(rem)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                          >
                            <Download className="w-3 h-3" />
                            <span>Export .ics</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
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

          {/* TAB 3: TIMERS & ALARMS */}
          {activeTab === 'timers' && (
            <div className="space-y-4">
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

              {timers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-chakra text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Active Timers</h4>
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

              {/* Alarms section */}
              <div className="pt-2 border-t border-slate-800">
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

                {alarms.length > 0 && (
                  <div className="space-y-2 mt-3">
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
            </div>
          )}

          {/* TAB 4: DEVICE SETTINGS & TELEMETRY */}
          {activeTab === 'device' && (
            <div className="space-y-4">
              {/* Volume Controller */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400">
                    {deviceSettings.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span className="font-orbitron text-xs font-bold text-cyan-200">
                      SYSTEM VOLUME
                    </span>
                  </div>
                  <span className="font-orbitron text-sm font-bold text-cyan-300">
                    {deviceSettings.volume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deviceSettings.volume}
                  onChange={(e) => onUpdateVolume(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex items-center justify-between text-[10px] font-chakra text-slate-400">
                  <button onClick={() => onUpdateVolume(0)} className="hover:text-cyan-300">Mute</button>
                  <button onClick={() => onUpdateVolume(25)} className="hover:text-cyan-300">Low (25%)</button>
                  <button onClick={() => onUpdateVolume(60)} className="hover:text-cyan-300">Med (60%)</button>
                  <button onClick={() => onUpdateVolume(100)} className="hover:text-cyan-300">High (100%)</button>
                </div>
              </div>

              {/* Brightness Controller */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Sun className="w-4 h-4" />
                    <span className="font-orbitron text-xs font-bold text-amber-200">
                      DISPLAY BRIGHTNESS
                    </span>
                  </div>
                  <span className="font-orbitron text-sm font-bold text-amber-300">
                    {deviceSettings.brightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="100"
                  value={deviceSettings.brightness}
                  onChange={(e) => onUpdateBrightness(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex items-center justify-between text-[10px] font-chakra text-slate-400">
                  <button onClick={() => onUpdateBrightness(25)} className="hover:text-amber-300">Night (25%)</button>
                  <button onClick={() => onUpdateBrightness(50)} className="hover:text-amber-300">Dim (50%)</button>
                  <button onClick={() => onUpdateBrightness(80)} className="hover:text-amber-300">Normal (80%)</button>
                  <button onClick={() => onUpdateBrightness(100)} className="hover:text-amber-300">Max (100%)</button>
                </div>
              </div>

              {/* Theme Palette Switcher */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-orbitron text-xs font-bold text-slate-200">
                    HUD THEME PROFILE
                  </span>
                  <span className="font-chakra text-[10px] uppercase font-bold text-cyan-300">
                    {deviceSettings.theme}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-chakra text-[11px]">
                  {[
                    { id: 'cyan', label: 'Stark Cyan', color: 'bg-cyan-500' },
                    { id: 'gold', label: 'Mark VII Gold', color: 'bg-amber-500' },
                    { id: 'stealth', label: 'Tactical Green', color: 'bg-emerald-500' },
                    { id: 'crimson', label: 'Void Crimson', color: 'bg-rose-500' },
                    { id: 'daylight', label: 'Daylight Mode', color: 'bg-sky-300' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        playClick();
                        onUpdateTheme(t.id as CosmicTheme);
                      }}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${
                        deviceSettings.theme === t.id
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Toggles: Fullscreen & DND */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    playClick();
                    onToggleDnd();
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-chakra text-xs transition-all ${
                    deviceSettings.dnd
                      ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {deviceSettings.dnd ? <ShieldOff className="w-5 h-5 text-rose-400" /> : <Shield className="w-5 h-5 text-cyan-400" />}
                  <span className="font-bold">Do Not Disturb</span>
                  <span className="text-[10px] text-slate-400">{deviceSettings.dnd ? 'ARMED (Quiet)' : 'OFF (Normal)'}</span>
                </button>

                <button
                  onClick={() => {
                    playClick();
                    onToggleFullscreen();
                  }}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 flex flex-col items-center justify-center gap-1.5 font-chakra text-xs text-slate-300 transition-all"
                >
                  {deviceSettings.fullscreen ? <Minimize2 className="w-5 h-5 text-cyan-400" /> : <Maximize2 className="w-5 h-5 text-cyan-400" />}
                  <span className="font-bold">Fullscreen HUD</span>
                  <span className="text-[10px] text-slate-400">{deviceSettings.fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
                </button>
              </div>

              {/* One-Click Executive Routines */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-2">
                <span className="font-orbitron text-xs font-bold text-purple-200 block mb-1">
                  PERSONAL AUTOMATION ROUTINES
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playClick();
                      onClose();
                      onQuickCommand('Good morning Cosmic, give me my daily briefing');
                    }}
                    className="p-2.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/30 text-amber-200 text-left font-chakra text-xs transition-colors flex items-center gap-2"
                  >
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold block">Morning Routine</span>
                      <span className="text-[10px] text-slate-400">Briefing & daylight</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      playClick();
                      onClose();
                      onQuickCommand('Good night Cosmic, engage night mode');
                    }}
                    className="p-2.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 text-indigo-200 text-left font-chakra text-xs transition-colors flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="font-bold block">Night Routine</span>
                      <span className="text-[10px] text-slate-400">Dim screen & alarms</span>
                    </div>
                  </button>
                </div>
              </div>
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
              "Add reminder in calendar: Team sync tomorrow at 3pm",
              'Lower volume to 25%',
              'High the brightness to 90%',
              'Good morning briefing',
              'Set timer for 10 minutes',
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => {
                  playClick();
                  onClose();
                  onQuickCommand(cmd);
                }}
                className="px-2 py-1 rounded-full bg-slate-950 border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-colors text-[10px] truncate max-w-[220px]"
                title={cmd}
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
