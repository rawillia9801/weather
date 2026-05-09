const STATION_ID = envValue('STATION_ID') || envValue('WEATHER_UNDERGROUND_STATION_ID') || 'KVAMARIO42';
const WEATHER_KEY = weatherKeyValue();
const LATITUDE = Number(envValue('LATITUDE') || envValue('STATION_LAT') || 36.8348);
const LONGITUDE = Number(envValue('LONGITUDE') || envValue('STATION_LON') || -81.5148);
const TIME_ZONE = envValue('REPORT_TIME_ZONE') || envValue('TZ') || 'America/New_York';

function envValue(name) {
  return process.env[name]?.trim();
}

function weatherKeyValue() {
  return (envValue('WEATHER_API_KEY') || envValue('WEATHER_UNDERGROUND_API_KEY') || envValue('VITE_WEATHER_API_KEY') || '').toLowerCase();
}

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

async function loadPublicHistoryFallback(reason = 'Weather Underground PWS history unavailable') {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(LATITUDE));
  url.searchParams.set('longitude', String(LONGITUDE));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', TIME_ZONE);
  url.searchParams.set('past_days', '7');
  url.searchParams.set('forecast_days', '1');
  const payload = await getJson(url);
  const daily = payload?.daily || {};
  const allTimes = daily.time || [];
  const times = allTimes.slice(-7);
  const summaries = times.map((date, index) => {
    const sourceIndex = allTimes.length - times.length + index;
    return {
      date,
      stationId: STATION_ID,
      obsTimeLocal: `${date} 23:59:59`,
      obsTimeUtc: new Date(`${date}T23:59:59`).toISOString(),
      humidityAvg: null,
      humidityHigh: null,
      humidityLow: null,
      uvHigh: null,
      windDirectionAvg: null,
      tempHigh: optionalNumber(daily.temperature_2m_max?.[sourceIndex]),
      tempLow: optionalNumber(daily.temperature_2m_min?.[sourceIndex]),
      tempAvg: optionalNumber(daily.temperature_2m_mean?.[sourceIndex]),
      windSpeedHigh: optionalNumber(daily.wind_speed_10m_max?.[sourceIndex]),
      windSpeedAvg: null,
      windGustHigh: optionalNumber(daily.wind_gusts_10m_max?.[sourceIndex]),
      pressureMax: null,
      pressureMin: null,
      precipTotal: optionalNumber(daily.precipitation_sum?.[sourceIndex]),
    };
  });
  return {
    source: 'Open-Meteo public archive fallback',
    stationId: STATION_ID,
    units: 'e',
    generatedAt: new Date().toISOString(),
    fallbackReason: reason,
    summaries,
  };
}

export default async function handler(_req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=900');
    return res.status(200).json(await loadPwsSevenDayHistory());
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=900');
    const reason = error instanceof Error ? error.message : 'Unknown provider error';
    return res.status(200).json(await loadPublicHistoryFallback(reason));
  }
}
