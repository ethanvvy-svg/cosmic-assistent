export type CosmicState = 'standby' | 'listening' | 'thinking' | 'speaking' | 'error';

export type CosmicTheme = 'cyan' | 'gold' | 'stealth' | 'crimson' | 'daylight';

export type OperatingMode = 'normal' | 'specific';

export interface ActionPayload {
  type:
    | 'weather'
    | 'timer'
    | 'alarm'
    | 'task'
    | 'email'
    | 'event'
    | 'calendar_reminder'
    | 'device_control'
    | 'device_telemetry'
    | 'web_search'
    | 'knowledge_answer'
    | 'pc_desktop_guide'
    | 'mode_shift'
    | 'open_link'
    | 'calc'
    | 'system'
    | 'routine'
    | 'youtube_search';
  mode?: OperatingMode;
  setting?: string;
  action?: string;
  value?: any;
  target?: string;
  status?: string;
  query?: string;
  title?: string;
  summary?: string;
  source?: 'gemini' | 'google' | 'cosmic_core' | 'hybrid';
  results?: Array<{ title: string; snippet: string; url: string }>;
  googleUrl?: string;
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

export interface CalendarReminder {
  id: string;
  title: string;
  date: string;
  time?: string;
  notes?: string;
  location?: string;
  completed: boolean;
  googleCalendarUrl?: string;
  createdAt: string;
}

export interface DeviceSettings {
  volume: number; // 0 to 100
  brightness: number; // 15 to 100
  screenPower: boolean; // true = on, false = blackout/off
  nightShield: boolean; // blue light filter warm overlay
  theme: CosmicTheme;
  dnd: boolean;
  fullscreen: boolean;
  batterySaver: boolean;
  overdrive: boolean;
  wifi: boolean;
  bluetooth: boolean;
  airplaneMode: boolean;
  lockdown: boolean;
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

export interface LiveDeviceTelemetry {
  platform: string;
  isMobile: boolean;
  battery: {
    supported: boolean;
    level: number;
    charging: boolean;
    chargingTime?: number;
    dischargingTime?: number;
  };
  network: {
    online: boolean;
    effectiveType: string;
    downlinkMbps: number;
    rttMs: number;
    saveData: boolean;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    devicePixelRatio: number;
    orientation: string;
    fullscreen: boolean;
    visibility: 'visible' | 'hidden';
  };
  motion?: {
    supported: boolean;
    alpha: number;
    beta: number;
    gamma: number;
    posture: 'flat_table' | 'upright_portrait' | 'landscape' | 'tilted';
    isMoving: boolean;
  };
  hardware: {
    cpuCores: number;
    deviceMemoryGb: number;
    touchPoints: number;
  };
  storage?: {
    supported: boolean;
    quotaMb: number;
    usageMb: number;
    percentUsed: number;
  };
  localTime: string;
  timezone: string;
}
