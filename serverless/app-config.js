const cfg = {
  stationId: process.env.STATION_ID || process.env.WEATHER_UNDERGROUND_STATION_ID || 'KVAMARIO42',
  stationName: process.env.STATION_NAME || 'Staley Street Weather',
  locationName: process.env.STATION_LOCATION || 'Marion, Virginia',
  latitude: Number(process.env.LATITUDE || process.env.STATION_LAT || 36.8348),
  longitude: Number(process.env.LONGITUDE || process.env.STATION_LON || -81.5148),
  timeZone: process.env.REPORT_TIME_ZONE || process.env.TZ || 'America/New_York',
  supabaseUrl: supabaseProjectUrl(),
  supabaseServiceRoleKey: envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SERVICE_KEY') || envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE'),
  supabaseAnonKey: envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envValue('VITE_SUPABASE_ANON_KEY') || envValue('SUPABASE_ANON_KEY'),
  weatherKey: process.env.WEATHER_API_KEY,
  cameraUrl: process.env.LOREX_CAMERA_SNAPSHOT_URL || process.env.STATION_CAMERA_SNAPSHOT_URL || process.env.STATION_CAMERA_URL || '',
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL || process.env.ALERT_EMAIL,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioApiKeySecret: process.env.TWILIO_API_KEY_SECRET,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
};

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
  return value ? value.split('.').length : 0;
}

function supabaseCanRead() {
  return Boolean(cfg.supabaseUrl && (cfg.supabaseServiceRoleKey || cfg.supabaseAnonKey));
}

function supabaseCanWrite() {
  return Boolean(cfg.supabaseUrl && cfg.supabaseServiceRoleKey && jwtSegments(cfg.supabaseServiceRoleKey) === 3);
}

const fallback = {
  station_settings: {
    station_name: cfg.stationName,
    station_id: cfg.stationId,
    location_name: cfg.locationName,
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    elevation_ft: 1476,
    primary_weather_source: cfg.weatherKey ? 'Weather Underground PWS' : 'National Weather Service',
    refresh_interval_seconds: 120,
    stale_threshold_minutes: 10,
    timezone: cfg.timeZone,
  },
  contacts: [],
  daily_brief_schedules: [
    {
      enabled: false,
      send_time_local: '07:00',
      timezone: cfg.timeZone,
      email_enabled: true,
      sms_enabled: false,
      subject_template: 'Staley Street Weather Daily Brief - Marion, VA - {{date}}',
      include_html_email: true,
      include_text_email: true,
      include_sms_summary: true,
    },
  ],
  alert_thresholds: {
    wind_gust_mph: 35,
    rain_rate_in_per_hr: 1,
    rain_today_in: 2,
    nearby_lightning_miles: 10,
    freeze_temp_f: 32,
    heat_temp_f: 95,
    aqi_threshold: 100,
    uv_threshold: 8,
    pressure_drop_inhg: 0.12,
    stale_data_minutes: 10,
  },
  display_preferences: {
    temperature_unit: 'F',
    wind_unit: 'mph',
    pressure_unit: 'inHg',
    rain_unit: 'in',
    time_format: '12h',
    theme_intensity: 'cinematic',
    dashboard_density: 'compact',
    reduced_motion: false,
    show_unavailable_panels: true,
  },
  integration_status: [],
  daily_brief_send_logs: [],
  notification_events: [],
};

function configured() {
  return supabaseCanRead();
}

async function supabaseRest(table, query = {}) {
  if (!configured()) return [];
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const primaryKey = supabaseCanWrite() ? cfg.supabaseServiceRoleKey : cfg.supabaseAnonKey;
  const response = await fetchSupabase(url, primaryKey);
  if (!response.ok && primaryKey !== cfg.supabaseAnonKey && cfg.supabaseAnonKey) {
    const anonResponse = await fetchSupabase(url, cfg.supabaseAnonKey);
    if (!anonResponse.ok) return [];
    return anonResponse.json().catch(() => []);
  }
  if (!response.ok) return [];
  return response.json().catch(() => []);
}

function fetchSupabase(url, key) {
  return fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
}

function first(rows, fallbackValue) {
  return Array.isArray(rows) && rows.length ? rows[0] : fallbackValue;
}

