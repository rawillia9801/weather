create extension if not exists pgcrypto;

create table if not exists station_settings (
  id uuid primary key default gen_random_uuid(),
  station_name text not null default 'Staley Street Weather',
  station_id text not null default 'KVAMARIO42',
  location_name text not null default 'Marion, Virginia',
  latitude numeric,
  longitude numeric,
  elevation_ft integer,
  primary_weather_source text default 'Weather Underground PWS',
  refresh_interval_seconds integer default 120,
  stale_threshold_minutes integer default 10,
  timezone text default 'America/New_York',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text,
  phone_e164 text,
  email_enabled boolean default false,
  sms_enabled boolean default false,
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint contacts_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contacts_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create table if not exists daily_brief_schedules (
  id uuid primary key default gen_random_uuid(),
  enabled boolean default false,
  send_time_local time default '07:00',
  timezone text default 'America/New_York',
  email_enabled boolean default true,
  sms_enabled boolean default false,
  subject_template text default 'Staley Street Weather Daily Brief - Marion, VA - {{date}}',
  include_html_email boolean default true,
  include_text_email boolean default true,
  include_sms_summary boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_brief_recipients (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references daily_brief_schedules(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  delivery_email boolean default true,
  delivery_sms boolean default false,
  created_at timestamptz default now()
);

create table if not exists alert_thresholds (
  id uuid primary key default gen_random_uuid(),
  wind_gust_mph numeric default 35,
  rain_rate_in_per_hr numeric default 1,
  rain_today_in numeric default 2,
  nearby_lightning_miles numeric default 10,
  freeze_temp_f numeric default 32,
  heat_temp_f numeric default 95,
  aqi_threshold numeric default 100,
  uv_threshold numeric default 8,
  pressure_drop_inhg numeric default 0.12,
  stale_data_minutes integer default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists display_preferences (
  id uuid primary key default gen_random_uuid(),
  temperature_unit text default 'F',
  wind_unit text default 'mph',
  pressure_unit text default 'inHg',
  rain_unit text default 'in',
  time_format text default '12h',
  theme_intensity text default 'cinematic',
  dashboard_density text default 'compact',
  reduced_motion boolean default false,
  show_unavailable_panels boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists integration_status (
  id uuid primary key default gen_random_uuid(),
  integration_name text not null unique,
  configured boolean default false,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_brief_send_logs (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz,
  sent_at timestamptz,
  status text,
  channel text,
  recipient_contact_id uuid,
  recipient_value text,
  subject text,
  error_message text,
  resend_message_id text,
  twilio_message_sid text,
  created_at timestamptz default now()
);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  severity text,
  title text,
  message text,
  source text,
  triggered_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
