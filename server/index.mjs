import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local'), override: false });
dotenv.config({ path: path.join(root, '.env'), override: false });

const cfg = {
  weatherKey: weatherKeyValue(),
  stationId: process.env.STATION_ID || 'KVAMARIO42',
  latitude: Number(process.env.LATITUDE || 36.8348),
  longitude: Number(process.env.LONGITUDE || -81.5148),
  timeZone: process.env.REPORT_TIME_ZONE || 'America/New_York',
  cameraUrl: process.env.LOREX_CAMERA_SNAPSHOT_URL || '',
  cameraName: process.env.LOREX_CAMERA_NAME || 'Cars Camera',
  supabaseUrl: supabaseProjectUrl(),
  supabaseServiceRoleKey: envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SERVICE_KEY') || envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE'),
  supabaseAnonKey: envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envValue('VITE_SUPABASE_ANON_KEY') || envValue('SUPABASE_ANON_KEY'),
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL || process.env.ALERT_EMAIL || 'hello@staleyclimate.info',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioApiKeySid: process.env.TWILIO_API_KEY_SID,
  twilioApiKeySecret: process.env.TWILIO_API_KEY_SECRET,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  radarContextUrl: process.env.RADAR_CONTEXT_URL || '',
  radarProviderName: process.env.RADAR_PROVIDER_NAME || 'Radar provider',
  airNowApiKey: process.env.AIRNOW_API_KEY || '',
  xweatherClientId: process.env.XWEATHER_CLIENT_ID || '',
  xweatherClientSecret: process.env.XWEATHER_CLIENT_SECRET || '',
  zipCode: process.env.STATION_ZIP || '24354',
  allowedOrigins: [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VITE_API_ALLOWED_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean),
};

let weatherCache = null;
let weatherCacheAt = 0;
const WEATHER_CACHE_MS = 120000;

function envValue(name) {
  return process.env[name]?.trim();
}

function weatherKeyValue() {
  return (envValue('WEATHER_API_KEY') || envValue('WEATHER_UNDERGROUND_API_KEY') || envValue('VITE_WEATHER_API_KEY') || '').toLowerCase();
}

function supabaseProjectUrl() {
  const raw =
    envValue('SUPABASE_URL') ||
    envValue('NEXT_PUBLIC_SUPABASE_URL') ||
    envValue('VITE_SUPABASE_URL') ||
    envValue('SUPABASE_API_URL') ||
    envValue('NEXT_PUBLIC_SUPABASE_API_URL') ||
    envValue('VITE_SUPABASE_API_URL');
  if (!raw) return '';
  return raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

function jwtSegments(value) {
  return value ? value.split('.').length : 0;
}

function supabaseCanRead() {
  return Boolean(cfg.supabaseUrl && (cfg.supabaseServiceRoleKey || cfg.supabaseAnonKey));
}

function supabaseCanWrite() {
  return Boolean(cfg.supabaseUrl && cfg.supabaseServiceRoleKey && jwtSegments(cfg.supabaseServiceRoleKey) === 3);
}

function keyFingerprint(value) {
  if (!value) return '';
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && cfg.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));

const conditionMap = [
  ['thunder', 'Thunderstorms'],
  ['storm', 'Thunderstorms'],
  ['rain shower', 'Showers'],
  ['shower', 'Showers'],
  ['rain', 'Rain'],
  ['drizzle', 'Showers'],
  ['snow', 'Snow'],
  ['sleet', 'Freezing'],
  ['ice', 'Freezing'],
  ['freez', 'Freezing'],
  ['fog', 'Fog'],
  ['mist', 'Fog'],
  ['haze', 'Haze'],
  ['smoke', 'Haze'],
  ['wind', 'Windy'],
  ['mostly sunny', 'Mostly Sunny'],
  ['partly cloudy', 'Partly Cloudy'],
  ['partly sunny', 'Partly Cloudy'],
  ['mostly cloudy', 'Cloudy'],
  ['overcast', 'Cloudy'],
  ['cloudy', 'Cloudy'],
  ['clear', 'Clear Night'],
  ['sunny', 'Sunny'],
  ['hot', 'Extreme Heat'],
];

function classifyCondition(text = '', isNight = false) {
  const value = String(text).toLowerCase();
  const found = conditionMap.find(([needle]) => value.includes(needle));
  if (!found) return isNight ? 'Clear Night' : 'Unknown';
  return found[1] === 'Sunny' && isNight ? 'Clear Night' : found[1];
}

