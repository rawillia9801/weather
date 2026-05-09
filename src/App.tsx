import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AlertTriangle, Camera, CloudLightning, Copy, Download, LockKeyhole, Mail, MapPin, MessageSquare, Plus, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchWeatherStationData } from './data/weatherStationApi';
import { apiGet, apiSend, type AppConfig, type Contact, type DailyBriefPreview } from './data/appApi';
import type { WeatherCondition, WeatherStationData } from './types/weather';
import { allConditions, getConditionTheme } from './lib/weatherThemes';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AlertBar } from './components/weather/AlertBar';
import { CurrentConditions } from './components/weather/CurrentConditions';
import { ForecastStrip } from './components/weather/ForecastStrip';
import { MoonPanel } from './components/weather/MoonPanel';
import { RadarPanel } from './components/weather/RadarPanel';
import { AirQualityPanel } from './components/weather/AirQualityPanel';
import { SunMoonPanel } from './components/weather/SunMoonPanel';
import { TemperatureTrend } from './components/weather/TemperatureTrend';
import { StationDetails } from './components/weather/StationDetails';
import { PrecipitationPanel } from './components/weather/PrecipitationPanel';
import { LightningPanel } from './components/weather/LightningPanel';
import { StationCamera } from './components/weather/StationCamera';
import { GlassCard } from './components/ui/GlassCard';

const emptyContact: Contact = {
  display_name: '',
  email: '',
  phone_e164: '',
  email_enabled: true,
  sms_enabled: false,
  is_primary: false,
  notes: '',
};

const controlsPassword = import.meta.env.VITE_CONTROLS_PASSWORD || '1234';
const controlsSessionKey = 'staley-controls-unlocked';
const historyLatitude = Number(import.meta.env.VITE_LATITUDE || 36.8348);
const historyLongitude = Number(import.meta.env.VITE_LONGITUDE || -81.5148);
const historyTimeZone = import.meta.env.VITE_REPORT_TIME_ZONE || 'America/New_York';

type PwsDailySummary = {
  date: string;
  stationId: string;
  obsTimeLocal: string;
  humidityAvg: number | null;
  humidityHigh: number | null;
  humidityLow: number | null;
  uvHigh: number | null;
  tempHigh: number | null;
  tempLow: number | null;
  tempAvg: number | null;
  windSpeedAvg: number | null;
  windSpeedHigh: number | null;
  windGustHigh: number | null;
  pressureMax: number | null;
  pressureMin: number | null;
  precipTotal: number | null;
};

type PwsHistoryResponse = {
  source: string;
  stationId: string;
  generatedAt: string;
  summaries: PwsDailySummary[];
  fallbackReason?: string;
};

function useStationData() {
  const [data, setData] = useState<WeatherStationData | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const weather = await fetchWeatherStationData();
      let appConfig: AppConfig | null = null;
      try {
        appConfig = await apiGet<AppConfig>('/api/app-config');
      } catch (configError) {
        console.warn(configError);
      }
      setData(weather);
      setConfig(appConfig);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load station data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 120000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data && error && !loading) {
      const retry = window.setTimeout(load, 3500);
      return () => window.clearTimeout(retry);
    }
  }, [data, error, loading]);

  return { data, config, error, loading, reload: load };
}

