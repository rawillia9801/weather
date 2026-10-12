import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Download, FileText, Mail, MessageSquare, RefreshCw, Save, Send } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeatherStationData } from '../../types/weather';
import { apiGet, apiSend, type AppConfig, type DailyBriefPreview, type DailyBriefTemplate } from '../../data/appApi';
import { downloadWeatherReportPdf, type WeatherReport, type ReportMetric } from '../../lib/reportPdf';
import { GlassCard } from '../ui/GlassCard';

const REPORT_TABS = [
  'Daily Brief', 'Weekly Summary', 'Monthly Summary', 'Rain Report',
  'Wind Report', 'Temperature Report', 'Station Health Report', 'Export Data',
] as const;
type ReportTab = typeof REPORT_TABS[number];

type Summary = {
  date: string;
  stationId: string;
  tempHigh: number | null;
  tempLow: number | null;
  tempAvg: number | null;
  humidityAvg: number | null;
  precipTotal: number | null;
  windSpeedAvg: number | null;
  windSpeedHigh: number | null;
  windGustHigh: number | null;
  pressureMin: number | null;
  pressureMax: number | null;
  uvHigh: number | null;
};
type History = {
  source: string;
  stationId: string;
  generatedAt: string;
  summaries: Summary[];
  fallbackReason?: string;
};

const formatValue = (value: number | null | undefined, digits = 1, unit = '') =>
  value == null || !Number.isFinite(value) ? 'Unavailable' : `${value.toFixed(digits)}${unit ? ' ' + unit : ''}`;