function f(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    timeZone: cfg.timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'StaleyStreetWeather/1.0 hello@staleyclimate.info',
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 180)}`);
  }
  return response.json();
}

function cleanProviderReason(error) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown provider error');
  if (message.includes('Access Denied')) return 'Weather Underground API offline';
  if (message.includes('Invalid apiKey')) return 'Weather Underground API key rejected';
  return message.replace(/\s+/g, ' ').slice(0, 160);
}

async function getNationalWeatherServiceJson(url) {
  return getJson(url);
}

async function weatherUnderground(pathname, params) {
  const url = new URL(`https://api.weather.com${pathname}`);
  Object.entries({ ...params, apiKey: cfg.weatherKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return getJson(url);
}

function pwsUnitBucket(units = 'e') {
  if (units === 'm') return 'metric';
  if (units === 'h') return 'uk_hybrid';
  return 'imperial';
}

function normalizePwsDailySummary(row, units = 'e') {
  const bucket = row?.[pwsUnitBucket(units)] || row?.imperial || row?.metric || {};
  const date = row?.obsTimeLocal?.slice(0, 10) || (row?.epoch ? new Date(row.epoch * 1000).toISOString().slice(0, 10) : '');
  return {
    date,
    stationId: row?.stationID || cfg.stationId,
    obsTimeLocal: row?.obsTimeLocal || '',
    obsTimeUtc: row?.obsTimeUtc || '',
    epoch: optionalNumber(row?.epoch),
    latitude: optionalNumber(row?.lat),
    longitude: optionalNumber(row?.lon),
    humidityAvg: optionalNumber(row?.humidityAvg),
    humidityHigh: optionalNumber(row?.humidityHigh),
    humidityLow: optionalNumber(row?.humidityLow),
    uvHigh: optionalNumber(row?.uvHigh),
    solarRadiationHigh: optionalNumber(row?.solarRadiationHigh),
    windDirectionAvg: optionalNumber(row?.winddirAvg),
    tempHigh: optionalNumber(bucket.tempHigh),
    tempLow: optionalNumber(bucket.tempLow),
    tempAvg: optionalNumber(bucket.tempAvg),
    windSpeedHigh: optionalNumber(bucket.windspeedHigh),
    windSpeedLow: optionalNumber(bucket.windspeedLow),
    windSpeedAvg: optionalNumber(bucket.windspeedAvg),
    windGustHigh: optionalNumber(bucket.windgustHigh),
    windGustLow: optionalNumber(bucket.windgustLow),
    windGustAvg: optionalNumber(bucket.windgustAvg),
    dewpointAvg: optionalNumber(bucket.dewptAvg),
    heatIndexHigh: optionalNumber(bucket.heatindexHigh),
    windChillLow: optionalNumber(bucket.windchillLow),
    pressureMax: optionalNumber(bucket.pressureMax),
    pressureMin: optionalNumber(bucket.pressureMin),
    pressureTrend: optionalNumber(bucket.pressureTrend),
    precipRate: optionalNumber(bucket.precipRate),
    precipTotal: optionalNumber(bucket.precipTotal),
  };
}

async function loadPwsSevenDayHistory() {
  if (!cfg.weatherKey) {
    throw new Error('WEATHER_API_KEY is required for Weather Underground PWS history.');
  }
  const units = 'e';
  const payload = await weatherUnderground('/v2/pws/dailysummary/7day', {
    stationId: cfg.stationId,
    format: 'json',
    units,
    numericPrecision: 'decimal',
  });
  const summaries = (payload?.summaries || [])
    .map((row) => normalizePwsDailySummary(row, units))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {
    source: 'Weather Underground PWS Daily Summary - 7 Day History',
    stationId: cfg.stationId,
    units,
    generatedAt: new Date().toISOString(),
    summaries,
  };
}

async function loadPublicHistoryFallback(reason = 'Weather Underground PWS history unavailable') {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(cfg.latitude));
  url.searchParams.set('longitude', String(cfg.longitude));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max');
  url.searchParams.set('hourly', 'relative_humidity_2m,pressure_msl');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', cfg.timeZone);
  url.searchParams.set('past_days', '7');
  url.searchParams.set('forecast_days', '1');
  const payload = await getJson(url);
  const daily = payload?.daily || {};
  const hourly = payload?.hourly || {};
  const allTimes = daily.time || [];
  const times = allTimes.slice(-7);
  const summaries = times.map((date, index) => {
    const sourceIndex = allTimes.length - times.length + index;
    const hourIndexes = (hourly.time || []).reduce((matches, stamp, hourIndex) => {
      if (String(stamp).startsWith(date)) matches.push(hourIndex);
      return matches;
    }, []);
    const humidityValues = hourIndexes.map((hourIndex) => optionalNumber(hourly.relative_humidity_2m?.[hourIndex])).filter((value) => value !== null);
    const pressureValues = hourIndexes
      .map((hourIndex) => optionalNumber(hourly.pressure_msl?.[hourIndex]))
      .filter((value) => value !== null)
      .map((value) => Number((value / 33.8639).toFixed(2)));
    return {
      date,
      stationId: cfg.stationId,
      obsTimeLocal: `${date} 23:59:59`,
      obsTimeUtc: new Date(`${date}T23:59:59`).toISOString(),
      humidityAvg: humidityValues.length ? Math.round(humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length) : null,
      humidityHigh: humidityValues.length ? Math.max(...humidityValues) : null,
      humidityLow: humidityValues.length ? Math.min(...humidityValues) : null,
      uvHigh: null,
      windDirectionAvg: null,
      tempHigh: optionalNumber(daily.temperature_2m_max?.[sourceIndex]),
      tempLow: optionalNumber(daily.temperature_2m_min?.[sourceIndex]),
      tempAvg: optionalNumber(daily.temperature_2m_mean?.[sourceIndex]),
      windSpeedHigh: optionalNumber(daily.wind_speed_10m_max?.[sourceIndex]),
      windSpeedAvg: optionalNumber(daily.wind_speed_10m_max?.[sourceIndex]),
      windGustHigh: optionalNumber(daily.wind_gusts_10m_max?.[sourceIndex]),
      pressureMax: pressureValues.length ? Math.max(...pressureValues) : null,
      pressureMin: pressureValues.length ? Math.min(...pressureValues) : null,
      precipTotal: optionalNumber(daily.precipitation_sum?.[sourceIndex]),
    };
  });
  return {
    source: 'Open-Meteo public archive fallback',
    stationId: cfg.stationId,
    units: 'e',
    generatedAt: new Date().toISOString(),
    fallbackReason: reason,
    summaries,
  };
}

function readPwsCurrent(payload) {
  const obs = payload?.observations?.[0] || {};
  const imperial = obs.imperial || {};
  return {
    temperature: f(imperial.temp, f(obs.temp)),
    feelsLike: f(imperial.heatIndex, f(imperial.windChill, f(imperial.temp))),
    humidity: f(obs.humidity),
    pressure: f(imperial.pressure, 29.92),
    windSpeed: f(imperial.windSpeed),
    windGust: f(imperial.windGust),
    windDirection: obs.winddirCompass || obs.windDirection || 'WNW',
    conditionText: obs.wxPhraseLong || '',
    precipToday: f(imperial.precipTotal),
    precipRate: f(imperial.precipRate),
  };
}

function windDirectionFromDegrees(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 'Unavailable';
  const labels = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return labels[Math.round(degrees / 22.5) % 16];
}

function conditionFromWeatherCode(code, isDay = true) {
  const value = Number(code);
  if (value === 0) return isDay ? 'Sunny' : 'Clear Night';
  if (value === 1) return isDay ? 'Mostly Sunny' : 'Clear Night';
  if (value === 2) return 'Partly Cloudy';
  if (value === 3) return 'Cloudy';
  if ([45, 48].includes(value)) return 'Fog';
  if ([51, 53, 55, 56, 57, 80, 81, 82].includes(value)) return 'Showers';
  if ([61, 63, 65, 66, 67].includes(value)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(value)) return 'Snow';
  if ([95, 96, 99].includes(value)) return 'Thunderstorms';
  return 'Unknown';
}

async function loadOpenMeteoCurrent() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(cfg.latitude));
  url.searchParams.set('longitude', String(cfg.longitude));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day');
  url.searchParams.set('daily', 'precipitation_sum');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', cfg.timeZone);
  const payload = await getJson(url);
  const current = payload?.current || {};
  return {
    temperature: f(current.temperature_2m),
    feelsLike: f(current.apparent_temperature, current.temperature_2m),
    humidity: f(current.relative_humidity_2m),
    pressure: Number((f(current.pressure_msl, 1013.25) / 33.8639).toFixed(2)),
    windSpeed: f(current.wind_speed_10m),
    windGust: f(current.wind_gusts_10m),
    windDirection: windDirectionFromDegrees(current.wind_direction_10m),
    conditionText: conditionFromWeatherCode(current.weather_code, current.is_day === 1),
    precipToday: f(payload?.daily?.precipitation_sum?.[0], f(current.precipitation, 0)),
    precipRate: f(current.precipitation, 0),
  };
}

