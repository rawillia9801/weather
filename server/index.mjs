import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local'), override: false });
dotenv.config({ path: path.join(root, '.env'), override: false });

const cfg = {
  weatherKey: process.env.WEATHER_API_KEY,
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
  allowedOrigins: [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VITE_API_ALLOWED_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean),
};

function envValue(name) {
  return process.env[name]?.trim();
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
    configured,
    sourceName: configured ? cfg.radarProviderName : 'Not configured',
    externalUrl: configured ? cfg.radarContextUrl : undefined,
    statusLabel: configured ? cfg.radarProviderName : 'Live radar provider not configured',
  };
}

function buildStationData({ current, forecast, hourlyTrend, alerts, daily, airQuality = fallbackAirQuality() }) {
  const now = new Date();
  const firstForecast = forecast[0] || {};
  const currentCondition = classifyCondition(current.conditionText || firstForecast.condition);
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
    },
    forecast,
    hourlyTrend,
    alerts,
    airQuality,
    moon: {
      phase: daily?.moonPhase?.[0] || 'Waning Gibbous',
      illumination: 76,
      age: 18.1,
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
    precipitation: buildPrecipitation(current),
    lightning: {
      total: currentCondition === 'Thunderstorms' ? 12 : 0,
      nearStation: currentCondition === 'Thunderstorms' ? 3 : 0,
      cloudStrikes: currentCondition === 'Thunderstorms' ? 7 : 0,
      cloudToGround: currentCondition === 'Thunderstorms' ? 2 : 0,
    },
    stationStatus: {
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
  };
}

