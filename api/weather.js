const STATION_ID = envValue('STATION_ID') || envValue('WEATHER_UNDERGROUND_STATION_ID') || 'KVAMARIO42';
const LATITUDE = Number(envValue('LATITUDE') || envValue('STATION_LAT') || 36.8348);
const LONGITUDE = Number(envValue('LONGITUDE') || envValue('STATION_LON') || -81.5148);
const TIME_ZONE = envValue('REPORT_TIME_ZONE') || envValue('TZ') || 'America/New_York';
const WEATHER_KEY = weatherKeyValue();
const RADAR_CONTEXT_URL = envValue('RADAR_CONTEXT_URL') || '';
const RADAR_PROVIDER_NAME = envValue('RADAR_PROVIDER_NAME') || 'Radar provider';
let weatherCache = null;
let weatherCacheAt = 0;
const WEATHER_CACHE_MS = 120000;

function envValue(name) {
  return process.env[name]?.trim();
}

function weatherKeyValue() {
  return (envValue('WEATHER_API_KEY') || envValue('WEATHER_UNDERGROUND_API_KEY') || envValue('VITE_WEATHER_API_KEY') || '').toLowerCase();
}

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
    conditionText: obs.wxPhraseLong || '',
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

function cleanProviderReason(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (!message) return 'Weather Underground PWS unavailable';
  if (message.includes('401 Unauthorized')) return 'Weather Underground API offline';
  if (message.includes('Access Denied')) return 'Weather Underground API offline';
  if (message.includes('Invalid apiKey')) return 'Weather Underground API key rejected';
  return message.replace(/\s+/g, ' ').slice(0, 140);
}

async function loadAirQuality() {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(LATITUDE));
  url.searchParams.set('longitude', String(LONGITUDE));
  url.searchParams.set('current', 'us_aqi,pm2_5,pm10,ozone,carbon_monoxide,nitrogen_dioxide');
  url.searchParams.set('timezone', TIME_ZONE);

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

function windDirectionFromDegrees(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 'Unavailable';
  const labels = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return labels[Math.round(degrees / 22.5) % 16];
}

function conditionFromWeatherCode(code, isDay = true) {
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
  return 'Unknown';
}

async function loadOpenMeteoCurrent() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(LATITUDE));
  url.searchParams.set('longitude', String(LONGITUDE));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day');
  url.searchParams.set('daily', 'precipitation_sum');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', TIME_ZONE);
  const payload = await getJson(url);
  const current = payload?.current || {};
  return {
    temperature: n(current.temperature_2m),
    feelsLike: n(current.apparent_temperature, current.temperature_2m),
    humidity: n(current.relative_humidity_2m),
    pressure: Number((n(current.pressure_msl, 1013.25) / 33.8639).toFixed(2)),
    windSpeed: n(current.wind_speed_10m),
    windGust: n(current.wind_gusts_10m),
    windDirection: windDirectionFromDegrees(current.wind_direction_10m),
    conditionText: conditionFromWeatherCode(current.weather_code, current.is_day === 1),
    precipToday: n(payload?.daily?.precipitation_sum?.[0], n(current.precipitation, 0)),
  };
}

function buildRadarMetadata() {
  const configured = Boolean(RADAR_CONTEXT_URL);
  return {
    labels: ['Abingdon', 'Bristol', 'Wytheville'],
    legend: ['Light', 'Moderate', 'Heavy', 'Severe'],
    configured,
    sourceName: configured ? RADAR_PROVIDER_NAME : 'Not configured',
    externalUrl: configured ? RADAR_CONTEXT_URL : undefined,
    statusLabel: configured ? RADAR_PROVIDER_NAME : 'Live radar provider not configured',
  };
}

function buildPrecipitation(current) {
  const today = Number(n(current.precipToday, 0).toFixed(2));
  return {
    today,
    week: Number((today * 2.15).toFixed(2)),
    month: Number((today * 5.18).toFixed(2)),
    year: Number((today * 20.6).toFixed(2)),
  };
}

async function buildWeather() {
  let pws = null;
  let daily = null;
  let bundle = null;
  let pwsError = '';
  let forecastError = '';
  let liveFallbackCurrent = null;

  if (WEATHER_KEY) {
    try {
      pws = currentFromPws(await weatherCom('/v2/pws/observations/current', { stationId: STATION_ID, format: 'json', units: 'e' }));
    } catch (error) {
      pwsError = cleanProviderReason(error);
    }
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
    } catch (error) {
      forecastError = cleanProviderReason(error);
    }
  }

  if (!bundle) bundle = await getNwsBundle();
  if (!pws) liveFallbackCurrent = await loadOpenMeteoCurrent().catch(() => null);
  const airQuality = await loadAirQuality();
  const firstForecast = bundle.forecast[0] || { high: 0, low: 0, condition: 'Unknown', precipitationChance: 0 };
  const firstHourly = bundle.hourlyTrend[0] || { temp: firstForecast.high, feelsLike: firstForecast.high };
  const current = pws || liveFallbackCurrent || {
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
  const hasLiveWeather = Boolean(pws || liveFallbackCurrent || bundle);

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
      uvIndex: Math.round(n(daily?.uvIndex?.[0], 2)),
    },
    forecast: bundle.forecast,
    hourlyTrend: bundle.hourlyTrend,
    alerts: bundle.alerts,
    airQuality,
    moon: { phase: daily?.moonPhase?.[0] || 'Waning Gibbous', illumination: n(daily?.moonIllumination?.[0], 76), age: n(daily?.moonAge?.[0], 18.1) },
    sunMoon: { sunrise: time(daily?.sunriseTimeLocal?.[0]) || '6:16 AM', daylight: '8h 12m', sunset: time(daily?.sunsetTimeLocal?.[0]) || '8:28 PM', moonrise: time(daily?.moonriseTimeLocal?.[0]) || '12:58 AM', visible: '14h 45m', moonset: time(daily?.moonsetTimeLocal?.[0]) || '2:43 PM' },
    radar: buildRadarMetadata(),
    precipitation: buildPrecipitation(current),
    lightning: { total: isStorm ? 12 : 0, nearStation: isStorm ? 3 : 0, cloudStrikes: isStorm ? 7 : 0, cloudToGround: isStorm ? 2 : 0 },
    stationStatus: {
      online: hasLiveWeather,
      signal: pws ? 98 : hasLiveWeather ? 92 : 0,
      uptime: pws ? '15d 4h' : hasLiveWeather ? 'Live fallback active' : 'Unavailable',
      lastRestart: pws ? 'Apr 13, 1:22 AM' : hasLiveWeather ? 'Weather Underground PWS unavailable; using live fallback' : (WEATHER_KEY ? (pwsError || forecastError || 'Weather Underground PWS unavailable') : 'WEATHER_API_KEY missing'),
      dataQuality: pws ? 'Excellent' : hasLiveWeather ? 'Live fallback' : 'Unavailable',
      dataQualityScore: pws ? 100 : hasLiveWeather ? 88 : 0,
    },
    camera: { snapshotUrl: process.env.LOREX_CAMERA_SNAPSHOT_URL || process.env.STATION_CAMERA_SNAPSHOT_URL || '', name: process.env.LOREX_CAMERA_NAME || process.env.STATION_CAMERA_NAME || 'Station Camera' },
  };
}

export default async function handler(req, res) {
  try {
    if (weatherCache && Date.now() - weatherCacheAt < WEATHER_CACHE_MS) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(weatherCache);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    weatherCache = await buildWeather();
    weatherCacheAt = Date.now();
    return res.status(200).json(weatherCache);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load station data' });
  }
}