function dailyFromWeatherCom(payload) {
  const days = payload?.dayOfWeek || [];
  return days.slice(0, 5).map((day, index) => {
    const dayPartIndex = index * 2;
    const narrative = payload.narrative?.[index] || payload.daypart?.[0]?.wxPhraseLong?.[dayPartIndex] || '';
    return {
      day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day,
      condition: classifyCondition(narrative),
      high: Math.round(f(payload.temperatureMax?.[index], f(payload.calendarDayTemperatureMax?.[index]))),
      low: Math.round(f(payload.temperatureMin?.[index], f(payload.calendarDayTemperatureMin?.[index]))),
      precipitationChance: Math.round(f(payload.daypart?.[0]?.precipChance?.[dayPartIndex], 0)),
      precipitationAmount: 0,
      snowfallAmount: 0,
      source: 'Weather.com',
    };
  });
}

function hourlyFromWeatherCom(payload) {
  const times = payload?.validTimeLocal || [];
  return times
    .filter((_, index) => index % 4 === 0)
    .slice(0, 7)
    .map((time, filteredIndex) => {
      const sourceIndex = filteredIndex * 4;
      const date = new Date(time);
      return {
        time: date.toLocaleTimeString('en-US', { timeZone: cfg.timeZone, hour: 'numeric' }),
        temp: Math.round(f(payload.temperature?.[sourceIndex])),
        feelsLike: Math.round(f(payload.temperatureFeelsLike?.[sourceIndex], f(payload.temperature?.[sourceIndex]))),
      };
    });
}

function alertsFromWeatherCom(payload) {
  return (payload?.alerts || []).slice(0, 3).map((alert, index) => {
    const title = alert.eventDescription || alert.headlineText || 'Weather alert';
    return {
      id: alert.detailKey || `alert-${index}`,
      title,
      severity: /warning/i.test(title) ? 'warning' : /watch/i.test(title) ? 'watch' : 'advisory',
    };
  });
}

async function loadNationalWeatherServiceForecast() {
  const point = await getNationalWeatherServiceJson(`https://api.weather.gov/points/${cfg.latitude},${cfg.longitude}`);
  const forecastUrl = point?.properties?.forecast;
  const hourlyUrl = point?.properties?.forecastHourly;

  const [dailyPayload, hourlyPayload, alertsPayload] = await Promise.all([
    getNationalWeatherServiceJson(forecastUrl),
    getNationalWeatherServiceJson(hourlyUrl),
    getNationalWeatherServiceJson(`https://api.weather.gov/alerts/active?point=${cfg.latitude},${cfg.longitude}`).catch(() => ({ features: [] })),
  ]);

  return {
    forecast: dailyFromNationalWeatherService(dailyPayload),
    hourlyTrend: hourlyFromNationalWeatherService(hourlyPayload),
    alerts: alertsFromNationalWeatherService(alertsPayload),
  };
}

function dailyFromNationalWeatherService(payload) {
  const periods = payload?.properties?.periods || [];
  const days = [];
  for (let index = 0; index < periods.length && days.length < 5; index += 1) {
    const period = periods[index];
    if (!period?.isDaytime) continue;
    const night = periods.slice(index + 1).find((candidate) => candidate.name?.includes('Night') || candidate.isDaytime === false);
    days.push({
      day: days.length === 0 ? 'Today' : days.length === 1 ? 'Tomorrow' : period.name,
      condition: classifyCondition(`${period.shortForecast || ''} ${period.detailedForecast || ''}`),
      high: Math.round(f(period.temperature)),
      low: Math.round(f(night?.temperature, period.temperature)),
      precipitationChance: Math.round(f(period.probabilityOfPrecipitation?.value, 0)),
      precipitationAmount: 0,
      snowfallAmount: 0,
      source: 'NWS',
    });
  }
  return days;
}

function hourlyFromNationalWeatherService(payload) {
  const periods = payload?.properties?.periods || [];
  return periods
    .filter((_, index) => index % 4 === 0)
    .slice(0, 7)
    .map((period) => ({
      time: compactTime(period.startTime),
      temp: Math.round(f(period.temperature)),
      feelsLike: Math.round(f(period.temperature)),
    }));
}

function alertsFromNationalWeatherService(payload) {
  return (payload?.features || []).slice(0, 3).map((feature, index) => {
    const properties = feature.properties || {};
    const title = properties.event || properties.headline || 'Weather alert';
    return {
      id: properties.id || feature.id || `nws-alert-${index}`,
      title,
      severity: /warning/i.test(title) ? 'warning' : /watch/i.test(title) ? 'watch' : 'advisory',
    };
  });
}

async function loadAirQuality() {
  if (cfg.airNowApiKey) {
    try {
      const airNowUrl = new URL('https://www.airnowapi.org/aq/observation/zipCode/current/');
      airNowUrl.searchParams.set('format', 'application/json');
      airNowUrl.searchParams.set('zipCode', cfg.zipCode);
      airNowUrl.searchParams.set('distance', '25');
      airNowUrl.searchParams.set('API_KEY', cfg.airNowApiKey);
      const rows = await getJson(airNowUrl);
      const readings = Array.isArray(rows) ? rows : [];
      const primary = readings.slice().sort((a, b) => f(b.AQI, -1) - f(a.AQI, -1))[0];
      const aqi = primary ? Math.round(f(primary.AQI)) : null;
      return {
        aqi,
        label: primary?.Category?.Name || getAqiLabel(aqi),
        message: getAqiMessage(aqi),
        source: 'AirNow official AQI',
        updatedAt: primary?.DateObserved ? `${primary.DateObserved} ${primary.HourObserved || ''}:00` : null,
        pollutantDriver: primary?.ParameterName || undefined,
        pollutants: readings.map((item) => ({ label: item.ParameterName || 'AQI', value: Math.round(f(item.AQI)) })),
      };
    } catch (error) {
      console.warn(`AirNow AQI unavailable: ${cleanProviderReason(error)}`);
    }
  }

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(cfg.latitude));
  url.searchParams.set('longitude', String(cfg.longitude));
  url.searchParams.set('current', 'us_aqi,pm2_5,pm10,ozone,carbon_monoxide,nitrogen_dioxide');
  url.searchParams.set('timezone', cfg.timeZone);

  try {
    const payload = await getJson(url);
    const current = payload?.current || {};
    const aqi = Number.isFinite(Number(current.us_aqi)) ? Math.round(Number(current.us_aqi)) : null;
    return {
      aqi,
      label: getAqiLabel(aqi),
      message: getAqiMessage(aqi),
      source: 'Open-Meteo Air Quality',
      updatedAt: current.time || null,
      pollutants: [
        { label: 'PM2.5', value: formatPollutant(current.pm2_5) },
        { label: 'PM10', value: formatPollutant(current.pm10) },
        { label: 'OZONE', value: formatPollutant(current.ozone) },
        { label: 'CO', value: formatPollutant(current.carbon_monoxide) },
        { label: 'NO2', value: formatPollutant(current.nitrogen_dioxide) },
      ].filter((item) => item.value !== 'n/a'),
    };
  } catch {
    return fallbackAirQuality('AQI source is not configured or is temporarily unavailable.', 'Open-Meteo Air Quality');
  }
}