function integrationStatus(rows) {
  const names = ['Weather Underground PWS', 'Forecast source', 'UV source', 'AQI source', 'Radar source', 'Camera source', 'Supabase', 'Resend', 'Twilio'];
  const existing = new Map((rows || []).map((row) => [row.integration_name, row]));
  return names.map((name) => existing.get(name) || {
    integration_name: name,
    configured:
      name === 'Weather Underground PWS' ? Boolean(cfg.weatherKey) :
      name === 'Forecast source' ? true :
      name === 'Camera source' ? Boolean(cfg.cameraUrl) :
      name === 'Supabase' ? supabaseCanRead() :
      name === 'Resend' ? Boolean(cfg.resendApiKey && cfg.resendFromEmail) :
      name === 'Twilio' ? Boolean((cfg.twilioAuthToken || cfg.twilioApiKeySecret) && (cfg.twilioFromNumber || cfg.twilioMessagingServiceSid)) :
      false,
    last_success_at: null,
    last_error_at: null,
    last_error_message: null,
  });
}

export default async function handler(req, res) {
  try {
    const [stationRows, contacts, schedules, thresholdRows, preferenceRows, integrations, logs, events] = await Promise.all([
      supabaseRest('station_settings', { select: '*', limit: 1 }),
      supabaseRest('contacts', { select: '*' }),
      supabaseRest('daily_brief_schedules', { select: '*' }),
      supabaseRest('alert_thresholds', { select: '*', limit: 1 }),
      supabaseRest('display_preferences', { select: '*', limit: 1 }),
      supabaseRest('integration_status', { select: '*' }),
      supabaseRest('daily_brief_send_logs', { select: '*', order: 'created_at.desc', limit: 20 }),
      supabaseRest('notification_events', { select: '*', order: 'created_at.desc', limit: 50 }),
    ]);

    res.status(200).json({
      supabaseConfigured: configured(),
      supabaseStatus: {
        readConfigured: supabaseCanRead(),
        writeConfigured: supabaseCanWrite(),
        urlConfigured: Boolean(cfg.supabaseUrl),
        serviceRoleConfigured: Boolean(cfg.supabaseServiceRoleKey),
        serviceRoleSegments: jwtSegments(cfg.supabaseServiceRoleKey),
        anonConfigured: Boolean(cfg.supabaseAnonKey),
        anonSegments: jwtSegments(cfg.supabaseAnonKey),
      },
      deliveryConfigured: {
        resend: Boolean(cfg.resendApiKey && cfg.resendFromEmail),
        twilio: Boolean((cfg.twilioAuthToken || cfg.twilioApiKeySecret) && (cfg.twilioFromNumber || cfg.twilioMessagingServiceSid)),
      },
      cameraConfigured: Boolean(cfg.cameraUrl),
      station_settings: first(stationRows, fallback.station_settings),
      contacts: contacts.length ? contacts : fallback.contacts,
      daily_brief_schedules: schedules.length ? schedules : fallback.daily_brief_schedules,
      alert_thresholds: first(thresholdRows, fallback.alert_thresholds),
      display_preferences: first(preferenceRows, fallback.display_preferences),
      integration_status: integrationStatus(integrations),
      daily_brief_send_logs: logs,
      notification_events: events,
    });
  } catch (error) {
    res.status(200).json({
      supabaseConfigured: false,
      supabaseStatus: {
        readConfigured: supabaseCanRead(),
        writeConfigured: supabaseCanWrite(),
        urlConfigured: Boolean(cfg.supabaseUrl),
        serviceRoleConfigured: Boolean(cfg.supabaseServiceRoleKey),
        serviceRoleSegments: jwtSegments(cfg.supabaseServiceRoleKey),
        anonConfigured: Boolean(cfg.supabaseAnonKey),
        anonSegments: jwtSegments(cfg.supabaseAnonKey),
      },
      deliveryConfigured: { resend: Boolean(cfg.resendApiKey && cfg.resendFromEmail), twilio: Boolean((cfg.twilioAuthToken || cfg.twilioApiKeySecret) && (cfg.twilioFromNumber || cfg.twilioMessagingServiceSid)) },
      cameraConfigured: Boolean(cfg.cameraUrl),
      ...fallback,
      integration_status: integrationStatus([]),
    });
  }
}
