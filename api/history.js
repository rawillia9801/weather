const STATION_ID = process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42';
const WEATHER_KEY = process.env.WEATHER_API_KEY || process.env.WEATHER_UNDERGROUND_API_KEY || process.env.VITE_WEATHER_API_KEY;

function optionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'StaleyStreetWeather/1.0',
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 180)}`);
  }
  return response.json();
}

async function weatherCom(path, params) {
  const url = new URL(`https://api.weather.com${path}`);
  Object.entries({ ...params, apiKey: WEATHER_KEY }).forEach(([key, value]) => {
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
    stationId: row?.stationID || STATION_ID,
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
  if (!WEATHER_KEY) {
    throw new Error('WEATHER_API_KEY is required for Weather Underground PWS history.');
  }
  const units = 'e';
  const payload = await weatherCom('/v2/pws/dailysummary/7day', {
    stationId: STATION_ID,
    format: 'json',
    units,
    numericPrecision: 'decimal',
  });
  const summaries = (payload?.summaries || [])
    .map((row) => normalizePwsDailySummary(row, units))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {
    source: 'Weather Underground PWS Daily Summary - 7 Day History',
    stationId: STATION_ID,
    units,
    generatedAt: new Date().toISOString(),
    summaries,
  };
}

export default async function handler(_req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=900');
    return res.status(200).json(await loadPwsSevenDayHistory());
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to load Weather Underground PWS 7-day history',
      message: error instanceof Error ? error.message : 'Unknown provider error',
    });
  }
}