function formatPollutant(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return number >= 100 ? Math.round(number) : Number(number.toFixed(1));
}

function getAqiLabel(aqi) {
  if (aqi == null) return 'Unavailable';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy SG';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function getAqiMessage(aqi) {
  if (aqi == null) return 'AQI source is unavailable right now.';
  if (aqi <= 50) return 'Great day to be outside!';
  if (aqi <= 100) return 'Acceptable air quality for most outdoor plans.';
  if (aqi <= 150) return 'Sensitive groups should reduce prolonged outdoor exertion.';
  return 'Limit prolonged outdoor exposure.';
}

function fallbackAirQuality(message = 'AQI source is not configured.', source) {
  return {
    aqi: null,
    label: 'Unavailable',
    message,
    source,
    updatedAt: null,
    pollutants: [],
  };
}

function buildRadarMetadata() {
  const configured = Boolean(cfg.radarContextUrl);
  return {
    labels: ['Abingdon', 'Bristol', 'Wytheville'],
    legend: ['Light', 'Moderate', 'Heavy', 'Severe'],
    configured: true,
    sourceName: configured ? cfg.radarProviderName : 'NOAA/NWS radar context',
    externalUrl: configured ? cfg.radarContextUrl : 'https://radar.weather.gov/',
    statusLabel: configured ? cfg.radarProviderName : 'NOAA/NWS radar link configured',
    updatedAt: new Date().toISOString(),
    isPlaceholder: !configured,
  };
}

function buildLightning(forecast = []) {
  const stormRisk = forecast.some((day) => /thunder/i.test(day.condition || ''));
  return {
    total: null,
    nearStation: null,
    cloudStrikes: null,
    cloudToGround: null,
    source: cfg.xweatherClientId && cfg.xweatherClientSecret ? 'Xweather not connected' : 'Not configured',
    statusLabel: stormRisk ? 'Thunderstorm risk in forecast; no live strike source configured' : 'Live strike source not configured',
    lastStrikeTime: null,
    closestStrikeDistance: null,
  };
}

function moonPhaseForDate(date = new Date()) {
  const synodicMonth = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const age = ((((date.getTime() - knownNewMoon) / 86400000) % synodicMonth) + synodicMonth) % synodicMonth;
  const phaseValue = age / synodicMonth;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phaseValue)) * 50);
  const names = [[1.84566, 'New Moon'], [5.53699, 'Waxing Crescent'], [9.22831, 'First Quarter'], [12.91963, 'Waxing Gibbous'], [16.61096, 'Full Moon'], [20.30228, 'Waning Gibbous'], [23.99361, 'Last Quarter'], [27.68493, 'Waning Crescent'], [synodicMonth, 'New Moon']];
  const phase = names.find(([limit]) => age < limit)?.[1] || 'New Moon';
  const nextNew = new Date(date.getTime() + (synodicMonth - age) * 86400000);
  const nextFullOffset = age <= synodicMonth / 2 ? synodicMonth / 2 - age : synodicMonth * 1.5 - age;
  const nextFull = new Date(date.getTime() + nextFullOffset * 86400000);
  return {
    phase,
    illumination,
    age: Number(age.toFixed(1)),
    phaseValue: Number(phaseValue.toFixed(3)),
    nextFullMoon: nextFull.toLocaleDateString('en-US', { timeZone: cfg.timeZone, month: 'short', day: 'numeric' }),
    nextNewMoon: nextNew.toLocaleDateString('en-US', { timeZone: cfg.timeZone, month: 'short', day: 'numeric' }),
    skyEvent: 'Sky watch: no major configured events in the next 7 days',
  };
}

function buildStationData({ current, forecast, hourlyTrend, alerts, daily, airQuality = fallbackAirQuality(), stationStatus, dataSource }) {
  const now = new Date();
  const firstForecast = forecast[0] || {};
  const currentCondition = classifyCondition(current.conditionText || firstForecast.condition);
  const moon = moonPhaseForDate(now);
  return {
    station: {
      name: 'Staley Street Weather',
      id: cfg.stationId,
      location: 'Marion, Virginia',
      elevation: '1,476 ft',
      latitude: `${Math.abs(cfg.latitude).toFixed(4)}° ${cfg.latitude >= 0 ? 'N' : 'S'}`,
      longitude: `${Math.abs(cfg.longitude).toFixed(4)}° ${cfg.longitude >= 0 ? 'E' : 'W'}`,
    },
    clock: now.toISOString(),
    current: {
      condition: currentCondition,
      temperature: Number(f(current.temperature).toFixed(1)),
      feelsLike: Math.round(f(current.feelsLike, current.temperature)),
      high: f(firstForecast.high, current.temperature),
      low: f(firstForecast.low, current.temperature),
      humidity: Math.round(f(current.humidity)),
      humidityLabel: f(current.humidity) >= 70 ? 'Humid' : f(current.humidity) <= 35 ? 'Dry' : 'Comfortable',
      pressure: Number(f(current.pressure, 29.92).toFixed(2)),
      pressureTrend: 'Steady',
      windSpeed: Math.round(f(current.windSpeed)),
      windDirection: current.windDirection || 'WNW',
      windGust: Math.round(f(current.windGust)),
      uvIndex: Math.round(f(daily?.uvIndex?.[0], 2)),
      uvSource: daily?.uvIndex?.[0] != null ? 'Weather.com' : 'Open-Meteo UV',
    },
    forecast,
    hourlyTrend,
    alerts,
    airQuality,
    moon: {
      ...moon,
      phase: daily?.moonPhase?.[0] || moon.phase,
      illumination: f(daily?.moonIllumination?.[0], moon.illumination),
      age: f(daily?.moonAge?.[0], moon.age),
    },
    sunMoon: {
      sunrise: compactTime(daily?.sunriseTimeLocal?.[0]) || '6:16 AM',
      daylight: '8h 12m',
      sunset: compactTime(daily?.sunsetTimeLocal?.[0]) || '8:28 PM',
      moonrise: compactTime(daily?.moonriseTimeLocal?.[0]) || '12:58 AM',
      visible: '14h 45m',
      moonset: compactTime(daily?.moonsetTimeLocal?.[0]) || '2:43 PM',
    },
    radar: buildRadarMetadata(),
    precipitation: buildPrecipitation(current, forecast, Boolean(dataSource?.current === 'Weather Underground PWS')),
    lightning: buildLightning(forecast),
    stationStatus: stationStatus || {
      online: true,
      signal: 98,
      uptime: '15d 4h',
      lastRestart: 'Apr 13, 1:22 AM',
      dataQuality: 'Excellent',
      dataQualityScore: 100,
    },
    camera: {
      snapshotUrl: cfg.cameraUrl,
      name: cfg.cameraName,
    },
    dataSource,
  };
}