function AppShell() {
  const { data, config, error, loading, reload } = useStationData();
  const [previewCondition, setPreviewCondition] = useState<WeatherCondition | ''>('');
  const activeCondition = (import.meta.env.DEV && previewCondition) || data?.current.condition || 'Unknown';
  const pageTheme = useMemo(() => getConditionTheme(activeCondition), [activeCondition]);

  if (loading && !data) {
    return (
      <main className="loading-screen" style={{ background: pageTheme.gradient }}>
        <CloudLightning className="h-16 w-16 text-cyan-300" />
        <div>
          <h1>Staley Street Weather</h1>
          <p>Connecting to live station KVAMARIO42...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="loading-screen error-screen">
        <CloudLightning className="h-16 w-16 text-amber-300" />
        <div>
          <h1>Station Data Offline</h1>
          <p>{error}</p>
          <button className="retry-button" onClick={reload} type="button">
            <RefreshCw className="h-4 w-4" />
            Retry live station
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <div className="app-shell" data-condition={activeCondition} style={{ '--condition-accent': pageTheme.accent } as React.CSSProperties}>
      <div className="global-atmosphere" />
      <Sidebar status={data.stationStatus} />
      <main className="main-dashboard">
        <Header station={data.station} clock={data.clock} />
        <MobileNav />
        {import.meta.env.DEV && (
          <div className="dev-condition-select" aria-label="Development condition theme preview">
            <select value={previewCondition} onChange={(event) => setPreviewCondition(event.target.value as WeatherCondition | '')}>
              <option value="">Live condition</option>
              {allConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
            </select>
            <RefreshCw className="h-4 w-4" />
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage data={data} condition={activeCondition} />} />
          <Route path="/history" element={<ControlsGate><HistoryPage data={data} /></ControlsGate>} />
          <Route path="/alarms" element={<ControlsGate><AlarmsPage data={data} config={config} /></ControlsGate>} />
          <Route path="/reports" element={<ControlsGate><ReportsPage data={data} config={config} reloadConfig={reload} /></ControlsGate>} />
          <Route path="/maps" element={<ControlsGate><MapsPage data={data} config={config} /></ControlsGate>} />
          <Route path="/cameras" element={<ControlsGate><CamerasPage data={data} config={config} /></ControlsGate>} />
          <Route path="/settings" element={<ControlsGate><SettingsPage data={data} config={config} reload={reload} /></ControlsGate>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ControlsGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(controlsSessionKey) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password === controlsPassword) {
      sessionStorage.setItem(controlsSessionKey, 'true');
      setUnlocked(true);
      setError('');
      return;
    }
    setError('Incorrect password');
  }

  if (unlocked) return <>{children}</>;

  return (
    <section className="control-lock-screen">
      <GlassCard className="control-lock-card">
        <div className="control-lock-icon">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <div>
          <div className="panel-kicker">Protected Controls</div>
          <h2>Enter Controls Password</h2>
          <p>Dashboard viewing is public. Control tabs require a simple passcode.</p>
          <form onSubmit={unlock} className="control-lock-form">
            <label htmlFor="controls-password">Password</label>
            <input
              id="controls-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus
            />
            {error && <span role="alert">{error}</span>}
            <button type="submit">
              <LockKeyhole className="h-4 w-4" />
              Unlock Controls
            </button>
          </form>
        </div>
      </GlassCard>
    </section>
  );
}

function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {['dashboard', 'history', 'alarms', 'reports', 'maps', 'cameras', 'settings'].map((item) => (
        <NavLink key={item} to={`/${item}`}>{item}</NavLink>
      ))}
    </nav>
  );
}

function DashboardPage({ data, condition }: { data: WeatherStationData; condition: WeatherCondition }) {
  return (
    <>
      <AlertBar alerts={data.alerts} />
      <section className="dashboard-grid">
        <div className="hero-area">
          <CurrentConditions current={data.current} />
        </div>
        <div className="forecast-area"><ForecastStrip forecast={data.forecast} /></div>
        <div className="moon-area"><MoonPanel moon={data.moon} /></div>
        <RadarPanel radar={data.radar} />
        <AirQualityPanel airQuality={data.airQuality} />
        <SunMoonPanel data={data.sunMoon} />
        <TemperatureTrend data={data.hourlyTrend} />
        <StationDetails station={data.station} />
        <PrecipitationPanel precipitation={data.precipitation} />
        <LightningPanel lightning={data.lightning} />
        <StationCamera condition={condition} snapshotUrl={data.camera.snapshotUrl} name={data.camera.name} />
      </section>
    </>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function Unavailable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="page-card unavailable-card">
      <AlertTriangle className="h-6 w-6 text-amber-300" />
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </GlassCard>
  );
}

function HistoryPage({ data }: { data: WeatherStationData }) {
  const [history, setHistory] = useState<PwsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadHistory() {
    try {
      setLoading(true);
      setError('');
      setHistory(await apiGet<PwsHistoryResponse>('/api/history'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load Weather Underground PWS history';
      try {
        setHistory(await fetchPublicHistoryFallback(data, message));
        setError('');
      } catch {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const summaries = history?.summaries || [];
  const summaryCards = summaries.length
    ? [
        ['Highest temperature', formatNumber(maxValue(summaries, 'tempHigh'), 'F')],
        ['Lowest temperature', formatNumber(minValue(summaries, 'tempLow'), 'F')],
        ['Peak wind gust', formatNumber(maxValue(summaries, 'windGustHigh'), 'mph')],
        ['7-day rainfall', formatNumber(sumValue(summaries, 'precipTotal'), 'in', 2)],
        ['Highest humidity', formatNumber(maxValue(summaries, 'humidityHigh'), '%')],
        ['Lowest pressure', formatNumber(minValue(summaries, 'pressureMin'), 'inHg', 2)],
      ]
    : [
        ['Highest temperature', `${Math.max(...data.hourlyTrend.map((p) => p.temp))}F`],
        ['Lowest temperature', `${Math.min(...data.hourlyTrend.map((p) => p.temp))}F`],
        ['Peak wind gust', `${data.current.windGust} mph`],
        ['Rainfall today', `${data.precipitation.today.toFixed(2)} in`],
        ['Current humidity', `${data.current.humidity}%`],
        ['Current pressure', `${data.current.pressure} inHg`],
      ];

  return (
    <section className="page-view">
      <PageHeader title="Station History" subtitle={`Historical observations from Staley Street Weather - ${data.station.id}`} />
      <div className="history-toolbar">
        <div>
          <strong>Weather Underground PWS Daily Summary</strong>
          <span>{history ? `${history.source} • ${formatDateTime(history.generatedAt)}` : 'Loading 7-day station archive...'}</span>
          {history?.fallbackReason && <span className="history-fallback-note">PWS history route unavailable. Showing public archive fallback.</span>}
        </div>
        <button type="button" onClick={loadHistory} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          {loading ? 'Refreshing' : 'Refresh History'}
        </button>
      </div>
      <div className="page-grid three">
        {summaryCards.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
      </div>
      {summaries.length > 0 ? (
        <>
          <HistoryCharts summaries={summaries} />
          <HistoryTable summaries={summaries} />
        </>
      ) : (
        <>
          <TemperatureTrend data={data.hourlyTrend} />
          <Unavailable title={error ? 'Weather Underground history unavailable' : 'Loading historical archive'}>
            {error || 'The 7-day Weather Underground PWS daily summary is loading. Live hourly trend is shown until the archive responds.'}
          </Unavailable>
        </>
      )}
    </section>
  );
}

async function fetchPublicHistoryFallback(data: WeatherStationData, fallbackReason: string): Promise<PwsHistoryResponse> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(historyLatitude));
  url.searchParams.set('longitude', String(historyLongitude));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', historyTimeZone);
  url.searchParams.set('past_days', '7');
  url.searchParams.set('forecast_days', '1');

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Public history fallback failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const daily = payload.daily || {};
  const times: string[] = (daily.time || []).slice(-7);
  const summaries = times.map((date, index) => {
    const sourceIndex = (daily.time || []).length - times.length + index;
    return {
      date,
      stationId: data.station.id,
      obsTimeLocal: `${date} 23:59:59`,
      obsTimeUtc: new Date(`${date}T23:59:59`).toISOString(),
      humidityAvg: index === times.length - 1 ? data.current.humidity : null,
      humidityHigh: index === times.length - 1 ? data.current.humidity : null,
      humidityLow: index === times.length - 1 ? data.current.humidity : null,
      uvHigh: null,
      tempHigh: asNullableNumber(daily.temperature_2m_max?.[sourceIndex]),
      tempLow: asNullableNumber(daily.temperature_2m_min?.[sourceIndex]),
      tempAvg: asNullableNumber(daily.temperature_2m_mean?.[sourceIndex]),
      windSpeedAvg: null,
      windSpeedHigh: asNullableNumber(daily.wind_speed_10m_max?.[sourceIndex]),
      windGustHigh: asNullableNumber(daily.wind_gusts_10m_max?.[sourceIndex]),
      pressureMax: index === times.length - 1 ? data.current.pressure : null,
      pressureMin: index === times.length - 1 ? data.current.pressure : null,
      precipTotal: asNullableNumber(daily.precipitation_sum?.[sourceIndex]),
    };
  });

  return {
    source: 'Open-Meteo public archive fallback',
    stationId: data.station.id,
    generatedAt: new Date().toISOString(),
    fallbackReason,
    summaries,
  };
}

function asNullableNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numericValues(rows: PwsDailySummary[], key: keyof PwsDailySummary) {
  return rows.reduce<number[]>((values, row) => {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
    return values;
  }, []);
}

function maxValue(rows: PwsDailySummary[], key: keyof PwsDailySummary) {
  const values = numericValues(rows, key);
  return values.length ? Math.max(...values) : null;
}

function minValue(rows: PwsDailySummary[], key: keyof PwsDailySummary) {
  const values = numericValues(rows, key);
  return values.length ? Math.min(...values) : null;
}

function sumValue(rows: PwsDailySummary[], key: keyof PwsDailySummary) {
  const values = numericValues(rows, key);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function formatNumber(value: number | null, unit = '', digits = 0) {
  if (value == null) return 'Unavailable';
  if (unit === '%' || unit === 'F') return `${value.toFixed(digits)}${unit}`;
  return `${value.toFixed(digits)} ${unit}`.trim();
}

function formatHistoryDate(value: string) {
  if (!value) return 'Unavailable';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Updated time unavailable';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function HistoryCharts({ summaries }: { summaries: PwsDailySummary[] }) {
  const chartData = summaries.map((summary) => ({
    day: formatHistoryDate(summary.date).replace(',', ''),
    high: summary.tempHigh,
    low: summary.tempLow,
    avg: summary.tempAvg,
    rain: summary.precipTotal,
    gust: summary.windGustHigh,
    humidity: summary.humidityAvg,
  }));

  return (
    <div className="history-chart-grid">
      <GlassCard className="page-card history-chart-card">
        <h3>7-Day Temperature</h3>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
            <XAxis dataKey="day" stroke="rgba(226,232,240,.58)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(226,232,240,.58)" fontSize={11} tickLine={false} axisLine={false} width={38} />
            <Tooltip contentStyle={{ background: '#06111e', border: '1px solid rgba(34,211,238,.35)', borderRadius: 10, color: '#fff' }} />
            <Line type="monotone" dataKey="high" stroke="#fb923c" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="avg" stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="low" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
      <GlassCard className="page-card history-chart-card">
        <h3>Rain, Gusts & Humidity</h3>
        <ResponsiveContainer width="100%" height={210}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
            <XAxis dataKey="day" stroke="rgba(226,232,240,.58)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(226,232,240,.58)" fontSize={11} tickLine={false} axisLine={false} width={38} />
            <Tooltip contentStyle={{ background: '#06111e', border: '1px solid rgba(34,211,238,.35)', borderRadius: 10, color: '#fff' }} />
            <Bar dataKey="rain" fill="#22d3ee" radius={[5, 5, 0, 0]} />
            <Line type="monotone" dataKey="gust" stroke="#fbbf24" strokeWidth={2} connectNulls />
            <Line type="monotone" dataKey="humidity" stroke="#4ade80" strokeWidth={2} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}

function HistoryTable({ summaries }: { summaries: PwsDailySummary[] }) {
  return (
    <GlassCard className="page-card history-table-card">
      <div className="history-table-title">
        <h3>Daily Observations</h3>
        <span>{summaries.length} Weather Underground PWS summaries</span>
      </div>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>High</th>
              <th>Low</th>
              <th>Avg</th>
              <th>Humidity</th>
              <th>Rain</th>
              <th>Wind/Gust</th>
              <th>Pressure</th>
              <th>UV</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={`${summary.stationId}-${summary.date}`}>
                <td>{formatHistoryDate(summary.date)}</td>
                <td>{formatNumber(summary.tempHigh, 'F')}</td>
                <td>{formatNumber(summary.tempLow, 'F')}</td>
                <td>{formatNumber(summary.tempAvg, 'F')}</td>
                <td>{formatNumber(summary.humidityAvg, '%')}</td>
                <td>{formatNumber(summary.precipTotal, 'in', 2)}</td>
                <td>{formatNumber(summary.windSpeedAvg, 'mph')} / {formatNumber(summary.windGustHigh, 'mph')}</td>
                <td>{formatNumber(summary.pressureMin, 'inHg', 2)} - {formatNumber(summary.pressureMax, 'inHg', 2)}</td>
                <td>{formatNumber(summary.uvHigh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function AlarmsPage({ data, config }: { data: WeatherStationData; config: AppConfig | null }) {
  const thresholds = config?.alert_thresholds || {};
  const alarms = [
    ['Station online', data.stationStatus.online ? 'OK' : 'Critical', data.stationStatus.online ? 'Online' : 'Offline'],
    ['Data quality', data.stationStatus.dataQualityScore >= 90 ? 'OK' : 'Warning', `${data.stationStatus.dataQualityScore}%`],
    ['Wind gust threshold', data.current.windGust >= Number(thresholds.wind_gust_mph || 35) ? 'Warning' : 'OK', `${data.current.windGust} mph / ${thresholds.wind_gust_mph || 35}`],
    ['Freeze threshold', data.current.temperature <= Number(thresholds.freeze_temp_f || 32) ? 'Warning' : 'OK', `${data.current.temperature}F / ${thresholds.freeze_temp_f || 32}`],
    ['UV threshold', data.current.uvIndex >= Number(thresholds.uv_threshold || 8) ? 'Warning' : 'OK', `${data.current.uvIndex} / ${thresholds.uv_threshold || 8}`],
  ];
  return (
    <section className="page-view">
      <PageHeader title="Alarms" subtitle="Weather alerts, station alarms, and threshold notifications for Marion, Virginia." />
      <AlertBar alerts={data.alerts} />
      <div className="page-grid three">
        {alarms.map(([label, status, value]) => <AlarmCard key={label} label={label} status={status} value={value} />)}
      </div>
      <GlassCard className="page-card">
        <h3>Notification History</h3>
        <EventList rows={config?.notification_events || []} empty="No Supabase notification events have been recorded yet." />
      </GlassCard>
    </section>
  );
}

function ReportsPage({ data, config, reloadConfig }: { data: WeatherStationData; config: AppConfig | null; reloadConfig: () => Promise<void> }) {
  const [brief, setBrief] = useState<DailyBriefPreview | null>(null);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  async function refreshBrief() {
    setStatus('');
    setBrief(await apiGet<DailyBriefPreview>('/api/daily-brief/preview'));
  }

  useEffect(() => { refreshBrief().catch((error) => setStatus(error.message)); }, []);

  async function sendNow() {
    try {
      setSending(true);
      setStatus('');
      const result = await apiSend('/api/daily-brief/send', 'POST', { subject: brief?.subject });
      setStatus(`Send completed: ${JSON.stringify(result)}`);
      await reloadConfig();
      await refreshBrief();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  const contacts = config?.contacts || [];
  const canEmail = Boolean(brief?.deliveryConfigured.resend && contacts.some((c) => c.email_enabled && c.email));
  const canSms = Boolean(brief?.deliveryConfigured.twilio && contacts.some((c) => c.sms_enabled && c.phone_e164));

  return (
    <section className="page-view">
      <PageHeader title="Reports" subtitle="Daily briefs, weather summaries, planning reports, and station exports." />
      <div className="report-strip">
        {['Daily Brief', 'Weekly Summary', 'Monthly Summary', 'Rain Report', 'Wind Report', 'Temperature Report', 'Station Health Report', 'Export Data'].map((label, index) => (
          <button key={label} className={index === 0 ? 'active' : ''} type="button">{label}{index !== 0 && <small>Coming soon</small>}</button>
        ))}
      </div>
      <GlassCard className="page-card brief-card">
        <div className="brief-toolbar">
          <div>
            <div className="panel-kicker">Live personal weather station</div>
            <h3>Staley Street Weather Daily Brief</h3>
          </div>
          <div className="button-row">
            <button onClick={refreshBrief} type="button"><RefreshCw className="h-4 w-4" /> Refresh Brief</button>
            <button onClick={() => navigator.clipboard.writeText(brief?.text || '')} disabled={!brief} type="button"><Copy className="h-4 w-4" /> Copy Text</button>
            <DownloadButton filename="staley-daily-brief.txt" content={brief?.text || ''} label="TXT" />
            <DownloadButton filename="staley-daily-brief.html" content={brief?.html || ''} label="HTML" />
            <button onClick={sendNow} disabled={sending || (!canEmail && !canSms)} type="button"><Send className="h-4 w-4" /> Send Now</button>
          </div>
        </div>
        {status && <div className="status-line">{status}</div>}
        {!canEmail && <p className="config-note"><Mail className="h-4 w-4" /> Email delivery requires Resend configuration and at least one email-enabled Supabase contact.</p>}
        {!canSms && <p className="config-note"><MessageSquare className="h-4 w-4" /> SMS delivery requires Twilio configuration and at least one SMS-enabled E.164 contact.</p>}
        {brief && (
          <div className="brief-preview-grid">
            <article>
              <h4>HTML Preview</h4>
              <iframe title="Daily brief HTML preview" srcDoc={brief.html} />
            </article>
            <article>
              <h4>Plain Text</h4>
              <pre>{brief.text}</pre>
            </article>
            <article>
              <h4>SMS Summary</h4>
              <p>{brief.sms}</p>
            </article>
          </div>
        )}
      </GlassCard>
      <GlassCard className="page-card">
        <h3>Delivery Logs</h3>
        <EventList rows={brief?.logs || config?.daily_brief_send_logs || []} empty="No daily brief send logs found in Supabase." />
      </GlassCard>
    </section>
  );
}

function DownloadButton({ filename, content, label }: { filename: string; content: string; label: string }) {
  function download() {
    const blob = new Blob([content], { type: filename.endsWith('.html') ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  return <button onClick={download} disabled={!content} type="button"><Download className="h-4 w-4" /> {label}</button>;
}

function MapsPage({ data, config }: { data: WeatherStationData; config: AppConfig | null }) {
  return (
    <section className="page-view">
      <PageHeader title="Maps" subtitle="Station location, regional context, and weather map layers." />
      <div className="page-grid two">
        <GlassCard className="page-card">
          <h3>Station Location</h3>
          <p><MapPin className="inline h-4 w-4 text-cyan-300" /> {data.station.location}</p>
          <p>{data.station.latitude}, {data.station.longitude}</p>
          <p>Elevation {data.station.elevation}</p>
        </GlassCard>
        <Unavailable title="Map provider not configured">
          Add map provider settings in Supabase to enable live radar, alert, rain, wind, temperature, and nearby-place layers. Current radar on the dashboard is labeled as a visual panel, not a live map layer.
        </Unavailable>
      </div>
      <IntegrationGrid rows={config?.integration_status || []} />
    </section>
  );
}

function CamerasPage({ data, config }: { data: WeatherStationData; config: AppConfig | null }) {
  const [stamp, setStamp] = useState(Date.now());
  const url = data.camera.snapshotUrl ? `${data.camera.snapshotUrl}${data.camera.snapshotUrl.includes('?') ? '&' : '?'}t=${stamp}` : '';
  return (
    <section className="page-view">
      <PageHeader title="Cameras" subtitle="Live station camera and recent snapshots." />
      <GlassCard className="page-card camera-view-card">
        <div className="brief-toolbar">
          <h3>{data.camera.name}</h3>
          <div className="button-row">
            <button onClick={() => setStamp(Date.now())} disabled={!url} type="button"><RefreshCw className="h-4 w-4" /> Refresh</button>
            {data.camera.snapshotUrl && <a href={data.camera.snapshotUrl} target="_blank" rel="noreferrer">Open External</a>}
          </div>
        </div>
        {config?.cameraConfigured && url ? <img src={url} alt={data.camera.name} /> : <Unavailable title="Station camera feed is not configured">Add a camera URL in Settings or server environment.</Unavailable>}
      </GlassCard>
    </section>
  );
}

function SettingsPage({ data, config, reload }: { data: WeatherStationData; config: AppConfig | null; reload: () => Promise<void> }) {
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [message, setMessage] = useState('');

  async function saveContact(event: React.FormEvent) {
    event.preventDefault();
    try {
      await apiSend('/api/contacts', 'POST', contact);
      setContact(emptyContact);
      setMessage('Contact saved to Supabase.');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save contact');
    }
  }

  async function deleteContact(id?: string) {
    if (!id) return;
    await apiSend(`/api/contacts/${id}`, 'DELETE');
    await reload();
  }

  return (
    <section className="page-view">
      <PageHeader title="Settings" subtitle="Station configuration, contacts, delivery preferences, integrations, and alert thresholds." />
      {!config?.supabaseConfigured && <Unavailable title="Supabase persistence is not configured">Add Supabase URL and service role key to the backend environment. Real settings are not stored in localStorage.</Unavailable>}
      <div className="page-grid two">
        <GlassCard className="page-card settings-card">
          <h3>Station Settings</h3>
          <SettingsRows rows={[
            ['Station name', String(config?.station_settings.station_name || data.station.name)],
            ['Station ID', String(config?.station_settings.station_id || data.station.id)],
            ['Location', String(config?.station_settings.location_name || data.station.location)],
            ['Latitude', String(config?.station_settings.latitude || '')],
            ['Longitude', String(config?.station_settings.longitude || '')],
            ['Weather source', String(config?.station_settings.primary_weather_source || 'Weather Underground PWS')],
            ['Timezone', String(config?.station_settings.timezone || 'America/New_York')],
          ]} />
        </GlassCard>
        <GlassCard className="page-card settings-card">
          <h3>Add Contact</h3>
          <form className="settings-form" onSubmit={saveContact}>
            <input value={contact.display_name} onChange={(e) => setContact({ ...contact, display_name: e.target.value })} placeholder="Display name" required />
            <input value={contact.email || ''} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="Email address" type="email" />
            <input value={contact.phone_e164 || ''} onChange={(e) => setContact({ ...contact, phone_e164: e.target.value })} placeholder="+15405551212" pattern="^\\+[1-9]\\d{7,14}$" />
            <label><input type="checkbox" checked={contact.email_enabled} onChange={(e) => setContact({ ...contact, email_enabled: e.target.checked })} /> Email enabled</label>
            <label><input type="checkbox" checked={contact.sms_enabled} onChange={(e) => setContact({ ...contact, sms_enabled: e.target.checked })} /> SMS enabled</label>
            <label><input type="checkbox" checked={contact.is_primary} onChange={(e) => setContact({ ...contact, is_primary: e.target.checked })} /> Primary contact</label>
            <button type="submit"><Plus className="h-4 w-4" /> Save Contact</button>
          </form>
          {message && <div className="status-line">{message}</div>}
        </GlassCard>
      </div>
      <GlassCard className="page-card">
        <h3>Contacts</h3>
        <div className="contact-list">
          {(config?.contacts || []).map((row) => (
            <div key={row.id || row.email || row.display_name} className="contact-row">
              <strong>{row.display_name}</strong>
              <span>{row.email || 'No email'}</span>
              <span>{row.phone_e164 || 'No SMS'}</span>
              <span>{row.email_enabled ? 'Email on' : 'Email off'} / {row.sms_enabled ? 'SMS on' : 'SMS off'}</span>
              <button onClick={() => deleteContact(row.id)} type="button"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!config?.contacts?.length && <p>No Supabase contacts configured yet.</p>}
        </div>
      </GlassCard>
      <div className="page-grid two">
        <GlassCard className="page-card settings-card">
          <h3>Daily Brief Delivery</h3>
          <SettingsRows rows={[
            ['Enabled', String(config?.daily_brief_schedules?.[0]?.enabled ?? false)],
            ['Send time', String(config?.daily_brief_schedules?.[0]?.send_time_local || '07:00')],
            ['Timezone', String(config?.daily_brief_schedules?.[0]?.timezone || 'America/New_York')],
            ['Email', config?.deliveryConfigured.resend ? 'Configured' : 'Resend required'],
            ['SMS', config?.deliveryConfigured.twilio ? 'Configured' : 'Twilio required'],
            ['Scheduler', 'Requires Supabase scheduled function/cron invocation'],
          ]} />
        </GlassCard>
        <GlassCard className="page-card settings-card">
          <h3>Alert Thresholds</h3>
          <SettingsRows rows={Object.entries(config?.alert_thresholds || {}).map(([key, value]) => [key.replace(/_/g, ' '), String(value)])} />
        </GlassCard>
      </div>
      <IntegrationGrid rows={config?.integration_status || []} />
    </section>
  );
}

function SettingsRows({ rows }: { rows: string[][] }) {
  return <div className="settings-rows">{rows.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <GlassCard className="page-card stat-card"><span>{label}</span><strong>{value}</strong></GlassCard>;
}

function AlarmCard({ label, status, value }: { label: string; status: string; value: string }) {
  return <GlassCard className={`page-card alarm-card ${status.toLowerCase()}`}><span>{label}</span><strong>{status}</strong><small>{value}</small></GlassCard>;
}

function EventList({ rows, empty }: { rows: Record<string, unknown>[]; empty: string }) {
  if (!rows.length) return <p>{empty}</p>;
  return <div className="event-list">{rows.map((row, index) => <pre key={String(row.id || index)}>{JSON.stringify(row, null, 2)}</pre>)}</div>;
}

function IntegrationGrid({ rows }: { rows: { integration_name: string; configured: boolean; last_error_message?: string | null }[] }) {
  return (
    <div className="page-grid three">
      {rows.map((row) => (
        <GlassCard key={row.integration_name} className="page-card integration-card">
          <span>{row.integration_name}</span>
          <strong className={row.configured ? 'ok' : 'missing'}>{row.configured ? 'Configured' : 'Not configured'}</strong>
          {row.last_error_message && <small>{row.last_error_message}</small>}
        </GlassCard>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
