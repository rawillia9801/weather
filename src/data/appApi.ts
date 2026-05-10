import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SUPABASE_URL = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_API_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_API_URL ||
    '',
);
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const STATION_ID = import.meta.env.VITE_STATION_ID || 'KVAMARIO42';

let supabaseClient: SupabaseClient | null = null;

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const response = await fetch(apiUrl(path), { headers: { Accept: 'application/json' } });
    const payload = await readJsonResponse(response, path);
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    return payload;
  } catch (error) {
    if (path === '/api/app-config') return getSupabaseAppConfig() as Promise<T>;
    throw error;
  }
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  try {
    const response = await fetch(apiUrl(path), {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await readJsonResponse(response, path);
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    return payload;
  } catch (error) {
    throw error;
  }
}

async function readJsonResponse(response: Response, path: string) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(`${path} returned non-JSON (${response.status} ${response.statusText}): ${preview}`);
  }
}

export interface AppConfig {
  supabaseConfigured: boolean;
  supabaseStatus?: {
    readConfigured: boolean;
    writeConfigured: boolean;
    urlConfigured: boolean;
    serviceRoleConfigured: boolean;
    serviceRoleSegments: number;
    anonConfigured: boolean;
    anonSegments: number;
  };
  deliveryConfigured: { resend: boolean; twilio: boolean };
  cameraConfigured: boolean;
  station_settings: Record<string, unknown>;
  contacts: Contact[];
  daily_brief_schedules: Record<string, unknown>[];
  alert_thresholds: Record<string, unknown>;
  display_preferences: Record<string, unknown>;
  integration_status: IntegrationStatus[];
  daily_brief_send_logs: Record<string, unknown>[];
  notification_events: Record<string, unknown>[];
}

function normalizeSupabaseUrl(value: string) {
  return value.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

export interface Contact {
  id?: string;
  display_name: string;
  email?: string | null;
  phone_e164?: string | null;
  email_enabled: boolean;
  sms_enabled: boolean;
  is_primary: boolean;
  notes?: string | null;
}

export interface IntegrationStatus {
  integration_name: string;
  configured: boolean;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
}

export interface DailyBriefPreview {
  subject: string;
  generatedAt: string;
  text: string;
  html: string;
  sms: string;
  contacts: Contact[];
  deliveryConfigured: { resend: boolean; twilio: boolean };
  logs: Record<string, unknown>[];
}

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase public URL and anon key are not configured for this browser build.');
  }
  if (!supabaseClient) supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

async function selectRows<T>(table: string, fallback: T, query?: (request: any) => any): Promise<T> {
  try {
    const supabase = getSupabase();
    const request = query ? query(supabase.from(table).select('*')) : supabase.from(table).select('*');
    const { data, error } = await request;
    if (error) throw error;
    return (data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function getSupabaseAppConfig(): Promise<AppConfig> {
  const [stationRows, contacts, schedules, thresholdRows, preferenceRows, integrations, logs, events] = await Promise.all([
    selectRows<Record<string, unknown>[]>('station_settings', [], (request) => request.limit(1)),
    selectRows<Contact[]>('contacts', []),
    selectRows<Record<string, unknown>[]>('daily_brief_schedules', []),
    selectRows<Record<string, unknown>[]>('alert_thresholds', [], (request) => request.limit(1)),
    selectRows<Record<string, unknown>[]>('display_preferences', [], (request) => request.limit(1)),
    selectRows<IntegrationStatus[]>('integration_status', []),
    selectRows<Record<string, unknown>[]>('daily_brief_send_logs', [], (request) => request.order('created_at', { ascending: false }).limit(20)),
    selectRows<Record<string, unknown>[]>('notification_events', [], (request) => request.order('created_at', { ascending: false }).limit(50)),
  ]);

  return {
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    supabaseStatus: {
      readConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
      writeConfigured: false,
      urlConfigured: Boolean(SUPABASE_URL),
      serviceRoleConfigured: false,
      serviceRoleSegments: 0,
      anonConfigured: Boolean(SUPABASE_ANON_KEY),
      anonSegments: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.split('.').length : 0,
    },
    deliveryConfigured: {
      resend: integrationConfigured(integrations, 'Resend'),
      twilio: integrationConfigured(integrations, 'Twilio'),
    },
    cameraConfigured: integrationConfigured(integrations, 'Camera source'),
    station_settings: first(stationRows, {
      station_name: 'Staley Street Weather',
      station_id: STATION_ID,
      location_name: 'Marion, Virginia',
      primary_weather_source: 'Weather Underground PWS',
      timezone: 'America/New_York',
    }),
    contacts,
    daily_brief_schedules: schedules,
    alert_thresholds: first(thresholdRows, {}),
    display_preferences: first(preferenceRows, {}),
    integration_status: mergeIntegrationStatus(integrations),
    daily_brief_send_logs: logs,
    notification_events: events,
  };
}

function first<T>(rows: T[], fallback: T) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : fallback;
}

function integrationConfigured(rows: IntegrationStatus[], name: string) {
  return Boolean(rows.find((row) => row.integration_name === name && row.configured));
}

function mergeIntegrationStatus(rows: IntegrationStatus[]) {
  const names = ['Weather Underground PWS', 'Forecast source', 'UV source', 'AQI source', 'Radar source', 'Camera source', 'Supabase', 'Resend', 'Twilio'];
  return names.map((name) => {
    const fallbackConfigured = name === 'Forecast source' || name === 'UV source' || name === 'AQI source' || name === 'Radar source' || (name === 'Supabase' && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY));
    const fallbackLabel =
      name === 'UV source' ? 'Open-Meteo UV fallback active' :
      name === 'AQI source' ? 'Open-Meteo Air Quality fallback active' :
      name === 'Radar source' ? 'NOAA/NWS radar context active' :
      null;
    const row = rows.find((item) => item.integration_name === name);
    if (row) return { ...row, configured: Boolean(row.configured || fallbackConfigured), last_error_message: row.last_error_message || fallbackLabel };
    return {
    integration_name: name,
    configured: fallbackConfigured,
    last_success_at: null,
    last_error_at: null,
    last_error_message: fallbackLabel,
    };
  });
}