function buildPrecipitation(current, forecast = [], hasPws = false) {
  const today = optionalNumber(current.precipToday) ?? optionalNumber(forecast[0]?.precipitationAmount);
  const week = forecast.length ? Number(forecast.reduce((sum, day) => sum + f(day.precipitationAmount, 0), 0).toFixed(2)) : null;
  return {
    today,
    week,
    month: null,
    year: null,
    todayLabel: hasPws ? 'Today station' : 'Today forecast',
    weekLabel: '7-day forecast',
    monthLabel: 'History unavailable',
    yearLabel: 'History unavailable',
    source: hasPws ? 'Weather Underground PWS + forecast' : 'Forecast fallback',
  };
}

const defaultAppConfig = {
  station_settings: {
    station_name: 'Staley Street Weather',
    station_id: cfg.stationId,
    location_name: 'Marion, Virginia',
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    elevation_ft: 1476,
    primary_weather_source: 'Weather Underground PWS',
    refresh_interval_seconds: 120,
    stale_threshold_minutes: 10,
    timezone: cfg.timeZone,
  },
  contacts: [],
  daily_brief_schedules: [
    {
      enabled: false,
      send_time_local: '07:00',
      timezone: cfg.timeZone,
      email_enabled: true,
      sms_enabled: false,
      subject_template: 'Staley Street Weather Daily Brief - Marion, VA - {{date}}',
      include_html_email: true,
      include_text_email: true,
      include_sms_summary: true,
    },
  ],
  alert_thresholds: {
    wind_gust_mph: 35,
    rain_rate_in_per_hr: 1,
    rain_today_in: 2,
    nearby_lightning_miles: 10,
    freeze_temp_f: 32,
    heat_temp_f: 95,
    aqi_threshold: 100,
    uv_threshold: 8,
    pressure_drop_inhg: 0.12,
    stale_data_minutes: 10,
  },
  display_preferences: {
    temperature_unit: 'F',
    wind_unit: 'mph',
    pressure_unit: 'inHg',
    rain_unit: 'in',
    time_format: '12h',
    theme_intensity: 'cinematic',
    dashboard_density: 'compact',
    reduced_motion: false,
    show_unavailable_panels: true,
  },
  integration_status: [],
  daily_brief_send_logs: [],
  notification_events: [],
};

function supabaseConfigured() {
  return supabaseCanRead();
}

async function supabaseRest(table, options = {}) {
  if (!supabaseConfigured()) throw new Error('Supabase is not configured');
  const mutating = options.method && options.method !== 'GET';
  if (mutating && !supabaseCanWrite()) {
    throw new Error('Supabase server write key is not usable. Contacts and settings writes require a complete service-role JWT on the server.');
  }
  const key = options.requireServiceRole || mutating ? cfg.supabaseServiceRoleKey : (supabaseCanWrite() ? cfg.supabaseServiceRoleKey : cfg.supabaseAnonKey);
  if (!key) throw new Error('Supabase API key is not configured');
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  let response = await fetchSupabase(url, key, options);
  if (!response.ok && !mutating && key !== cfg.supabaseAnonKey && cfg.supabaseAnonKey) {
    response = await fetchSupabase(url, cfg.supabaseAnonKey, options);
  }
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || response.statusText);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

function fetchSupabase(url, key, options = {}) {
  return fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function safeSelect(table, fallback, query = {}) {
  try {
    const rows = await supabaseRest(table, { query });
    if (Array.isArray(rows)) return rows;
    return rows ?? fallback;
  } catch {
    return fallback;
  }
}

function firstOrDefault(rows, fallback) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : fallback;
}

async function loadAppConfig() {
  const [stationRows, contacts, schedules, thresholdRows, preferenceRows, integrations, logs, events] = await Promise.all([
    safeSelect('station_settings', [], { select: '*', limit: 1 }),
    safeSelect('contacts', []),
    safeSelect('daily_brief_schedules', defaultAppConfig.daily_brief_schedules),
    safeSelect('alert_thresholds', [], { select: '*', limit: 1 }),
    safeSelect('display_preferences', [], { select: '*', limit: 1 }),
    safeSelect('integration_status', []),
    safeSelect('daily_brief_send_logs', [], { select: '*', order: 'created_at.desc', limit: 20 }),
    safeSelect('notification_events', [], { select: '*', order: 'created_at.desc', limit: 50 }),
  ]);

  return {
    supabaseConfigured: supabaseConfigured(),
    supabaseStatus: {
      readConfigured: supabaseCanRead(),
      writeConfigured: supabaseCanWrite(),
      urlConfigured: Boolean(cfg.supabaseUrl),
      serviceRoleConfigured: Boolean(cfg.supabaseServiceRoleKey),
      serviceRoleSegments: jwtSegments(cfg.supabaseServiceRoleKey),
      anonConfigured: Boolean(cfg.supabaseAnonKey),
      anonSegments: jwtSegments(cfg.supabaseAnonKey),
    },
    deliveryConfigured: {
      resend: Boolean(cfg.resendApiKey && cfg.resendFromEmail),
      twilio: Boolean(cfg.twilioAccountSid && cfg.twilioApiKeySid && cfg.twilioApiKeySecret && cfg.twilioFromNumber),
    },
    cameraConfigured: Boolean(cfg.cameraUrl),
    station_settings: firstOrDefault(stationRows, defaultAppConfig.station_settings),
    contacts,
    daily_brief_schedules: schedules.length ? schedules : defaultAppConfig.daily_brief_schedules,
    alert_thresholds: firstOrDefault(thresholdRows, defaultAppConfig.alert_thresholds),
    display_preferences: firstOrDefault(preferenceRows, defaultAppConfig.display_preferences),
    integration_status: buildIntegrationStatus(integrations),
    daily_brief_send_logs: logs,
    notification_events: events,
  };
}

function buildIntegrationStatus(rows) {
  const names = ['Weather Underground PWS', 'Forecast source', 'UV source', 'AQI source', 'Radar source', 'Camera source', 'Supabase', 'Resend', 'Twilio'];
  const configured = new Map((rows || []).map((row) => [row.integration_name, row]));
  return names.map((name) => configured.get(name) || {
    integration_name: name,
    configured:
      name === 'Weather Underground PWS' ? Boolean(cfg.weatherKey) :
      name === 'Radar source' ? Boolean(cfg.radarContextUrl) :
      name === 'AQI source' ? true :
      name === 'Camera source' ? Boolean(cfg.cameraUrl) :
      name === 'Supabase' ? supabaseConfigured() :
      name === 'Resend' ? Boolean(cfg.resendApiKey) :
      name === 'Twilio' ? Boolean(cfg.twilioApiKeySecret) :
      name === 'Forecast source',
    last_success_at: null,
    last_error_at: null,
    last_error_message: null,
  });
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value) {
  return !value || /^\+[1-9]\d{7,14}$/.test(value);
}

