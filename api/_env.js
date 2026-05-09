export function envValue(name) {
  return process.env[name]?.trim();
}

export function supabaseProjectUrl() {
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

export const cfg = {
  stationId: envValue('STATION_ID') || envValue('WEATHER_UNDERGROUND_STATION_ID') || 'KVAMARIO42',
  stationName: envValue('STATION_NAME') || 'Staley Street Weather',
  locationName: envValue('STATION_LOCATION') || 'Marion, Virginia',
  timeZone: envValue('REPORT_TIME_ZONE') || envValue('TZ') || 'America/New_York',
  supabaseUrl: supabaseProjectUrl(),
  supabaseServiceRoleKey: envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SERVICE_KEY') || envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE'),
  supabaseAnonKey: envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envValue('VITE_SUPABASE_ANON_KEY') || envValue('SUPABASE_ANON_KEY'),
  resendApiKey: envValue('RESEND_API_KEY'),
  resendFromEmail: envValue('RESEND_FROM_EMAIL') || envValue('ALERT_EMAIL') || 'hello@staleyclimate.info',
  twilioAccountSid: envValue('TWILIO_ACCOUNT_SID'),
  twilioApiKeySid: envValue('TWILIO_API_KEY_SID'),
  twilioApiKeySecret: envValue('TWILIO_API_KEY_SECRET'),
  twilioFromNumber: envValue('TWILIO_FROM_NUMBER'),
};

export function jwtSegments(value) {
  return value ? value.split('.').length : 0;
}

export function supabaseCanWrite() {
  return Boolean(cfg.supabaseUrl && cfg.supabaseServiceRoleKey && jwtSegments(cfg.supabaseServiceRoleKey) === 3);
}
