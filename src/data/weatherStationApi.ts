import type { WeatherStationData } from '../types/weather';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function fetchWeatherStationData(): Promise<WeatherStationData> {
  const response = await fetch(`${API_BASE_URL}/api/weather`, {
    headers: { Accept: 'application/json' },
  });
  const payload = await readWeatherJson(response);

  if (!response.ok) {
    throw new Error(payload.message || payload.error || 'Unable to load Weather Underground station data');
  }

  return payload;
}

async function readWeatherJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(`/api/weather returned non-JSON (${response.status} ${response.statusText}): ${preview}`);
  }
}
