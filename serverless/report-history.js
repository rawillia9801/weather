const LATITUDE = Number(process.env.LATITUDE || process.env.STATION_LAT || 36.8348);
const LONGITUDE = Number(process.env.LONGITUDE || process.env.STATION_LON || -81.5148);
const TIME_ZONE = process.env.REPORT_TIME_ZONE || 'America/New_York';
const STATION_ID = process.env.STATION_ID || 'KVAMARIO42';

function decimal(value) {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function todayInStationZone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const days = 30;
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(LATITUDE));
    url.searchParams.set('longitude', String(LONGITUDE));
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('wind_speed_unit', 'mph');
    url.searchParams.set('precipitation_unit', 'inch');
    url.searchParams.set('timezone', TIME_ZONE);
    url.searchParams.set('past_days', String(days + 1));
    url.searchParams.set('forecast_days', '1');
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Public historical weather source returned HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.reason || 'Historical forecast request failed');
    const daily = payload.daily || {};
    const localToday = todayInStationZone();
    const dates = Array.isArray(daily.time) ? daily.time : [];
    const indexes = dates
      .map((date, index) => ({ date, index }))
      .filter(({ date }) => typeof date === 'string' && date < localToday)
      .slice(-days);
    if (!indexes.length) throw new Error('No completed historical days were available');
    const summaries = indexes.map(({ date, index }) => ({
      date,
      stationId: STATION_ID,
      obsTimeLocal: `${date} 23:59:59`,
      tempHigh: decimal(daily.temperature_2m_max?.[index]),
      tempLow: decimal(daily.temperature_2m_min?.[index]),
      tempAvg: decimal(daily.temperature_2m_mean?.[index]),
      humidityAvg: null,
      humidityHigh: null,
      humidityLow: null,
      uvHigh: null,
      windSpeedAvg: null,
      windSpeedHigh: decimal(daily.wind_speed_10m_max?.[index]),
      windGustHigh: decimal(daily.wind_gusts_10m_max?.[index]),
      pressureMin: null,
      pressureMax: null,
      precipTotal: decimal(daily.precipitation_sum?.[index]),
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      source: 'Open-Meteo public historical model data (not station measurements)',
      sourceType: 'public-model',
      stationId: STATION_ID,
      generatedAt: new Date().toISOString(),
      timezone: TIME_ZONE,
      summaries,
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Historical observations unavailable' });
  }
}
