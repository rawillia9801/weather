create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.daily_brief_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  channel text not null check (channel in ('email_html', 'email_text', 'sms')),
  template_body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists daily_brief_templates_active_channel_idx
on public.daily_brief_templates(channel)
where is_active = true;

create table if not exists public.local_event_cache (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_url text,
  title text not null,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  description text,
  fetched_at timestamptz not null default now(),
  raw jsonb
);

create index if not exists local_event_cache_starts_at_idx
on public.local_event_cache(starts_at);

create table if not exists public.sky_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null,
  starts_at timestamptz,
  peaks_at timestamptz,
  ends_at timestamptz,
  source_name text,
  source_url text,
  description text,
  visible_from text,
  created_at timestamptz not null default now()
);

create index if not exists sky_events_peaks_at_idx
on public.sky_events(peaks_at);

create table if not exists public.weather_source_status (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  configured boolean not null default false,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  last_payload jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists weather_source_status_source_name_idx
on public.weather_source_status(source_name);

select cron.schedule(
  'send-staley-daily-brief-7am',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://staleyclimate.info/api/cron/daily-brief',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('trigger', 'supabase_cron', 'timezone', 'America/New_York')
  );
  $$
);
