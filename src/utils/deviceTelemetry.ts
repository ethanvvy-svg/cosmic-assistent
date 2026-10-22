// Device Telemetry & Sensory Engine
// Monitors live battery, network speed, device orientation (gyroscope/accelerometer),
// screen state, memory, storage, location, and hardware platform.

import { LiveDeviceTelemetry } from '../types';

let cachedBattery: any = null;
let currentOrientation = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  posture: 'flat_table' as 'flat_table' | 'upright_portrait' | 'landscape' | 'tilted',
};
let isDeviceMoving = false;
let motionTimeout: any = null;

// Initialize Battery API if available in browser
if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
  try {
    (navigator as any).getBattery().then((battery: any) => {
      cachedBattery = battery;
      battery.addEventListener('chargingchange', () => {
        // notify listeners if needed
      });
      battery.addEventListener('levelchange', () => {
        // notify listeners if needed
      });
    }).catch(() => {});
  } catch (e) {}
}

// Initialize Device Orientation and Gyroscope
if (typeof window !== 'undefined') {
  window.addEventListener(
    'deviceorientation',
    (event) => {
      const alpha = Math.round(event.alpha || 0); // 0-360 deg compass
      const beta = Math.round(event.beta || 0); // -180 to 180 deg (front/back tilt)
      const gamma = Math.round(event.gamma || 0); // -90 to 90 deg (left/right tilt)

      let posture: 'flat_table' | 'upright_portrait' | 'landscape' | 'tilted' = 'flat_table';

      // If phone is lying roughly flat on a desk/table
      if (Math.abs(beta) < 25 && Math.abs(gamma) < 25) {
        posture = 'flat_table';
      } else if (beta > 50 && beta < 120 && Math.abs(gamma) < 35) {
        posture = 'upright_portrait';
      } else if (Math.abs(gamma) > 55) {
        posture = 'landscape';
      } else {
        posture = 'tilted';
      }

      currentOrientation = { alpha, beta, gamma, posture };
    },
    { passive: true }
  );

  // Motion & Shake detection
  window.addEventListener(
    'devicemotion',
    (event) => {
      const acc = event.accelerationIncludingGravity;
      if (acc) {
        const magnitude = Math.sqrt(
          (acc.x || 0) * (acc.x || 0) +
            (acc.y || 0) * (acc.y || 0) +
            (acc.z || 0) * (acc.z || 0)
        );
        // Standard earth gravity is ~9.8 m/s^2. If total acceleration changes by > 3 m/s^2, device is moving
        if (Math.abs(magnitude - 9.8) > 2.8) {
          isDeviceMoving = true;
          if (motionTimeout) clearTimeout(motionTimeout);
          motionTimeout = setTimeout(() => {
            isDeviceMoving = false;
          }, 1200);
        }
      }
    },
    { passive: true }
  );
}

// Detect operating system and device model
export function detectPlatformInfo(): { platform: string; isMobile: boolean } {
  if (typeof window === 'undefined') return { platform: 'Unknown Server', isMobile: false };

  const ua = navigator.userAgent || '';
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
    ('ontouchstart' in window && window.innerWidth < 850);

  let os = 'Unknown OS';
  if (/Android/i.test(ua)) os = 'Android Mobile';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'Apple iOS';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';

  return { platform: os, isMobile };
}