function cleanContact(input) {
  const contact = {
    display_name: String(input.display_name || '').trim(),
    email: input.email ? String(input.email).trim() : null,
    phone_e164: input.phone_e164 ? String(input.phone_e164).trim() : null,
    email_enabled: Boolean(input.email_enabled),
    sms_enabled: Boolean(input.sms_enabled),
    is_primary: Boolean(input.is_primary),
    notes: input.notes ? String(input.notes) : null,
  };
  if (!contact.display_name) throw new Error('Display name is required');
  if (!validEmail(contact.email)) throw new Error('Email format is invalid');
  if (!validPhone(contact.phone_e164)) throw new Error('Phone number must be E.164, for example +15405551212');
  if (contact.email_enabled && !contact.email) throw new Error('Email is required when email delivery is enabled');
  if (contact.sms_enabled && !contact.phone_e164) throw new Error('Phone number is required when SMS delivery is enabled');
  return contact;
}

function buildDailyBriefData(weatherData, settings) {
  const current = weatherData.current;
  const firstForecast = weatherData.forecast[0] || {};
  const alerts = weatherData.alerts || [];
  const rainToday = `${weatherData.precipitation.today.toFixed(2)} in`;
  return {
    stationId: weatherData.station.id,
    stationName: weatherData.station.name,
    location: weatherData.station.location,
    generatedAt: new Date().toISOString(),
    source: 'Weather Underground PWS',
    updatedTime: new Date(weatherData.clock).toLocaleString('en-US', { timeZone: settings.timezone || cfg.timeZone }),
    current,
    forecast: weatherData.forecast,
    hourlyTrend: weatherData.hourlyTrend,
    alerts,
    airQuality: weatherData.airQuality,
    moon: weatherData.moon,
    sunMoon: weatherData.sunMoon,
    stationStatus: weatherData.stationStatus,
    rainToday,
    high: firstForecast.high ?? current.high,
    low: firstForecast.low ?? current.low,
    comfortSummary: generateComfortSummary(weatherData),
    groundCondition: estimateGroundConditions(weatherData),
    waterCondition: estimateHungryMotherWaterConditions(weatherData),
  };
}

function generateComfortSummary(data) {
  const c = data.current;
  const bits = [];
  bits.push(c.humidity >= 80 ? 'Very humid air will feel heavier than the temperature suggests.' : 'Humidity is in a manageable range for outdoor plans.');
  bits.push(c.windGust >= 20 ? 'Secure lightweight porch items before gusts pick up.' : 'Wind is not a major issue right now.');
  bits.push(c.uvIndex >= 6 ? 'Plan sun protection during brighter windows.' : 'UV is currently in a lower-risk range.');
  return bits.join(' ');
}

function estimateGroundConditions(data) {
  const rain = data.precipitation.today;
  if (rain >= 1) return { label: 'Wet', summary: 'Ground is likely saturated with puddles and soft spots.' };
  if (rain >= 0.2 || /rain|showers/i.test(data.current.condition)) return { label: 'Damp', summary: 'Ground is likely damp with slick surfaces in shaded areas.' };
  return { label: 'Drying', summary: 'Ground conditions look generally usable, with normal caution in low areas.' };
}

function estimateHungryMotherWaterConditions(data) {
  const low = data.current.low ?? data.current.temperature;
  const temp = Math.round((data.current.temperature + low) / 2 - 4);
  return {
    waterTemp: `${temp}F estimated`,
    measuredOrEstimatedNote: 'Estimated from nearby station temperature trend and daily lows.',
    surface: data.current.windGust >= 18 ? 'Choppy' : data.current.windSpeed >= 8 ? 'Light ripple' : 'Calm',
    clarityNote: data.precipitation.today > 0.4 ? 'Recent rain may reduce clarity near inflows.' : 'No major rain impact indicated.',
  };
}

function greetingFor(contact) {
  const name = String(contact?.display_name || '').trim();
  return name ? `Good Morning, ${name} - here's your daily weather brief.` : "Good Morning - here's your daily weather brief.";
}

function renderDailyBriefText(data, contact) {
  const alerts = data.alerts.length ? data.alerts.map((a) => `- ${a.title}`).join('\n') : 'No active alerts at generation time.';
  const outlook = data.forecast.map((day) => `${day.day}\n${day.condition}\nHigh ${day.high} | Low ${day.low} | Rain ${day.precipitationChance}% | Amt ${Number(day.precipitationAmount || 0).toFixed(2)} in`).join('\n\n');
  const aqiText = data.airQuality.aqi == null ? 'Unavailable - AQI source is not configured' : `${data.airQuality.aqi} ${data.airQuality.label}`;
  return `Live personal weather station\nStaley Street Weather Daily Brief\n\n${greetingFor(contact)}\n\nRight now in ${data.location}, it is ${data.current.temperature}F and ${data.current.condition}, with a feels-like temperature of ${data.current.feelsLike}F.\n\nStation ${data.stationId}\nUpdated ${data.updatedTime}\nSource: ${data.source}\n\nToday should reach about ${data.high}F with a low near ${data.low}F. Winds are ${data.current.windDirection} at ${data.current.windSpeed} mph with gusts near ${data.current.windGust} mph.\n\nRain chances today are ${data.forecast[0]?.precipitationChance ?? 0}%, with an estimated total of ${Number(data.forecast[0]?.precipitationAmount || 0).toFixed(2)} inches.\n\nAir Quality\n${aqiText}\n\nUV\nCurrent ${data.current.uvIndex}${data.current.uvPeak ? `, peak near ${data.current.uvPeak}` : ''}\n\nComfort Dashboard\nHumidity ${data.current.humidity}%\nPressure ${data.current.pressure} inHg\n${data.comfortSummary}\n\nFive-Day Outlook\n\n${outlook}\n\nRain And Ground Conditions\nRain today: ${data.rainToday}. Ground estimate: ${data.groundCondition.label}. ${data.groundCondition.summary}\n\nHungry Mother State Park Water Conditions\n${data.waterCondition.waterTemp}\n${data.waterCondition.measuredOrEstimatedNote}\nSurface: ${data.waterCondition.surface}. Rain/clarity: ${data.waterCondition.clarityNote}\n\nSun And Moon\nSunrise ${data.sunMoon.sunrise}\nSunset ${data.sunMoon.sunset}\nMoon ${data.moon.phase} ${data.moon.illumination}%\n${data.moon.skyEvent || ''}\n\nAlerts And Notes\n${alerts}\n\nStation Status\nStation is ${data.stationStatus.online ? 'online' : 'offline'} with data quality ${data.stationStatus.dataQuality}.`;
}

