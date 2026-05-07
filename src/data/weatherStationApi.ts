import type { WeatherStationData } from '../types/weather';

export async function fetchWeatherStationData(): Promise<WeatherStationData> {
  const response = await fetch('/api/weather', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || 'Unable to load Weather Underground station data');
  }

  return response.json();
}