const sumNumbers = (rows: Summary[], key: keyof Summary) => {
  const values = rows.map(row => row[key]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
};
const extremes = (rows: Summary[], key: keyof Summary, mode: 'min' | 'max') => {
  const values = rows.map(row => row[key]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return values.length ? (mode === 'min' ? Math.min(...values) : Math.max(...values)) : null;
};
const average = (rows: Summary[], key: keyof Summary) => {
  const valid = rows.filter(row => typeof row[key] === 'number' && Number.isFinite(row[key] as number));
  const total = sumNumbers(valid, key);
  return total == null || !valid.length ? null : total / valid.length;
};
const localDate = (stamp: string) => {
  const date = new Date(stamp + 'T12:00:00');
  return Number.isNaN(date.getTime()) ? stamp : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const dateRange = (rows: Summary[]) => rows.length ? `${localDate(rows[0].date)} – ${localDate(rows[rows.length - 1].date)} (${rows.length} days)` : 'No historical period available';
const metric = (label: string, value: string): ReportMetric => ({ label, value });

function reportFor(tab: ReportTab, data: WeatherStationData, weekly: History | null, monthly: History | null, brief: DailyBriefPreview | null): WeatherReport | null {
  const now = new Date().toISOString();
  const historic = tab === 'Weekly Summary' ? weekly : monthly;
  const rows = (historic?.summaries || []).filter(row => row?.date).sort((a, b) => a.date.localeCompare(b.date));
  const snapshot = {
    title: tab,
    subtitle: 'Live personal weather station | Marion, Virginia',
    location: data.station.location,
    station: data.station.id,
    generatedAt: now,
    period: 'Current station snapshot',
    source: data.dataSource?.current || (data.stationStatus.online ? 'Weather Underground PWS' : 'Public weather fallback'),
    metrics: [] as ReportMetric[],
    notes: [] as string[],
    columns: [] as string[],
    rows: [] as string[][],
  };

  if (tab === 'Daily Brief') {
    if (!brief) return null;
    return {
      ...snapshot,
      title: 'Daily Weather Brief',
      subtitle: 'Daily weather, forecast, alerts and local conditions',
      period: new Date(brief.generatedAt).toLocaleDateString('en-US', { dateStyle: 'full' }),
      source: `${snapshot.source}; daily forecast and supporting sources supplied by live brief service`,
      metrics: [
        metric('Temperature', formatValue(data.current.temperature, 1, 'F')),
        metric('Feels like', formatValue(data.current.feelsLike, 1, 'F')),
        metric('Wind', formatValue(data.current.windSpeed, 0, 'mph')),
        metric('Humidity', formatValue(data.current.humidity, 0, '%')),
        metric('Rain today', formatValue(data.precipitation.today, 2, 'in')),
        metric('Active alerts', String(data.alerts.length)),
      ],
      notes: (brief.text || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean),
      columns: ['Day', 'Conditions', 'High', 'Low', 'Rain chance'],
      rows: data.forecast.map(day => [day.day, day.condition, `${day.high} F`, `${day.low} F`, `${day.precipitationChance}%`]),
    };
  }

  if (tab === 'Station Health Report') {
    return {
      ...snapshot,
      title: 'Station Health Report',
      subtitle: 'Connectivity, signal, source status and alert-feed monitoring',
      metrics: [
        metric('Station', data.stationStatus.online ? 'ONLINE' : 'FALLBACK'),
        metric('Signal', formatValue(data.stationStatus.signal, 0, '%')),
        metric('Data quality', data.stationStatus.dataQuality),
        metric('Quality score', formatValue(data.stationStatus.dataQualityScore, 0, '%')),
        metric('Active NWS alerts', String(data.alerts.length)),
        metric('Alert feed', (data.alertFeedStatus || 'Not reported').toUpperCase()),
      ],
      notes: [
        `Last update: ${new Date(data.clock).toLocaleString('en-US')}. Uptime: ${data.stationStatus.uptime}. Last restart: ${data.stationStatus.lastRestart}.`,
        'Source availability is assessed from the weather API. This report does not imply that unconfigured hardware is connected.',
        ...(data.dataSource?.errors || []).map(e => `${e.source}: ${e.message}`),
      ],
      columns: ['Service', 'Reported status'],
      rows: [
        ['Live observations', data.dataSource?.current || 'Not reported'],
        ['Forecast', data.dataSource?.forecast || 'Not reported'],
        ['Air quality', data.dataSource?.aqi || 'Not reported'],
        ['Radar', data.dataSource?.radar || 'Not reported'],
        ['UV', data.dataSource?.uv || 'Not reported'],
        ['Lightning', data.dataSource?.lightning || 'Not reported'],
        ['NWS active alerts', data.alertFeedStatus || 'Not reported'],
      ],
    };
  }

  if (!historic || !rows.length) return null;
  const base = { ...snapshot, period: dateRange(rows), source: historic.source };
  const wetDays = rows.filter(row => row.precipTotal != null && row.precipTotal >= .01).length;
  const historicalTable = (keys: Array<[string, (row: Summary) => string]>) => ({
    columns: ['Date', ...keys.map(k => k[0])],
    rows: rows.map(row => [localDate(row.date), ...keys.map(k => k[1](row))]),
  });
  const rainTotal = sumNumbers(rows, 'precipTotal');
  const rainData = historicalTable([
    ['Rain (in)', row => formatValue(row.precipTotal, 2)],
    ['High (F)', row => formatValue(row.tempHigh, 0)],
    ['Gust (mph)', row => formatValue(row.windGustHigh, 0)],
  ]);
  const tempData = historicalTable([
    ['High (F)', row => formatValue(row.tempHigh, 0)],
    ['Low (F)', row => formatValue(row.tempLow, 0)],
    ['Average (F)', row => formatValue(row.tempAvg, 0)],
  ]);
  const windData = historicalTable([
    ['Peak gust (mph)', row => formatValue(row.windGustHigh, 0)],
    ['Max wind (mph)', row => formatValue(row.windSpeedHigh, 0)],
    ['Rain (in)', row => formatValue(row.precipTotal, 2)],
  ]);
  const summaryMetrics = [
    metric('Total rainfall', formatValue(rainTotal, 2, 'in')),
    metric('Highest high', formatValue(extremes(rows, 'tempHigh', 'max'), 0, 'F')),
    metric('Lowest low', formatValue(extremes(rows, 'tempLow', 'min'), 0, 'F')),
    metric('Peak gust', formatValue(extremes(rows, 'windGustHigh', 'max'), 0, 'mph')),
    metric('Rain days', String(wetDays)),
    metric('Days returned', String(rows.length)),
  ];
  const sourceNotes = [
    `Historical source: ${historic.source}. Values represent the exact available reporting days and are not invented.`,
    ...(historic.fallbackReason ? [`Station archive unavailable: ${historic.fallbackReason}. Showing clearly identified public history instead.`] : []),
  ];
  if (tab === 'Weekly Summary' || tab === 'Monthly Summary' || tab === 'Export Data') {
    return {
      ...base,
      title: tab === 'Export Data' ? 'Station Data Export' : tab === 'Monthly Summary' ? '30-Day Weather Summary' : 'Weekly Weather Summary',
      subtitle: tab === 'Export Data' ? 'Portable report of live station conditions and available historical readings' : 'Daily highs, lows, rainfall, wind and event totals',
      metrics: summaryMetrics,
      notes: [
        `Highest observed daily temperature: ${formatValue(extremes(rows, 'tempHigh', 'max'), 0, 'F')}. Lowest: ${formatValue(extremes(rows, 'tempLow', 'min'), 0, 'F')}. Total reported precipitation: ${formatValue(rainTotal, 2, 'in')}.`,
        ...(tab === 'Export Data' ? [`Current conditions: ${data.current.temperature} F, ${data.current.condition}; humidity ${data.current.humidity}%; wind ${data.current.windSpeed} mph. Most recent observation: ${data.clock}.`] : []),
        ...sourceNotes,
      ],
      ...historicalTable([
        ['High', row => formatValue(row.tempHigh, 0)],
        ['Low', row => formatValue(row.tempLow, 0)],
        ['Rain', row => formatValue(row.precipTotal, 2)],
        ['Gust', row => formatValue(row.windGustHigh, 0)],
      ]),
      chart: { label: 'Daily precipitation (inches)', values: rows.map(r => r.precipTotal), labels: rows.map(r => localDate(r.date)), unit: 'in' },
    };
  }
  if (tab === 'Rain Report') {
    return {
      ...base,
      title: 'Precipitation Report',
      subtitle: 'Rain accumulation, wet days and daily precipitation',
      metrics: [
        metric('Period rain', formatValue(rainTotal, 2, 'in')),
        metric('Wettest day', formatValue(extremes(rows, 'precipTotal', 'max'), 2, 'in')),
        metric('Rain days', String(wetDays)),
        metric('Today (live)', formatValue(data.precipitation.today, 2, 'in')),
      ],
      notes: [...sourceNotes, 'Rain days are calendar days with at least 0.01 inch recorded by the specified data provider. Current station rain is separate from the historical source.'],
      ...rainData,
      chart: { label: 'Daily precipitation (inches)', values: rows.map(r => r.precipTotal), labels: rows.map(r => localDate(r.date)), unit: 'in' },
    };
  }
  if (tab === 'Wind Report') {
    return {
      ...base,
      title: 'Wind and Gust Report',
      subtitle: 'Daily peak gusts, sustained wind maxima, and current winds',
      metrics: [
        metric('Highest gust', formatValue(extremes(rows, 'windGustHigh', 'max'), 0, 'mph')),
        metric('Mean daily peak gust', formatValue(average(rows, 'windGustHigh'), 1, 'mph')),
        metric('Live wind', formatValue(data.current.windSpeed, 0, 'mph')),
        metric('Live gust', formatValue(data.current.windGust, 0, 'mph')),
      ],
      notes: [...sourceNotes, 'Average daily peak gust is the average of available daily maximum gust readings, not a sustained wind speed.'],
      ...windData,
      chart: { label: 'Daily maximum gust (mph)', values: rows.map(r => r.windGustHigh), labels: rows.map(r => localDate(r.date)), unit: 'mph' },
    };
  }
  return {
    ...base,
    title: 'Temperature Report',
    subtitle: 'Daily maximum, minimum and mean temperatures',
    metrics: [
      metric('Warmest day', formatValue(extremes(rows, 'tempHigh', 'max'), 0, 'F')),
      metric('Coldest low', formatValue(extremes(rows, 'tempLow', 'min'), 0, 'F')),
      metric('Average daily mean', formatValue(average(rows, 'tempAvg'), 1, 'F')),
      metric('Current temp', formatValue(data.current.temperature, 1, 'F')),
    ],
    notes: sourceNotes,
    ...tempData,
    chart: { label: 'Daily high temperature (F)', values: rows.map(r => r.tempHigh), labels: rows.map(r => localDate(r.date)), unit: 'F' },
  };
}

export function ReportsHub({ data, config, reloadConfig }: { data: WeatherStationData; config: AppConfig | null; reloadConfig: () => Promise<void> }) {
  const [active, setActive] = useState<ReportTab>('Daily Brief');
  const [brief, setBrief] = useState<DailyBriefPreview | null>(null);
  const [template, setTemplate] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState('');
  const [templateWritable, setTemplateWritable] = useState(false);
  const [weekly, setWeekly] = useState<History | null>(null);
  const [monthly, setMonthly] = useState<History | null>(null);
  const [historyError, setHistoryError] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setHistoryError([]);
    const jobs = await Promise.allSettled([
      apiGet<DailyBriefPreview>('/api/daily-brief/preview'),
      apiGet<DailyBriefTemplate>('/api/daily-brief/template'),
      apiGet<History>('/api/history'),
      apiGet<History>('/api/report-history'),
    ]);
    const errors: string[] = [];
    if (jobs[0].status === 'fulfilled') setBrief(jobs[0].value);
    else errors.push('Daily brief preview could not be loaded.');
    if (jobs[1].status === 'fulfilled') {
      const saved = jobs[1].value;
      setTemplate(saved.template.template_body || (jobs[0].status === 'fulfilled' ? jobs[0].value.text : ''));
      setDefaultTemplate(saved.defaultTemplate || '');
      setTemplateWritable(Boolean(saved.writable));
    } else errors.push('Daily brief template could not be loaded.');
    if (jobs[2].status === 'fulfilled' && jobs[2].value.summaries?.length) setWeekly(jobs[2].value);
    else { setWeekly(null); errors.push('7-day station archive is currently unavailable.'); }
    if (jobs[3].status === 'fulfilled' && jobs[3].value.summaries?.length) setMonthly(jobs[3].value);
    else { setMonthly(null); errors.push('30-day historical weather source is currently unavailable.'); }
    setHistoryError(errors);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);
  const report = useMemo(() => reportFor(active, data, weekly, monthly, brief), [active, data, weekly, monthly, brief]);
  const contacts = config?.contacts || [];
  const canEmail = Boolean(brief?.deliveryConfigured.smtp && contacts.some(c => c.email_enabled && c.email));
  const canSms = Boolean(brief?.deliveryConfigured.twilio && contacts.some(c => c.sms_enabled && c.phone_e164));

  async function sendNow() {
    try {
      setSending(true);
      setStatus('');
      const result = await apiSend<{ ok?: boolean; emailResults?: Array<{ ok: boolean; email: string; error?: string }> }>('/api/daily-brief/send', 'POST', { subject: brief?.subject });
      const attempted = result.emailResults?.length || 0;
      const success = result.emailResults?.filter(r => r.ok).length || 0;
      setStatus(`Email delivery: ${success} of ${attempted} accepted by the mail server.${result.ok ? '' : ' Please review delivery logs for errors.'}`);
      await reloadConfig();
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to send email');
    } finally {
      setSending(false);
    }
  }

  async function saveTemplate() {
    try {
      setStatus('');
      const result = await apiSend<DailyBriefTemplate>('/api/daily-brief/template', 'POST', { template_body: template });
      setTemplate(result.template.template_body);
      setTemplateWritable(Boolean(result.writable));
      setStatus('Daily brief template saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save template');
    }
  }

  function resetTemplate() {
    setTemplate(defaultTemplate || brief?.template || brief?.text || '');
    setStatus('Default restored in the editor. Use Save to persist.');
  }

  const chart = report?.chart;
  const chartData = chart?.values.map((value, i) => ({ day: chart.labels[i], value })) || [];

  return (
    <section className="page-view reports-hub">
      <div className="page-header">
        <h2>Weather Intelligence & Reports</h2>
        <p>Live station readings, historical climate trends, and print-ready PDF reporting.</p>
      </div>
      <nav className="report-strip reports-tabs" aria-label="Available weather reports">
        {REPORT_TABS.map(label => (
          <button key={label} type="button" aria-pressed={active === label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setStatus(''); }}>
            {label}
          </button>
        ))}
      </nav>
      <div className="reports-topline">
        <div><span className="report-source-indicator" /> {report?.source || 'Waiting for a verified weather source'} </div>
        <div className="button-row">
          <button disabled={loading} onClick={() => { void refresh(); }} type="button"><RefreshCw className="h-4 w-4" /> {loading ? 'Refreshing...' : 'Refresh Data'}</button>
          <button disabled={!report} onClick={() => { if (report) downloadWeatherReportPdf(report); }} type="button" className="report-pdf-button"><Download className="h-4 w-4" /> Export PDF</button>
        </div>
      </div>
      {status && <p role="status" className="status-line">{status}</p>}
      {active === 'Daily Brief' ? (
        <GlassCard className="page-card brief-card">
          <div className="brief-toolbar">
            <div>
              <div className="panel-kicker">Live personal weather station</div>
              <h3>Staley Street Weather Daily Brief</h3>
            </div>
            <div className="button-row">
              <button type="button" onClick={saveTemplate} disabled={!templateWritable || !template.trim()}><Save className="h-4 w-4" /> Save Template</button>
              <button type="button" onClick={resetTemplate} disabled={!brief}>Reset to Default</button>
              <button type="button" disabled={!brief?.text} onClick={() => { void navigator.clipboard.writeText(brief?.text || ''); }}><Copy className="h-4 w-4" /> Copy Text</button>
              <button type="button" disabled={!brief?.html} onClick={() => { void navigator.clipboard.writeText(brief?.html || ''); }}><Copy className="h-4 w-4" /> Copy HTML</button>
              <button type="button" disabled={!brief || sending || (!canEmail && !canSms)} onClick={() => { void sendNow(); }}><Send className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Now'}</button>
            </div>
          </div>
          {!canEmail && <p className="config-note"><Mail className="h-4 w-4" /> Email reports require configured SMTP and an enabled recipient.</p>}
          {!templateWritable && <p className="config-note"><AlertTriangle className="h-4 w-4" /> The report template cannot be saved until Supabase write access is available.</p>}
          {brief ? (
            <div className="brief-preview-grid">
              <article><h4>Designed HTML email preview</h4><iframe title="Weather brief HTML preview" srcDoc={brief.html} /></article>
              <article><h4>Editable daily brief template</h4><textarea value={template} onChange={event => setTemplate(event.target.value)} rows={18} aria-label="Daily weather brief template" /></article>
              <article><h4>SMS summary</h4><p>{brief.sms}</p><p className="reports-hint"><MessageSquare className="inline h-4 w-4" /> SMS is sent only when a compatible provider and recipient are enabled.</p></article>
            </div>
          ) : <p className="reports-no-data">{loading ? 'Loading the latest daily brief...' : 'Daily brief preview is not available at the moment.'}</p>}
        </GlassCard>
      ) : report ? (
        <>
          <GlassCard className="page-card reports-summary">
            <div className="reports-summary-heading">
              <div>
                <span className="panel-kicker">{report.period}</span>
                <h3>{report.title}</h3>
                <p>{report.subtitle}</p>
              </div>
              <FileText size={34} className="reports-summary-icon" />
            </div>
            <div className="reports-metrics">
              {report.metrics.map(item => <div className="reports-metric" key={item.label}><small>{item.label}</small><strong>{item.value}</strong></div>)}
            </div>
          </GlassCard>
          {chart && chartData.some(row => row.value != null) && (
            <GlassCard className="page-card reports-chart-card">
              <div className="reports-section-heading"><h3>{chart.label}</h3><span>{report.period}</span></div>
              <div className="reports-chart">
                <ResponsiveContainer width="100%" height={230}>
                  {active === 'Temperature Report' ? (
                    <LineChart data={chartData} margin={{ top: 16, right: 18, bottom: 3, left: 0 }}>
                      <CartesianGrid stroke="rgba(159,197,219,.14)" vertical={false} />
                      <XAxis dataKey="day" stroke="#9ab7ca" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="#9ab7ca" fontSize={10} width={45} unit={chart.unit} domain={['auto','auto']} />
                      <Tooltip contentStyle={{ background: '#092137', border: '1px solid #3d7998', borderRadius: 8, color: '#fff' }} />
                      <Line type="monotone" dataKey="value" stroke="#53c9ef" strokeWidth={2.5} dot={chartData.length <= 10} connectNulls={false} />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 16, right: 18, bottom: 3, left: 0 }}>
                      <CartesianGrid stroke="rgba(159,197,219,.14)" vertical={false} />
                      <XAxis dataKey="day" stroke="#9ab7ca" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="#9ab7ca" fontSize={10} width={45} unit={chart.unit} />
                      <Tooltip contentStyle={{ background: '#092137', border: '1px solid #3d7998', borderRadius: 8, color: '#fff' }} />
                      <Bar dataKey="value" fill="#36b7db" radius={[3,3,0,0]} maxBarSize={35} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
          <GlassCard className="page-card">
            <div className="reports-section-heading"><h3>Detailed Weather Readings</h3><span>{report.rows.length} verified days or services</span></div>
            <div className="reports-table-wrap">
              <table className="reports-data-table"><thead><tr>{report.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>
                {report.rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{value}</td>)}</tr>)}
              </tbody></table>
            </div>
          </GlassCard>
          <GlassCard className="page-card reports-notes">
            <h3>Sources and Report Notes</h3>
            {report.notes.map((note, i) => <p key={i}>{note}</p>)}
            <p><CheckCircle2 className="inline h-4 w-4 text-cyan-300" /> PDF exports include these notes, full details, reporting period, station identity, and page numbers.</p>
          </GlassCard>
        </>
      ) : (
        <GlassCard className="page-card">
          <div className="reports-no-data">
            <AlertTriangle size={26} className="text-amber-300" />
            <h3>{loading ? 'Gathering report data...' : 'Verified historical data is unavailable'}</h3>
            <p>{loading ? 'Reading the station history and public historical weather service.' : 'This report requires history from its named data provider. No sample or invented figures will be substituted.'}</p>
            <button type="button" disabled={loading} onClick={() => { void refresh(); }}><RefreshCw className="inline h-4 w-4" /> Retry data source</button>
          </div>
        </GlassCard>
      )}
      {historyError.length > 0 && <div className="reports-source-warnings">
        {historyError.map(message => <p key={message}><AlertTriangle className="inline h-4 w-4" /> {message}</p>)}
      </div>}
      {active === 'Daily Brief' && <GlassCard className="page-card"><h3>Daily Email Delivery Logs</h3><p className="reports-log-note">Existing configured email recipients receive reports through the station's scheduled email service.</p>
        <div className="reports-table-wrap"><table className="reports-data-table"><thead><tr><th>Sent</th><th>Status</th><th>Recipient</th><th>Result</th></tr></thead><tbody>
          {(brief?.logs || config?.daily_brief_send_logs || []).slice(0, 12).map((event, i) => <tr key={String(event.id || i)}><td>{String(event.sent_at || 'Unavailable')}</td><td>{String(event.status || 'Unknown')}</td><td>{String(event.recipient_value || 'Unavailable')}</td><td>{String(event.error_message || 'No error reported')}</td></tr>)}
        </tbody></table></div>
      </GlassCard>}
    </section>
  );
}
