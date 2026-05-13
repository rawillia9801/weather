import weather from './weather.js';

let cachedBody = null;
let cachedStatus = 200;
let cachedHeaders = {};
let cachedAt = 0;
let inflight = null;

const SUCCESS_TTL_MS = 5 * 60 * 1000;
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

function sendCached(res) {
  Object.entries(cachedHeaders || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) res.setHeader(key, value);
  });
  res.setHeader('Cache-Control', 'public, max-age=240, s-maxage=300, stale-while-revalidate=900');
  res.setHeader('X-Staley-Weather-Cache', hasFreshCache() ? 'HIT' : 'STALE');
  res.setHeader('X-Staley-Weather-Cache-Age', String(Math.round(cacheAge() / 1000)));
  return res.status(cachedStatus).json(cachedBody);
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
    res.setHeader('Cache-Control', 'public, max-age=240, s-maxage=300, stale-while-revalidate=900');
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
