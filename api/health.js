export default function handler(_req, res) {
  const serviceKey = envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SERVICE_KEY') || envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE');
  const anonKey = envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envValue('VITE_SUPABASE_ANON_KEY') || envValue('SUPABASE_ANON_KEY');
  res.status(200).json({
    ok: true,
    stationId: process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42',
    provider: 'weather-underground-pws',
    supabase: {
      urlConfigured: Boolean(envValue('SUPABASE_URL') || envValue('NEXT_PUBLIC_SUPABASE_URL') || envValue('VITE_SUPABASE_URL')),
      serviceKeyConfigured: Boolean(serviceKey),
      serviceKeySegments: jwtSegments(serviceKey),
      anonKeyConfigured: Boolean(anonKey),
      anonKeySegments: jwtSegments(anonKey),
    },
  });
}

function envValue(name) {
  return process.env[name]?.trim();
}

function jwtSegments(value) {
  if (!value) return 0;
  return value.split('.').length;
}
