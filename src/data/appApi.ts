export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export interface AppConfig {
  supabaseConfigured: boolean;
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
