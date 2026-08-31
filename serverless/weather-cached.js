import weather from './weather.js';

let cachedBody = null;
let cachedStatus = 200;
let cachedHeaders = {};
let cachedAt = 0;
let inflight = null;

const SUCCESS_TTL_MS = 2 * 60 * 1000;
const FAILURE_TTL_MS = 15 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;

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

async function loadLivePwsGauge() {
  const apiKey = (process.env.WEATHER_API_KEY || process.env.WEATHER_UNDERGROUND_API_KEY || '').trim();
  const stationId = (process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42').trim();
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

async function enrichLivePrecipitation(body) {
  if (!body || typeof body !== 'object' || !body.precipitation) return body;

  const gauge = await loadLivePwsGauge();
  if (!gauge) return body;

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
    body = await enrichLivePrecipitation(body);
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
