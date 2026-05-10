const stationId = process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42';
const latitude = Number(process.env.LATITUDE || process.env.STATION_LAT || 36.8348);
const longitude = Number(process.env.LONGITUDE || process.env.STATION_LON || -81.5148);

function hasValue(name) {
  return Boolean(process.env[name]?.trim());
}

export default async function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    stationId,
    lat: latitude,
    lon: longitude,
    hasWeatherApiKey: hasValue('WEATHER_API_KEY') || hasValue('WEATHER_UNDERGROUND_API_KEY'),
    hasAirNowApiKey: hasValue('AIRNOW_API_KEY'),
    hasXweatherKey: hasValue('XWEATHER_CLIENT_ID') && hasValue('XWEATHER_CLIENT_SECRET'),
    primaryWeatherSource: 'Weather Underground PWS',
    forecastSource: 'Weather.com, then NWS, then Open-Meteo fallback',
    aqiSource: hasValue('AIRNOW_API_KEY') ? 'AirNow official AQI' : 'Open-Meteo air quality fallback',
    radarSource: hasValue('RADAR_CONTEXT_URL') ? (process.env.RADAR_PROVIDER_NAME || 'Configured radar provider') : 'NOAA/NWS radar context',
    uvSource: 'Weather.com, then Open-Meteo UV fallback',
    lightningSource: hasValue('XWEATHER_CLIENT_ID') && hasValue('XWEATHER_CLIENT_SECRET') ? 'Xweather configured' : 'not configured',
    notes: 'Provider status and fallback reasons are exposed on /api/weather as dataSource.errors without returning secrets.',
  });
}