// Retrieve real-time snapshot of all device telemetry
export async function getLiveDeviceTelemetry(): Promise<LiveDeviceTelemetry> {
  const { platform, isMobile } = detectPlatformInfo();

  // Battery info
  let batteryData = {
    supported: false,
    level: 100,
    charging: true,
    chargingTime: 0,
    dischargingTime: 0,
  };

  if (cachedBattery) {
    batteryData = {
      supported: true,
      level: Math.round((cachedBattery.level ?? 1) * 100),
      charging: !!cachedBattery.charging,
      chargingTime: cachedBattery.chargingTime || 0,
      dischargingTime: cachedBattery.dischargingTime || 0,
    };
  } else if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const bat = await (navigator as any).getBattery();
      cachedBattery = bat;
      batteryData = {
        supported: true,
        level: Math.round((bat.level ?? 1) * 100),
        charging: !!bat.charging,
        chargingTime: bat.chargingTime || 0,
        dischargingTime: bat.dischargingTime || 0,
      };
    } catch (e) {}
  }

  // Network connection
  const conn =
    typeof navigator !== 'undefined'
      ? (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      : null;

  const networkData = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: conn?.effectiveType || '4g',
    downlinkMbps: conn?.downlink ? Number(conn.downlink) : 10.0,
    rttMs: conn?.rtt ? Number(conn.rtt) : 40,
    saveData: !!conn?.saveData,
  };

  // Screen & Display
  const screenData = {
    width: typeof window !== 'undefined' ? window.screen.width : 1920,
    height: typeof window !== 'undefined' ? window.screen.height : 1080,
    colorDepth: typeof window !== 'undefined' ? window.screen.colorDepth : 24,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    orientation:
      typeof window !== 'undefined' && window.screen?.orientation
        ? window.screen.orientation.type
        : isMobile
        ? 'portrait-primary'
        : 'landscape-primary',
    fullscreen: typeof document !== 'undefined' ? !!document.fullscreenElement : false,
    visibility: (typeof document !== 'undefined' ? document.visibilityState : 'visible') as 'visible' | 'hidden',
  };

  // Hardware capabilities
  const hardware = {
    cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    deviceMemoryGb: typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 8 : 8,
    touchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
  };

  // Storage estimation
  let storageData = {
    supported: false,
    quotaMb: 0,
    usageMb: 0,
    percentUsed: 0,
  };

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const quotaMb = Math.round((est.quota || 0) / (1024 * 1024));
      const usageMb = Math.round((est.usage || 0) / (1024 * 1024));
      storageData = {
        supported: true,
        quotaMb,
        usageMb,
        percentUsed: quotaMb > 0 ? Math.round((usageMb / quotaMb) * 100) : 0,
      };
    } catch (e) {}
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return {
    platform,
    isMobile,
    battery: batteryData,
    network: networkData,
    screen: screenData,
    motion: {
      supported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
      alpha: currentOrientation.alpha,
      beta: currentOrientation.beta,
      gamma: currentOrientation.gamma,
      posture: currentOrientation.posture,
      isMoving: isDeviceMoving,
    },
    hardware,
    storage: storageData,
    localTime: timeString,
    timezone: tz,
  };
}

// Generate formatted text summary for AI system instruction
export function formatTelemetrySummary(telemetry: LiveDeviceTelemetry): string {
  const b = telemetry.battery;
  const n = telemetry.network;
  const s = telemetry.screen;
  const m = telemetry.motion;
  const h = telemetry.hardware;

  const batteryDesc = b.supported
    ? `${b.level}% (${b.charging ? 'Charging via AC/USB' : 'Discharging on battery'})`
    : 'Unknown (AC Powered)';

  const netDesc = n.online
    ? `Online (${n.effectiveType.toUpperCase()}, ~${n.downlinkMbps} Mbps, ${n.rttMs}ms ping)`
    : 'OFFLINE - No internet connection';

  const postureDesc = m?.posture === 'flat_table'
    ? 'Lying flat on a surface / table'
    : m?.posture === 'upright_portrait'
    ? 'Held upright in hand (Portrait)'
    : m?.posture === 'landscape'
    ? 'Landscape orientation'
    : 'Tilted in motion';

  return `[LIVE DEVICE SENSORY & TELEMETRY STREAM]
- Host Device: ${telemetry.platform} (${telemetry.isMobile ? 'Handheld Mobile Device' : 'Desktop / Laptop Workstation'})
- Battery Power: ${batteryDesc}
- Network Status: ${netDesc}
- Device Posture & Orientation: ${postureDesc} (Tilt: ${m?.beta}° front/back, ${m?.gamma}° lateral, Moving: ${m?.isMoving ? 'YES' : 'STATIONARY'})
- Display Matrix: ${s.width}x${s.height} @ DPR ${s.devicePixelRatio} (${s.visibility === 'visible' ? 'Active / Visible' : 'Background / Minimized'})
- Hardware Cores & Memory: ${h.cpuCores} CPU threads, ~${h.deviceMemoryGb} GB RAM
- Storage Space: ${telemetry.storage?.supported ? `${telemetry.storage.usageMb} MB used of ${telemetry.storage.quotaMb} MB (${telemetry.storage.percentUsed}%)` : 'Local SSD / NVMe'}
- Local Time & Timezone: ${telemetry.localTime} (${telemetry.timezone})
- Audio Output: Multichannel Butler Baritone Synthesizer online`;
}
