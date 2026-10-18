export type CosmicState = 'standby' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface ActionPayload {
  type: 'weather' | 'timer' | 'alarm' | 'task' | 'email' | 'event' | 'open_link' | 'calc' | 'system';
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  spokenText?: string;
  action?: ActionPayload;
  sources?: string[];
  timestamp: string;
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: number;
}

export interface ActiveAlarm {
  id: string;
  label: string;
  time: string; // HH:MM
  isActive: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
}

export interface WeatherData {
  city: string;
  temp: string;
  condition: string;
  humidity?: string;
  wind?: string;
  high?: string;
  low?: string;
  summary?: string;
}

export interface EmailDraft {
  recipient?: string;
  subject?: string;
  body: string;
}