function renderDailyBriefHtml(data) {
  const text = renderDailyBriefText(data).split('\n').map((line) => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br />').join('');
  return `<!doctype html><html><body style="margin:0;background:#06111e;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:720px;margin:auto;padding:24px"><h1 style="color:#67e8f9">Staley Street Weather Daily Brief</h1><section style="background:#0b1f33;border:1px solid #0ea5e9;border-radius:14px;padding:18px">${text}</section></main></body></html>`;
}

function renderDailyBriefSms(data) {
  const alertText = data.alerts.length ? data.alerts[0].title : 'No active alerts';
  const aqiText = data.airQuality.aqi == null ? 'AQI unavailable' : `AQI ${data.airQuality.aqi}`;
  return `Staley Street Weather Daily Brief: ${data.current.temperature}F, ${data.current.condition}, feels like ${data.current.feelsLike}. High/Low ${data.high}/${data.low}. Wind ${data.current.windSpeed}/${data.current.windGust} mph. Rain today ${data.rainToday}. ${aqiText}. UV ${data.current.uvIndex}. Alerts: ${alertText}.`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

async function logDelivery(row) {
  try {
    await supabaseRest('daily_brief_send_logs', { method: 'POST', body: row });
  } catch {
    // Logging should never make delivery look failed if the provider accepted the message.
  }
}

async function sendEmail(contact, payload) {
  if (!cfg.resendApiKey) return { contactId: contact.id, email: contact.email, ok: false, error: 'Resend is not configured' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.resendFromEmail, to: [contact.email], subject: payload.subject, html: payload.html, text: payload.text }),
  });
  const body = await response.json().catch(() => ({}));
  const result = { contactId: contact.id, email: contact.email, ok: response.ok, resendMessageId: body.id, error: response.ok ? undefined : body.message || response.statusText };
  await logDelivery({ generated_at: payload.generatedAt, sent_at: new Date().toISOString(), status: result.ok ? 'sent' : 'failed', channel: 'email', recipient_contact_id: contact.id, recipient_value: contact.email, subject: payload.subject, error_message: result.error, resend_message_id: result.resendMessageId });
  return result;
}

async function sendSms(contact, payload) {
  if (!(cfg.twilioAccountSid && cfg.twilioApiKeySid && cfg.twilioApiKeySecret && cfg.twilioFromNumber)) return { contactId: contact.id, phoneE164: contact.phone_e164, ok: false, error: 'Twilio is not configured' };
  const auth = Buffer.from(`${cfg.twilioApiKeySid}:${cfg.twilioApiKeySecret}`).toString('base64');
  const form = new URLSearchParams({ To: contact.phone_e164, From: cfg.twilioFromNumber, Body: payload.sms });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  const result = { contactId: contact.id, phoneE164: contact.phone_e164, ok: response.ok, twilioMessageSid: body.sid, error: response.ok ? undefined : body.message || response.statusText };
  await logDelivery({ generated_at: payload.generatedAt, sent_at: new Date().toISOString(), status: result.ok ? 'sent' : 'failed', channel: 'sms', recipient_contact_id: contact.id, recipient_value: contact.phone_e164, subject: payload.subject, error_message: result.error, twilio_message_sid: result.twilioMessageSid });
  return result;
}

async function loadWeatherUndergroundStation() {
  if (!cfg.weatherKey) {
    throw new Error('WEATHER_API_KEY is required. Put it in your local .env file or deployment environment.');
  }

  const geocode = `${cfg.latitude},${cfg.longitude}`;
  let currentPayload;
  const sourceErrors = [];
  const dataSource = {
    primary: 'Weather Underground PWS',
    forecast: 'Unavailable',
    current: 'Unavailable',
    aqi: cfg.airNowApiKey ? 'AirNow official AQI' : 'Open-Meteo air quality fallback',
    radar: cfg.radarContextUrl ? cfg.radarProviderName : 'NOAA/NWS radar context',
    uv: 'Weather.com',
    lightning: cfg.xweatherClientId && cfg.xweatherClientSecret ? 'Xweather configured' : 'Not configured',
    errors: sourceErrors,
  };

  try {
    currentPayload = await weatherUnderground('/v2/pws/observations/current', {
      stationId: cfg.stationId,
      format: 'json',
      units: 'e',
    });
    dataSource.current = 'Weather Underground PWS';
  } catch (error) {
    sourceErrors.push({ source: 'Weather Underground PWS current', message: cleanProviderReason(error) });
  }

  let dailyPayload;
  let hourlyPayload;
  let alertsPayload;
  let forecast;
  let hourlyTrend;
  let alerts;

  try {
    [dailyPayload, hourlyPayload, alertsPayload] = await Promise.all([
      weatherUnderground('/v3/wx/forecast/daily/5day', {
        geocode,
        format: 'json',
        units: 'e',
        language: 'en-US',
      }),
      weatherUnderground('/v3/wx/forecast/hourly/2day', {
        geocode,
        format: 'json',
        units: 'e',
        language: 'en-US',
      }),
      weatherUnderground('/v3/alerts/headlines', {
        geocode,
        format: 'json',
        language: 'en-US',
      }).catch(() => ({ alerts: [] })),
    ]);
    forecast = dailyFromWeatherCom(dailyPayload);
    hourlyTrend = hourlyFromWeatherCom(hourlyPayload);
    alerts = alertsFromWeatherCom(alertsPayload);
    dataSource.forecast = 'Weather.com';
  } catch (error) {
    sourceErrors.push({ source: 'Weather.com forecast', message: cleanProviderReason(error) });
    try {
      const nws = await loadNationalWeatherServiceForecast();
      forecast = nws.forecast;
      hourlyTrend = nws.hourlyTrend;
      alerts = nws.alerts;
      dataSource.forecast = 'NWS';
    } catch (nwsError) {
      sourceErrors.push({ source: 'NWS forecast', message: cleanProviderReason(nwsError) });
      forecast = [];
      hourlyTrend = [];
      alerts = [];
    }
  }

  const airQuality = await loadAirQuality();
  const liveFallbackCurrent = currentPayload ? null : await loadOpenMeteoCurrent().catch(() => null);
  if (!currentPayload && liveFallbackCurrent) dataSource.current = 'Open-Meteo fallback';
  dataSource.aqi = airQuality.source || dataSource.aqi;
  if (!dailyPayload?.uvIndex?.[0]) dataSource.uv = 'Open-Meteo UV';
  const current = currentPayload
    ? readPwsCurrent(currentPayload)
    : liveFallbackCurrent || {
        temperature: hourlyTrend?.[0]?.temp ?? forecast?.[0]?.high ?? 0,
        feelsLike: hourlyTrend?.[0]?.feelsLike ?? hourlyTrend?.[0]?.temp ?? forecast?.[0]?.high ?? 0,
        humidity: 0,
        pressure: 29.92,
        windSpeed: 0,
        windGust: 0,
        windDirection: 'Unavailable',
        conditionText: forecast?.[0]?.condition || 'Unknown',
        precipToday: 0,
        precipRate: 0,
      };
  const hasLiveWeather = Boolean(currentPayload || liveFallbackCurrent || forecast?.length);

  return buildStationData({
    current,
    forecast,
    hourlyTrend,
    alerts,
    daily: dailyPayload,
    airQuality,
    stationStatus: currentPayload
      ? undefined
      : {
          online: hasLiveWeather,
          signal: hasLiveWeather ? 92 : 0,
          uptime: hasLiveWeather ? 'Live fallback active' : 'Unavailable',
          lastRestart: hasLiveWeather ? `${dataSource.current}; ${dataSource.forecast}` : sourceErrors[0]?.message || 'Weather Underground PWS unavailable',
          dataQuality: hasLiveWeather ? 'Live fallback' : 'Unavailable',
          dataQualityScore: hasLiveWeather ? 70 : 0,
        },
    dataSource,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    stationId: cfg.stationId,
    provider: 'weather-underground-pws',
    weatherApi: {
      configured: Boolean(cfg.weatherKey),
      length: cfg.weatherKey?.length || 0,
      sha12: keyFingerprint(cfg.weatherKey),
    },
    supabase: {
      urlConfigured: Boolean(cfg.supabaseUrl),
      serviceKeyConfigured: Boolean(cfg.supabaseServiceRoleKey),
      serviceKeySegments: jwtSegments(cfg.supabaseServiceRoleKey),
      anonKeyConfigured: Boolean(cfg.supabaseAnonKey),
      anonKeySegments: jwtSegments(cfg.supabaseAnonKey),
      readConfigured: supabaseCanRead(),
      writeConfigured: supabaseCanWrite(),
    },
  });
});

