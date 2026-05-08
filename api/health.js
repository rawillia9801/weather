export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    stationId: process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42',
    provider: 'weather-underground-pws',
  });
}
