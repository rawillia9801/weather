export default function handler(_req, res) {
  const serviceKey = envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SERVICE_KEY') || envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE');
  const anonKey = envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envValue('VITE_SUPABASE_ANON_KEY') || envValue('SUPABASE_ANON_KEY');
  const supabaseUrl = supabaseProjectUrl();
  res.status(200).json({
    ok: true,
    stationId: process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42',
    provider: 'weather-underground-pws',
    supabase: {
      urlConfigured: Boolean(supabaseUrl),
      serviceKeyConfigured: Boolean(serviceKey),
      serviceKeySegments: jwtSegments(serviceKey),
      anonKeyConfigured: Boolean(anonKey),
      anonKeySegments: jwtSegments(anonKey),
      readConfigured: Boolean(supabaseUrl && (serviceKey || anonKey)),
      writeConfigured: Boolean(supabaseUrl && serviceKey && jwtSegments(serviceKey) === 3),
    },
  });
}

function envValue(name) {
  return process.env[name]?.trim();
}

function supabaseProjectUrl() {
  const raw =
    envValue('SUPABASE_URL') ||
    envValue('NEXT_PUBLIC_SUPABASE_URL') ||
    envValue('VITE_SUPABASE_URL') ||
    envValue('SUPABASE_API_URL') ||
    envValue('NEXT_PUBLIC_SUPABASE_API_URL') ||
    envValue('VITE_SUPABASE_API_URL');
  if (!raw) return '';
  return raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

function jwtSegments(value) {
  if (!value) return 0;
  return value.split('.').length;
}