app.get('/api/weather', async (_req, res) => {
  try {
    if (weatherCache && Date.now() - weatherCacheAt < WEATHER_CACHE_MS) {
      res.set('Cache-Control', 'private, max-age=120');
      return res.json(weatherCache);
    }
    const data = await loadWeatherUndergroundStation();
    weatherCache = data;
    weatherCacheAt = Date.now();
    res.set('Cache-Control', 'private, max-age=120');
    res.json(data);
  } catch (error) {
    res.status(502).json({
      error: 'Unable to load live Weather Underground station data',
      message: error instanceof Error ? error.message : 'Unknown provider error',
    });
  }
});

app.get('/api/weather/debug', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    stationId: cfg.stationId,
    lat: cfg.latitude,
    lon: cfg.longitude,
    hasWeatherApiKey: Boolean(cfg.weatherKey),
    hasAirNowApiKey: Boolean(cfg.airNowApiKey),
    hasXweatherKey: Boolean(cfg.xweatherClientId && cfg.xweatherClientSecret),
    primaryWeatherSource: 'Weather Underground PWS',
    forecastSource: 'Weather.com, then NWS, then Open-Meteo fallback',
    aqiSource: cfg.airNowApiKey ? 'AirNow official AQI' : 'Open-Meteo air quality fallback',
    radarSource: cfg.radarContextUrl ? cfg.radarProviderName : 'NOAA/NWS radar context',
    uvSource: 'Weather.com, then Open-Meteo UV fallback',
    lightningSource: cfg.xweatherClientId && cfg.xweatherClientSecret ? 'Xweather configured' : 'not configured',
    notes: 'Provider status and fallback reasons are exposed on /api/weather as dataSource.errors without returning secrets.',
  });
});

app.get('/api/history', async (_req, res) => {
  try {
    const data = await loadPwsSevenDayHistory();
    res.set('Cache-Control', 'private, max-age=900');
    res.json(data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown provider error';
    const data = await loadPublicHistoryFallback(reason);
    res.set('Cache-Control', 'private, max-age=900');
    res.json(data);
  }
});

app.get('/api/app-config', async (_req, res) => {
  res.json(await loadAppConfig());
});

app.post('/api/contacts', async (req, res) => {
  try {
    const row = cleanContact(req.body);
    const result = await supabaseRest('contacts', { method: 'POST', body: row });
    res.json(result?.[0] || row);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save contact' });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const row = cleanContact(req.body);
    const result = await supabaseRest('contacts', { method: 'PATCH', query: { id: `eq.${req.params.id}` }, body: row });
    res.json(result?.[0] || row);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update contact' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await supabaseRest('contacts', { method: 'DELETE', query: { id: `eq.${req.params.id}` } });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to delete contact' });
  }
});

app.patch('/api/settings/:table', async (req, res) => {
  const allowed = new Set(['station_settings', 'daily_brief_schedules', 'alert_thresholds', 'display_preferences']);
  if (!allowed.has(req.params.table)) return res.status(404).json({ error: 'Unknown settings table' });
  try {
    const existing = await safeSelect(req.params.table, [], { select: 'id', limit: 1 });
    const body = { ...req.body, updated_at: new Date().toISOString() };
    if (existing?.[0]?.id) {
      const result = await supabaseRest(req.params.table, { method: 'PATCH', query: { id: `eq.${existing[0].id}` }, body });
      res.json(result?.[0] || body);
    } else {
      const result = await supabaseRest(req.params.table, { method: 'POST', body });
      res.json(result?.[0] || body);
    }
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to persist settings' });
  }
});

app.get('/api/daily-brief/preview', async (_req, res) => {
  try {
    const [weather, config] = await Promise.all([loadWeatherUndergroundStation(), loadAppConfig()]);
    const data = buildDailyBriefData(weather, config.station_settings);
    const subject = `Staley Street Weather Daily Brief - Marion, VA - ${new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: config.station_settings.timezone || cfg.timeZone })}`;
    const previewContact = (config.contacts || []).find((contact) => contact.email_enabled || contact.sms_enabled) || (config.contacts || [])[0];
    res.json({
      subject,
      generatedAt: data.generatedAt,
      data,
      text: renderDailyBriefText(data, previewContact),
      html: renderDailyBriefHtml(data),
      sms: renderDailyBriefSms(data),
      deliveryConfigured: config.deliveryConfigured,
      contacts: config.contacts,
      logs: config.daily_brief_send_logs,
    });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to generate daily brief' });
  }
});

app.post('/api/daily-brief/send', async (req, res) => {
  try {
    const [weather, config] = await Promise.all([loadWeatherUndergroundStation(), loadAppConfig()]);
    const data = buildDailyBriefData(weather, config.station_settings);
    const subject = req.body?.subject || `Staley Street Weather Daily Brief - Marion, VA - ${new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: config.station_settings.timezone || cfg.timeZone })}`;
    const contacts = (config.contacts || []).filter((contact) => contact.email_enabled || contact.sms_enabled);
    if (!contacts.length) return res.status(400).json({ error: 'No delivery contacts are configured in Supabase' });
    const emailResults = [];
    const smsResults = [];
    for (const contact of contacts) {
      const payload = { stationId: data.stationId, stationName: data.stationName, location: data.location, generatedAt: data.generatedAt, subject, html: renderDailyBriefHtml(data), text: renderDailyBriefText(data, contact), sms: renderDailyBriefSms(data), data };
      if (contact.email_enabled && contact.email) emailResults.push(await sendEmail(contact, payload));
      if (contact.sms_enabled && contact.phone_e164) smsResults.push(await sendSms(contact, payload));
    }
    res.json({ ok: true, emailResults, smsResults });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to send daily brief' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({
    ok: false,
    error: 'API route not found',
  });
});

if (fs.existsSync(path.join(root, 'dist'))) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}

app.listen(port, () => {
  console.log(`Staley Street Weather API listening on http://localhost:${port}`);
});
