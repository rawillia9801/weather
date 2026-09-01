import weather from './weather.js';

let cachedBody = null;
let cachedStatus = 200;
let cachedHeaders = {};
let cachedAt = 0;
let inflight = null;

const SUCCESS_TTL_MS = 2 * 60 * 1000;
const FAILURE_TTL_MS = 15 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;
const TIME_ZONE = (process.env.REPORT_TIME_ZONE || process.env.TZ || 'America/New_York').trim();
const LATITUDE = Number(process.env.LATITUDE || process.env.STATION_LAT || 36.8348);
const LONGITUDE = Number(process.env.LONGITUDE || process.env.STATION_LON || -81.5148);

function now() {
  return Date.now();
}

function cacheAge() {
  return now() - cachedAt;
}

function hasFreshCache() {
  if (!cachedBody || !cachedAt) return false;
  const ttl = cachedStatus >= 200 && cachedStatus < 300 ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
  return cacheAge() < ttl;
}

function hasStaleCache() {
  return Boolean(cachedBody && cachedAt && cacheAge() < STALE_TTL_MS);
}

function setWeatherCacheHeaders(res) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
}

function sendCached(res) {
  Object.entries(cachedHeaders || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) res.setHeader(key, value);
  });
  setWeatherCacheHeaders(res);
  res.setHeader('X-Staley-Weather-Cache', hasFreshCache() ? 'HIT' : 'STALE');
  res.setHeader('X-Staley-Weather-Cache-Age', String(Math.round(cacheAge() / 1000)));
  return res.status(cachedStatus).json(cachedBody);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function unavailable(value) {
  return !value || /unavailable/i.test(String(value));
}

function openMeteoCondition(code, isDay = true) {
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

function formatLocalClock(value) {
  if (!value) return null;
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function formatDaylight(seconds) {
  const total = finiteNumber(seconds);
  if (total == null || total <= 0) return null;
  const minutes = Math.round(total / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

async function loadLivePwsGauge() {
  const apiKey = (
    process.env.WEATHER_API_KEY ||
    process.env.WEATHER_UNDERGROUND_API_KEY ||
    process.env.VITE_WEATHER_API_KEY ||
    ''
  ).trim();
  const stationId = (
    process.env.STATION_ID ||
    process.env.WEATHER_UNDERGROUND_STATION_ID ||
    process.env.VITE_STATION_ID ||
    'KVAMARIO42'
  ).trim();
  if (!apiKey || !stationId) return null;

  const url = new URL('https://api.weather.com/v2/pws/observations/current');
  url.searchParams.set('stationId', stationId);
  url.searchParams.set('format', 'json');
  url.searchParams.set('units', 'e');
  url.searchParams.set('numericPrecision', 'decimal');
  url.searchParams.set('apiKey', apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const observation = payload?.observations?.[0];
    if (!observation) return null;

    const imperial = observation.imperial || {};
    return {
      rate: finiteNumber(imperial.precipRate),
      today: finiteNumber(imperial.precipTotal),
      observedAt: observation.obsTimeLocal || observation.obsTimeUtc || null,
      stationId: observation.stationID || stationId,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPublicNowContext() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(LATITUDE));
  url.searchParams.set('longitude', String(LONGITUDE));
  url.searchParams.set('current', 'weather_code,is_day,precipitation,rain,showers,wind_speed_10m');
  url.searchParams.set('daily', 'sunrise,sunset,daylight_duration');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('timezone', TIME_ZONE);
  url.searchParams.set('forecast_days', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const current = payload?.current || {};
    const daily = payload?.daily || {};
    return {
      condition: openMeteoCondition(current.weather_code, current.is_day !== 0),
      precipitation: finiteNumber(current.precipitation) ?? finiteNumber(current.rain) ?? finiteNumber(current.showers) ?? 0,
      windSpeed: finiteNumber(current.wind_speed_10m),
      sunrise: formatLocalClock(daily.sunrise?.[0]),
      sunset: formatLocalClock(daily.sunset?.[0]),
      daylight: formatDaylight(daily.daylight_duration?.[0]),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichWeatherTruth(body) {
  if (!body || typeof body !== 'object') return body;

  const [gauge, publicNow] = await Promise.all([
    loadLivePwsGauge(),
    loadPublicNowContext(),
  ]);

  if (body.precipitation && gauge) {
    body.precipitation = {
      ...body.precipitation,
      rate: gauge.rate,
      rateLabel: 'Live PWS rain rate',
      observedAt: gauge.observedAt,
      gaugeSource: `Weather Underground PWS ${gauge.stationId}`,
      ...(gauge.today == null
        ? {}
        : {
            today: gauge.today,
            todayLabel: 'Today station gauge',
          }),
    };
  }

  if (publicNow && body.current) {
    const reportedCondition = String(body.current.condition || 'Unknown');
    const stationWind = finiteNumber(body.current.windSpeed) ?? 0;
    const suspiciousWindLabel = reportedCondition === 'Windy' && stationWind < 10;
    const missingCondition = reportedCondition === 'Unknown';
    const publicReportsActivePrecip = publicNow.precipitation > 0 && ['Rain', 'Showers', 'Thunderstorms', 'Snow'].includes(publicNow.condition);

    if (suspiciousWindLabel || missingCondition || publicReportsActivePrecip) {
      body.current = {
        ...body.current,
        condition: publicNow.condition,
      };
    }
  }

  if (publicNow && body.sunMoon) {
    body.sunMoon = {
      ...body.sunMoon,
      sunrise: unavailable(body.sunMoon.sunrise) && publicNow.sunrise ? publicNow.sunrise : body.sunMoon.sunrise,
      sunset: unavailable(body.sunMoon.sunset) && publicNow.sunset ? publicNow.sunset : body.sunMoon.sunset,
      daylight: unavailable(body.sunMoon.daylight) && publicNow.daylight ? publicNow.daylight : body.sunMoon.daylight,
    };
  }

  return body;
}

async function invokeWeather(req) {
  let statusCode = 200;
  const headers = {};
  let body;

  const proxyRes = {
    setHeader(key, value) {
      headers[key] = value;
      return this;
    },
    getHeader(key) {
      return headers[key];
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    end(payload = '') {
      if (body === undefined && payload) {
        try {
          body = JSON.parse(String(payload));
        } catch {
          body = { ok: false, error: String(payload).slice(0, 240) };
        }
      }
      return this;
    },
  };

  await weather(req, proxyRes);

  if (body === undefined) {
    body = { ok: false, error: 'Weather route returned no JSON body' };
    statusCode = statusCode >= 400 ? statusCode : 502;
  }

  if (statusCode >= 200 && statusCode < 300) {
    body = await enrichWeatherTruth(body);
  }

  cachedBody = body;
  cachedStatus = statusCode;
  cachedHeaders = headers;
  cachedAt = now();

  return { body, statusCode, headers };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (hasFreshCache()) return sendCached(res);

  if (!inflight) {
    inflight = invokeWeather(req).finally(() => {
      inflight = null;
    });
  }

  try {
    const result = await inflight;
    Object.entries(result.headers || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) res.setHeader(key, value);
    });
    setWeatherCacheHeaders(res);
    res.setHeader('X-Staley-Weather-Cache', 'MISS');
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (hasStaleCache()) return sendCached(res);
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Weather route failed',
    });
  }
}
