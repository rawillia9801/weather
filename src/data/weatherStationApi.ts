import type { WeatherStationData } from '../types/weather';
import { normalizeCondition } from '../lib/weatherThemes';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const LATITUDE = Number(import.meta.env.VITE_LATITUDE || 36.8348);
const LONGITUDE = Number(import.meta.env.VITE_LONGITUDE || -81.5148);
const TIME_ZONE = import.meta.env.VITE_REPORT_TIME_ZONE || 'America/New_York';
const STATION_ID = import.meta.env.VITE_STATION_ID || 'KVAMARIO42';

export async function fetchWeatherStationData(): Promise<WeatherStationData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/weather`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await readWeatherJson(response);

    if (!response.ok) {
      throw new Error(payload.message || payload.error || 'Unable to load Weather Underground station data');
    }

    return payload;
  } catch (error) {
    if (API_BASE_URL) throw error;
    return fetchPublicWeatherFallback(error instanceof Error ? error.message : 'Weather Underground endpoint unavailable');
  }
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

async function fetchPublicWeatherFallback(reason: string): Promise<WeatherStationData> {
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(LATITUDE));
  forecastUrl.searchParams.set('longitude', String(LONGITUDE));
  forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day');
  forecastUrl.searchParams.set('hourly', 'temperature_2m,apparent_temperature');
  forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max');
  forecastUrl.searchParams.set('temperature_unit', 'fahrenheit');
  forecastUrl.searchParams.set('wind_speed_unit', 'mph');
  forecastUrl.searchParams.set('precipitation_unit', 'inch');
  forecastUrl.searchParams.set('timezone', TIME_ZONE);

  const aqiUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  aqiUrl.searchParams.set('latitude', String(LATITUDE));
  aqiUrl.searchParams.set('longitude', String(LONGITUDE));
  aqiUrl.searchParams.set('current', 'us_aqi,pm2_5,pm10,ozone,carbon_monoxide,nitrogen_dioxide');
  aqiUrl.searchParams.set('timezone', TIME_ZONE);

  const alertsUrl = `https://api.weather.gov/alerts/active?point=${LATITUDE},${LONGITUDE}`;
  const [forecastPayload, aqiPayload, alertsPayload] = await Promise.all([
    getJson(forecastUrl),
    getJson(aqiUrl).catch(() => null),
    getJson(alertsUrl).catch(() => ({ features: [] })),
  ]);

  return buildFallbackWeather(forecastPayload, aqiPayload, alertsPayload, reason);
}

async function getJson(url: string | URL) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function buildFallbackWeather(forecastPayload: any, aqiPayload: any, alertsPayload: any, reason: string): WeatherStationData {
  const current = forecastPayload.current || {};
  const daily = forecastPayload.daily || {};
  const currentCondition = conditionFromCode(current.weather_code, current.is_day !== 0);
  const todayHigh = round(daily.temperature_2m_max?.[0], current.temperature_2m);
  const todayLow = round(daily.temperature_2m_min?.[0], current.temperature_2m);
  const precipToday = number(current.precipitation, number(current.rain, 0));

  return {
    station: {
      name: 'Staley Street Weather',
      id: STATION_ID,
      location: 'Marion, Virginia',
      elevation: '1,476 ft',
      latitude: `${Math.abs(LATITUDE).toFixed(4)}° ${LATITUDE >= 0 ? 'N' : 'S'}`,
      longitude: `${Math.abs(LONGITUDE).toFixed(4)}° ${LONGITUDE >= 0 ? 'E' : 'W'}`,
    },
    clock: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
    current: {
      condition: currentCondition,
      temperature: round(current.temperature_2m),
      feelsLike: round(current.apparent_temperature, current.temperature_2m),
      high: todayHigh,
      low: todayLow,
      humidity: round(current.relative_humidity_2m),
      humidityLabel: humidityLabel(current.relative_humidity_2m),
      pressure: Number(number(current.pressure_msl, 29.92).toFixed(2)),
      pressureTrend: 'Live public fallback',
      windSpeed: round(current.wind_speed_10m),
      windDirection: compass(current.wind_direction_10m),
      windGust: round(current.wind_gusts_10m),
      uvIndex: round(daily.uv_index_max?.[0], 0),
    },
    forecast: (daily.time || []).slice(0, 5).map((date: string, index: number) => ({
      day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
      condition: conditionFromCode(daily.weather_code?.[index], true),
      high: round(daily.temperature_2m_max?.[index]),
      low: round(daily.temperature_2m_min?.[index]),
      precipitationChance: round(daily.precipitation_probability_max?.[index], 0),
    })),
    hourlyTrend: (forecastPayload.hourly?.time || [])
      .filter((_: string, index: number) => index % 4 === 0)
      .slice(0, 7)
      .map((time: string, filteredIndex: number) => {
        const sourceIndex = filteredIndex * 4;
        return {
          time: new Date(time).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric' }),
          temp: round(forecastPayload.hourly.temperature_2m?.[sourceIndex]),
          feelsLike: round(forecastPayload.hourly.apparent_temperature?.[sourceIndex], forecastPayload.hourly.temperature_2m?.[sourceIndex]),
        };
      }),
    alerts: (alertsPayload.features || []).slice(0, 3).map((feature: any, index: number) => {
      const title = feature.properties?.event || feature.properties?.headline || 'Weather alert';
      return {
        id: feature.id || `alert-${index}`,
        title,
        severity: /warning/i.test(title) ? 'warning' : /watch/i.test(title) ? 'watch' : 'advisory',
      };
    }),
    airQuality: buildAqi(aqiPayload),
    moon: {
      phase: 'Unavailable',
      illumination: 0,
      age: 0,
    },
    sunMoon: {
      sunrise: formatTime(daily.sunrise?.[0]),
      daylight: daylight(daily.sunrise?.[0], daily.sunset?.[0]),
      sunset: formatTime(daily.sunset?.[0]),
      moonrise: 'Unavailable',
      visible: 'Unavailable',
      moonset: 'Unavailable',
    },
    radar: {
      labels: ['Abingdon', 'Bristol', 'Wytheville'],
      legend: ['Light', 'Moderate', 'Heavy', 'Severe'],
      configured: false,
      sourceName: 'Not configured',
      statusLabel: 'Live radar provider not configured',
    },
    precipitation: {
      today: Number(precipToday.toFixed(2)),
      week: 0,
      month: 0,
      year: 0,
    },
    lightning: {
      total: 0,
      nearStation: 0,
      cloudStrikes: 0,
      cloudToGround: 0,
    },
    stationStatus: {
      online: false,
      signal: 0,
      uptime: 'Weather Underground API offline',
      lastRestart: reason,
      dataQuality: 'Public fallback',
      dataQualityScore: 65,
    },
    camera: {
      snapshotUrl: '',
      name: 'Station Camera',
    },
  };
}

