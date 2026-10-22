// Real-time Geolocation & Telemetry Engine

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  country?: string;
  displayName?: string;
  timestamp: string;
}

let cachedLocation: UserLocation | null = null;

export async function requestUserLocation(): Promise<UserLocation> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser environment');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let city = 'Detected Coordinates';
        let country = '';
        let displayName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        try {
          // Reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { 'User-Agent': 'CosmicButler/4.2' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            city = addr.city || addr.town || addr.village || addr.county || addr.state || city;
            country = addr.country || '';
            displayName = data.display_name || `${city}, ${country}`;
          }
        } catch (e) {
          // Fallback to timezone name
          try {
            city = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace(/_/g, ' ') || city;
          } catch {}
        }

        const loc: UserLocation = {
          latitude,
          longitude,
          accuracy,
          city,
          country,
          displayName,
          timestamp: new Date().toISOString(),
        };

        cachedLocation = loc;
        resolve(loc);
      },
      (err) => {
        reject(new Error(err.message || 'Unable to retrieve device GPS coordinates'));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

export function getCachedLocation(): UserLocation | null {
  return cachedLocation;
}