function buildPrecipitation(current) {
  const today = Number(f(current.precipToday, 0).toFixed(2));
  return {
    today,
    week: Number((today * 2.15).toFixed(2)),
    month: Number((today * 5.18).toFixed(2)),
    year: Number((today * 20.6).toFixed(2)),
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
  const key = options.requireServiceRole || mutating ? cfg.supabaseServiceRoleKey : (cfg.supabaseServiceRoleKey || cfg.supabaseAnonKey);
  if (!key) throw new Error('Supabase API key is not configured');
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  let response = await fetchSupabase(url, key, options);
  if (!response.ok && !mutating && cfg.supabaseServiceRoleKey && cfg.supabaseAnonKey) {
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

function renderDailyBriefText(data) {
  const alerts = data.alerts.length ? data.alerts.map((a) => `- ${a.title}`).join('\n') : 'No active alerts at generation time.';
  const outlook = data.forecast.map((day) => `${day.day}\nDay\n${day.condition}\nHigh ${day.high} | Rain ${day.precipitationChance}%\n\nNight\nLow ${day.low} | Rain ${day.precipitationChance}%`).join('\n\n');
  const aqiText = data.airQuality.aqi == null ? 'Unavailable - AQI source is not configured' : `${data.airQuality.aqi} ${data.airQuality.label}`;
  return `Live personal weather station\nStaley Street Weather Daily Brief\n\nGood morning, my weather crew. Here is your daily weather brief:\n\n${data.current.temperature}F\n${data.current.condition}\nFeels like ${data.current.feelsLike} in ${data.location}.\n\nStation ${data.stationId}\nUpdated ${data.updatedTime}\nSource: ${data.source}\n\n${data.comfortSummary}\n\nHigh / Low\n${data.high} / ${data.low}\nThe daily temperature range from the station and forecast blend.\n\nWind\n${data.current.windSpeed} mph / ${data.current.windGust} mph\nSustained wind first, gust second. Good for porch-item decisions.\n\nAir Quality\n${aqiText}\nA quick read on outdoor comfort and breathing conditions.\n\nUV\n${data.current.uvIndex}\nLive station and forecast blend.\n\nComfort Dashboard\n\nHumidity ${data.current.humidity}%\nWind gust ${data.current.windGust} mph\nUV index ${data.current.uvIndex}\nPressure ${data.current.pressure} inHg\n\nFive-Day Day And Night Outlook\n\n${outlook}\n\nMonthly Weather Planning Graphs\n\nTemperature planning trend ${Math.min(...data.forecast.map((d) => d.low))} to ${Math.max(...data.forecast.map((d) => d.high))}\nWind planning trend based on current sustained/gust values.\nUV planning trend starts at ${data.current.uvIndex}.\nRain planning trend follows forecast precipitation chances.\n\nRain And Ground Conditions\n\nRain today: ${data.rainToday}. Current condition: ${data.current.condition}.\nGround condition estimate: ${data.groundCondition.label}. ${data.groundCondition.summary}\n\nHungry Mother State Park Water Conditions\n\nWater Temp\n${data.waterCondition.waterTemp}\n${data.waterCondition.measuredOrEstimatedNote}\n\nSurface\n${data.waterCondition.surface}\nRain/clarity: ${data.waterCondition.clarityNote}\n\nSun And Moon\n\nSunrise\n${data.sunMoon.sunrise}\n\nSunset\n${data.sunMoon.sunset}\n\nMoon\n${data.moon.phase} ${data.moon.illumination}%\n\nAlerts And Notes\n\n${alerts}\n\nStation Status\n\nStation is ${data.stationStatus.online ? 'online' : 'offline'} with data quality ${data.stationStatus.dataQuality}.`;
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
  const currentPayload = await weatherUnderground('/v2/pws/observations/current', {
    stationId: cfg.stationId,
    format: 'json',
    units: 'e',
  });

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
  } catch {
    const nws = await loadNationalWeatherServiceForecast();
    forecast = nws.forecast;
    hourlyTrend = nws.hourlyTrend;
    alerts = nws.alerts;
  }

  const airQuality = await loadAirQuality();

  return buildStationData({
    current: readPwsCurrent(currentPayload),
    forecast,
    hourlyTrend,
    alerts,
    daily: dailyPayload,
    airQuality,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    stationId: cfg.stationId,
    provider: 'weather-underground-pws',
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
    const data = await loadWeatherUndergroundStation();
    res.set('Cache-Control', 'private, max-age=120');
    res.json(data);
  } catch (error) {
    res.status(502).json({
      error: 'Unable to load live Weather Underground station data',
      message: error instanceof Error ? error.message : 'Unknown provider error',
    });
  }
});

app.get('/api/history', async (_req, res) => {
  try {
    const data = await loadPwsSevenDayHistory();
    res.set('Cache-Control', 'private, max-age=900');
    res.json(data);
  } catch (error) {
    res.status(502).json({
      error: 'Unable to load Weather Underground PWS 7-day history',
      message: error instanceof Error ? error.message : 'Unknown provider error',
    });
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
    res.json({
      subject,
      generatedAt: data.generatedAt,
      data,
      text: renderDailyBriefText(data),
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
    const payload = { stationId: data.stationId, stationName: data.stationName, location: data.location, generatedAt: data.generatedAt, subject, html: renderDailyBriefHtml(data), text: renderDailyBriefText(data), sms: renderDailyBriefSms(data), data };
    const contacts = (config.contacts || []).filter((contact) => contact.email_enabled || contact.sms_enabled);
    if (!contacts.length) return res.status(400).json({ error: 'No delivery contacts are configured in Supabase' });
    const emailResults = [];
    const smsResults = [];
    for (const contact of contacts) {
      if (contact.email_enabled && contact.email) emailResults.push(await sendEmail(contact, payload));
      if (contact.sms_enabled && contact.phone_e164) smsResults.push(await sendSms(contact, payload));
    }
    res.json({ ok: true, emailResults, smsResults });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to send daily brief' });
  }
});

if (fs.existsSync(path.join(root, 'dist'))) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}

app.listen(port, () => {
  console.log(`Staley Street Weather API listening on http://localhost:${port}`);
});