function conditionFromCode(code: number, isDay: boolean) {
  const value = Number(code);
  if ([0].includes(value)) return isDay ? 'Sunny' : 'Clear Night';
  if ([1].includes(value)) return isDay ? 'Mostly Sunny' : 'Clear Night';
  if ([2].includes(value)) return 'Partly Cloudy';
  if ([3].includes(value)) return 'Cloudy';
  if ([45, 48].includes(value)) return 'Fog';
  if ([51, 53, 55, 56, 57, 80, 81, 82].includes(value)) return 'Showers';
  if ([61, 63, 65, 66, 67].includes(value)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(value)) return 'Snow';
  if ([95, 96, 99].includes(value)) return 'Thunderstorms';
  return normalizeCondition('');
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: unknown, fallback = 0) {
  return Math.round(number(value, number(fallback)));
}

function humidityLabel(value: unknown) {
  const humidity = number(value);
  if (humidity >= 70) return 'Humid';
  if (humidity <= 35) return 'Dry';
  return 'Comfortable';
}

function compass(degrees: unknown) {
  const value = number(degrees);
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(value / 22.5) % 16];
}

function formatTime(value: string | undefined) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });
}

function daylight(sunrise: string | undefined, sunset: string | undefined) {
  if (!sunrise || !sunset) return 'Unavailable';
  const minutes = Math.max(0, Math.round((new Date(sunset).getTime() - new Date(sunrise).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function buildAqi(payload: any) {
  const current = payload?.current || {};
  const aqi = Number.isFinite(Number(current.us_aqi)) ? Math.round(Number(current.us_aqi)) : null;
  return {
    aqi,
    label: aqi == null ? 'Unavailable' : aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy SG' : 'Unhealthy',
    message: aqi == null ? 'AQI source is unavailable right now.' : aqi <= 50 ? 'Great day to be outside!' : 'Check outdoor comfort before prolonged activity.',
    source: 'Open-Meteo Air Quality',
    updatedAt: current.time || null,
    pollutants: [
      { label: 'PM2.5', value: pollutant(current.pm2_5) },
      { label: 'PM10', value: pollutant(current.pm10) },
      { label: 'OZONE', value: pollutant(current.ozone) },
      { label: 'CO', value: pollutant(current.carbon_monoxide) },
      { label: 'NO2', value: pollutant(current.nitrogen_dioxide) },
    ],
  };
}

function pollutant(value: unknown) {
  const parsed = number(value, Number.NaN);
  if (!Number.isFinite(parsed)) return 'n/a';
  return parsed >= 100 ? Math.round(parsed) : Number(parsed.toFixed(1));
}
