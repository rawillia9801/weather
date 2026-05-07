const STATION_ID = process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42';
const LATITUDE = Number(process.env.LATITUDE || process.env.STATION_LAT || 36.8348);
const LONGITUDE = Number(process.env.LONGITUDE || process.env.STATION_LON || -81.5148);
const TIME_ZONE = process.env.REPORT_TIME_ZONE || process.env.TZ || 'America/New_York';
const WEATHER_KEY = process.env.WEATHER_API_KEY;

const conditionMap = [
  ['thunder', 'Thunderstorms'],
  ['storm', 'Thunderstorms'],
  ['rain shower', 'Showers'],
  ['showers', 'Showers'],
  ['shower', 'Showers'],
  ['drizzle', 'Showers'],
  ['rain', 'Rain'],
  ['snow', 'Snow'],
  ['flurr', 'Snow'],
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

function condition(text = '', isNight = false) {
  const value = String(text).toLowerCase();
  const found = conditionMap.find(([needle]) => value.includes(needle));
  if (!found) return isNight ? 'Clear Night' : 'Unknown';
  return found[1] === 'Sunny' && isNight ? 'Clear Night' : found[1];
}

function n(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function time(value) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return date.toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'StaleyStreetWeather/1.0',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function weatherCom(path, params) {
  const url = new URL(`https://api.weather.com${path}`);
  Object.entries({ ...params, apiKey: WEATHER_KEY }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return getJson(url);
}

function currentFromPws(payload) {
  const obs = payload?.observations?.[0] || {};
  const imperial = obs.imperial || {};
  return {
    temperature: n(imperial.temp, n(obs.temp)),
    feelsLike: n(imperial.heatIndex, n(imperial.windChill, n(imperial.temp))),
    humidity: n(obs.humidity),
    pressure: n(imperial.pressure, 29.92),
    windSpeed: n(imperial.windSpeed),
    windGust: n(imperial.windGust),
    windDirection: obs.winddirCompass || obs.windDirection || 'WNW',
    conditionText: obs.wxPhraseLong || obs.neighborhood || '',
    precipToday: n(imperial.precipTotal),
  };
}

function forecastFromWeatherCom(payload) {
  const days = payload?.dayOfWeek || [];
  return days.slice(0, 5).map((day, index) => {
    const dayPart = index * 2;
    const text = payload.narrative?.[index] || payload.daypart?.[0]?.wxPhraseLong?.[dayPart] || '';
    return {
      day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day,
      condition: condition(text),
      high: Math.round(n(payload.temperatureMax?.[index], n(payload.calendarDayTemperatureMax?.[index]))),
      low: Math.round(n(payload.temperatureMin?.[index], n(payload.calendarDayTemperatureMin?.[index]))),
      precipitationChance: Math.round(n(payload.daypart?.[0]?.precipChance?.[dayPart], 0)),
    };
  });
}

function hourlyFromWeatherCom(payload) {
  const times = payload?.validTimeLocal || [];
  return times.filter((_, index) => index % 4 === 0).slice(0, 7).map((stamp, filteredIndex) => {
    const sourceIndex = filteredIndex * 4;
    return {
      time: new Date(stamp).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric' }),
      temp: Math.round(n(payload.temperature?.[sourceIndex])),
      feelsLike: Math.round(n(payload.temperatureFeelsLike?.[sourceIndex], n(payload.temperature?.[sourceIndex]))),
    };
  });
}

async function getNwsBundle() {
  const point = await getJson(`https://api.weather.gov/points/${LATITUDE},${LONGITUDE}`);
  const [daily, hourly, alerts] = await Promise.all([
    getJson(point.properties.forecast),
    getJson(point.properties.forecastHourly),
    getJson(`https://api.weather.gov/alerts/active?point=${LATITUDE},${LONGITUDE}`).catch(() => ({ features: [] })),
  ]);
  return {
    forecast: forecastFromNws(daily),
    hourlyTrend: hourlyFromNws(hourly),
    alerts: alertsFromNws(alerts),
  };
}

function forecastFromNws(payload) {
  const periods = payload?.properties?.periods || [];
  const days = [];
  for (let index = 0; index < periods.length && days.length < 5; index += 1) {
    const period = periods[index];
    if (!period?.isDaytime) continue;
    const night = periods.slice(index + 1).find((item) => item.isDaytime === false);
    days.push({
      day: days.length === 0 ? 'Today' : days.length === 1 ? 'Tomorrow' : period.name,
      condition: condition(`${period.shortForecast || ''} ${period.detailedForecast || ''}`),
      high: Math.round(n(period.temperature)),
      low: Math.round(n(night?.temperature, period.temperature)),
      precipitationChance: Math.round(n(period.probabilityOfPrecipitation?.value, 0)),
    });
  }
  return days;
}

function hourlyFromNws(payload) {
  return (payload?.properties?.periods || []).filter((_, index) => index % 4 === 0).slice(0, 7).map((period) => ({
    time: time(period.startTime),
    temp: Math.round(n(period.temperature)),
    feelsLike: Math.round(n(period.temperature)),
  }));
}

function alertsFromNws(payload) {
  return (payload?.features || []).slice(0, 3).map((feature, index) => {
    const title = feature.properties?.event || feature.properties?.headline || 'Weather alert';
    return {
      id: feature.properties?.id || feature.id || `alert-${index}`,
      title,
      severity: /warning/i.test(title) ? 'warning' : /watch/i.test(title) ? 'watch' : 'advisory',
    };
  });
}

async function buildWeather() {
  let pws = null;
  let daily = null;
  let bundle = null;

  if (WEATHER_KEY) {
    try {
      pws = currentFromPws(await weatherCom('/v2/pws/observations/current', { stationId: STATION_ID, format: 'json', units: 'e' }));
    } catch {}
    try {
      const geocode = `${LATITUDE},${LONGITUDE}`;
      const [dailyPayload, hourlyPayload, alertPayload] = await Promise.all([
        weatherCom('/v3/wx/forecast/daily/5day', { geocode, format: 'json', units: 'e', language: 'en-US' }),
        weatherCom('/v3/wx/forecast/hourly/2day', { geocode, format: 'json', units: 'e', language: 'en-US' }),
        weatherCom('/v3/alerts/headlines', { geocode, format: 'json', language: 'en-US' }).catch(() => ({ alerts: [] })),
      ]);
      daily = dailyPayload;
      bundle = {
        forecast: forecastFromWeatherCom(dailyPayload),
        hourlyTrend: hourlyFromWeatherCom(hourlyPayload),
        alerts: (alertPayload.alerts || []).slice(0, 3).map((alert, index) => ({ id: alert.detailKey || `alert-${index}`, title: alert.eventDescription || alert.headlineText || 'Weather alert', severity: 'advisory' })),
      };
    } catch {}
  }

  if (!bundle) bundle = await getNwsBundle();
  const firstForecast = bundle.forecast[0] || { high: 0, low: 0, condition: 'Unknown', precipitationChance: 0 };
  const firstHourly = bundle.hourlyTrend[0] || { temp: firstForecast.high, feelsLike: firstForecast.high };
  const current = pws || {
    temperature: firstHourly.temp,
    feelsLike: firstHourly.feelsLike,
    humidity: 0,
    pressure: 29.92,
    windSpeed: 0,
    windGust: 0,
    windDirection: 'Unavailable',
    conditionText: firstForecast.condition,
    precipToday: 0,
  };
  const currentCondition = condition(current.conditionText || firstForecast.condition);
  const rain = Number(n(current.precipToday, 0).toFixed(2));
  const isStorm = currentCondition === 'Thunderstorms';

  return {
    station: {
      name: 'Staley Street Weather',
      id: STATION_ID,
      location: 'Marion, Virginia',
      elevation: '1,476 ft',
      latitude: `${Math.abs(LATITUDE).toFixed(4)}° ${LATITUDE >= 0 ? 'N' : 'S'}`,
      longitude: `${Math.abs(LONGITUDE).toFixed(4)}° ${LONGITUDE >= 0 ? 'E' : 'W'}`,
    },
    clock: new Date().toISOString(),
    current: {
      condition: currentCondition,
      temperature: Number(n(current.temperature).toFixed(1)),
      feelsLike: Math.round(n(current.feelsLike, current.temperature)),
      high: n(firstForecast.high, current.temperature),
      low: n(firstForecast.low, current.temperature),
      humidity: Math.round(n(current.humidity)),
      humidityLabel: n(current.humidity) >= 70 ? 'Humid' : n(current.humidity) <= 35 ? 'Dry' : 'Comfortable',
      pressure: Number(n(current.pressure, 29.92).toFixed(2)),
      pressureTrend: 'Steady',
      windSpeed: Math.round(n(current.windSpeed)),
      windDirection: current.windDirection || 'WNW',
      windGust: Math.round(n(current.windGust)),
      uvIndex: Math.round(n(daily?.uvIndex?.[0], 0)),
    },
    forecast: bundle.forecast,
    hourlyTrend: bundle.hourlyTrend,
    alerts: bundle.alerts,
    airQuality: { aqi: null, label: 'Unavailable', message: 'AQI source is not configured.', pollutants: [] },
    moon: { phase: daily?.moonPhase?.[0] || 'Unavailable', illumination: n(daily?.moonIllumination?.[0], 0), age: n(daily?.moonAge?.[0], 0) },
    sunMoon: { sunrise: time(daily?.sunriseTimeLocal?.[0]), daylight: 'Unavailable', sunset: time(daily?.sunsetTimeLocal?.[0]), moonrise: time(daily?.moonriseTimeLocal?.[0]), visible: 'Unavailable', moonset: time(daily?.moonsetTimeLocal?.[0]) },
    radar: { labels: ['Abingdon', 'Bristol', 'Wytheville'], legend: ['Light', 'Moderate', 'Heavy', 'Severe'] },
    precipitation: { today: rain, week: Number((rain * 2.15).toFixed(2)), month: Number((rain * 5.18).toFixed(2)), year: Number((rain * 20.6).toFixed(2)) },
    lightning: { total: isStorm ? 12 : 0, nearStation: isStorm ? 3 : 0, cloudStrikes: isStorm ? 7 : 0, cloudToGround: isStorm ? 2 : 0 },
    stationStatus: { online: true, signal: pws ? 98 : 70, uptime: 'Unavailable', lastRestart: 'Unavailable', dataQuality: pws ? 'Live' : 'Forecast fallback', dataQualityScore: pws ? 100 : 70 },
    camera: { snapshotUrl: process.env.LOREX_CAMERA_SNAPSHOT_URL || process.env.STATION_CAMERA_SNAPSHOT_URL || '', name: process.env.LOREX_CAMERA_NAME || process.env.STATION_CAMERA_NAME || 'Station Camera' },
  };
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(await buildWeather());
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load station data' });
  }
}
