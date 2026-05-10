import { cfg } from './_env.js';
import { logDelivery, safeSelect } from './_supabase.js';
import weatherHandler from './weather.js';

export const DEFAULT_TEXT_TEMPLATE = `Live personal weather station
Staley Street Weather Daily Brief

{{greeting}}

Right now in {{location}}, it is {{current.temperature}}F and {{current.condition}}, with a feels-like temperature of {{current.feelsLike}}F.

Station {{stationId}}
Updated {{updatedTime}}
Source: {{source}}

Today should reach about {{high}}F{{highTimeSummary}}, with a low near {{low}}F tonight. Winds are {{current.windDirection}} at {{current.windSpeed}} mph with gusts near {{current.windGust}} mph.

Rain chances today are {{today.precipChance}}%, with an estimated total of {{today.precipAmount}} inches.
{{precipTimingSummary}}

Air Quality
{{airQuality.summary}}

UV
Current {{current.uvIndex}}{{uvPeakSummary}}

Comfort Dashboard
Humidity {{current.humidity}}%
Pressure {{current.pressure}} inHg
{{comfortSummary}}

Five-Day Outlook

{{forecastText}}

Local Events
{{localEventsText}}

Sky Watch
{{skyEventsText}}

Rain And Ground Conditions
Rain today: {{rainToday}}. Ground estimate: {{groundCondition.label}}. {{groundCondition.summary}}

Hungry Mother State Park Water Conditions
{{waterCondition.waterTemp}}
{{waterCondition.measuredOrEstimatedNote}}
Surface: {{waterCondition.surface}}. Rain/clarity: {{waterCondition.clarityNote}}

Sun And Moon
Sunrise {{sunMoon.sunrise}}
Sunset {{sunMoon.sunset}}
Moon {{moon.phase}} {{moon.illumination}}%
{{moon.skyEvent}}

Alerts And Notes
{{alertsText}}

Station Status
Station is {{stationStatus.label}} with data quality {{stationStatus.dataQuality}}.`;

function absoluteBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || new URL(process.env.SITE_URL || 'https://www.staleyclimate.info').host;
  return `${proto}://${host}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${url} returned non-JSON (${response.status})`);
  }
  if (!response.ok) throw new Error(payload.message || payload.error || response.statusText);
  return payload;
}

async function loadWeather(req) {
  let statusCode = 200;
  let payload;
  const weatherReq = { ...req, method: 'GET', url: '/api/weather', headers: req.headers || {}, query: {} };
  const weatherRes = {
    setHeader() { return this; },
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
    end(body = '') {
      payload = body ? JSON.parse(String(body)) : {};
      return this;
    },
  };
  await weatherHandler(weatherReq, weatherRes);
  if (statusCode < 200 || statusCode > 299) {
    throw new Error(payload?.error || payload?.message || 'Weather route unavailable');
  }
  return payload;
}

export async function loadBriefInputs(req) {
  const [weather, contacts, schedules, logs] = await Promise.all([
    loadWeather(req).catch(async () => fetchJson(`${absoluteBaseUrl(req)}/api/weather`)),
    safeSelect('contacts', []),
    safeSelect('daily_brief_schedules', []),
    safeSelect('daily_brief_send_logs', [], { select: '*', order: 'created_at.desc', limit: 20 }),
  ]);
  const schedule = schedules[0] || {
    enabled: false,
    send_time_local: '07:00',
    timezone: cfg.timeZone,
    email_enabled: true,
    sms_enabled: false,
  };
  return { weather, contacts, schedule, logs };
}

export function buildDailyBriefData(weatherData, schedule = {}) {
  const current = weatherData.current;
  const firstForecast = weatherData.forecast?.[0] || {};
  const generatedAt = new Date().toISOString();
  return {
    stationId: weatherData.station.id,
    stationName: weatherData.station.name,
    location: weatherData.station.location,
    generatedAt,
    source: weatherData.stationStatus?.online ? 'Weather Underground PWS' : weatherData.stationStatus?.dataQuality || 'Weather source unavailable',
    updatedTime: new Date(weatherData.clock).toLocaleString('en-US', { timeZone: schedule.timezone || cfg.timeZone }),
    current,
    forecast: weatherData.forecast || [],
    alerts: weatherData.alerts || [],
    airQuality: weatherData.airQuality,
    moon: weatherData.moon,
    sunMoon: weatherData.sunMoon,
    stationStatus: weatherData.stationStatus,
    rainToday: `${Number(weatherData.precipitation?.today || 0).toFixed(2)} in`,
    high: firstForecast.high ?? current.high,
    low: firstForecast.low ?? current.low,
    highTimeSummary: ' around the warmest afternoon window',
    precipTimingSummary: precipitationTimingSummary(weatherData),
    localEventsText: 'No local events are configured for today.',
    skyEventsText: weatherData.moon?.skyEvent || 'No major sky events are configured for the next few days.',
    comfortSummary: generateComfortSummary(weatherData),
    groundCondition: estimateGroundConditions(weatherData),
    waterCondition: estimateHungryMotherWaterConditions(weatherData),
  };
}

function generateComfortSummary(data) {
  const c = data.current;
  const bits = [];
  bits.push(c.humidity >= 80 ? 'Very humid air will feel heavier than the temperature suggests.' : 'Humidity is in a manageable range for outdoor plans.');
  bits.push(c.windGust >= 20 ? 'Secure lightweight porch items before gusts pick up.' : 'Wind is not a major issue right now.');
  bits.push(c.uvIndex >= 6 ? 'Plan sun protection during brighter windows.' : 'UV is currently in a lower-risk range.');
  return bits.join(' ');
}

function estimateGroundConditions(data) {
  const rain = Number(data.precipitation?.today || 0);
  if (rain >= 1) return { label: 'Wet', summary: 'Ground is likely saturated with puddles and soft spots.' };
  if (rain >= 0.2 || /rain|showers/i.test(data.current.condition)) return { label: 'Damp', summary: 'Ground is likely damp with slick surfaces in shaded areas.' };
  return { label: 'Drying', summary: 'Ground conditions look generally usable, with normal caution in low areas.' };
}

function estimateHungryMotherWaterConditions(data) {
  const low = data.current.low ?? data.current.temperature;
  const temp = Math.round((data.current.temperature + low) / 2 - 4);
  return {
    waterTemp: `${temp}F estimated`,
    measuredOrEstimatedNote: 'Estimated from nearby station temperature trend and daily lows.',
    surface: data.current.windGust >= 18 ? 'Choppy' : data.current.windSpeed >= 8 ? 'Light ripple' : 'Calm',
    clarityNote: Number(data.precipitation?.today || 0) > 0.4 ? 'Recent rain may reduce clarity near inflows.' : 'No major rain impact indicated.',
  };
}

export function briefSubject(data) {
  const date = new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: cfg.timeZone });
  return `Staley Street Weather Daily Brief - Marion, VA - ${date}`;
}

function greetingFor(contact) {
  const name = String(contact?.display_name || '').trim();
  return name ? `Good Morning, ${name} — here’s your daily weather brief.` : "Good Morning — here’s your daily weather brief.";
}

function precipitationTimingSummary(data) {
  const today = data.forecast?.[0] || {};
  const amount = Number(today.precipitationAmount || 0);
  const chance = Number(today.precipitationChance || 0);
  const snow = Number(today.snowfallAmount || 0);
  if (chance <= 10 && amount <= 0 && snow <= 0) return 'No meaningful rain or snow is expected today.';
  return 'Specific rain or snow timing is unavailable from the current source.';
}

export function renderDailyBriefText(data, contact) {
  return renderTemplateText(DEFAULT_TEXT_TEMPLATE, data, contact);
}

export function renderTemplateText(template, data, contact) {
  const alerts = data.alerts.length ? data.alerts.map((alert) => `- ${alert.title}`).join('\n') : 'No active alerts at generation time.';
  const outlook = data.forecast.map((day) => `${day.day}\n${day.condition}\nHigh ${day.high} | Low ${day.low} | Rain ${day.precipitationChance}% | Amt ${Number(day.precipitationAmount || 0).toFixed(2)} in`).join('\n\n');
  const aqiText = data.airQuality?.aqi == null ? 'Unavailable - AQI source is not configured' : `${data.airQuality.aqi} ${data.airQuality.label}`;
  const replacements = {
    greeting: greetingFor(contact),
    location: data.location,
    stationId: data.stationId,
    updatedTime: data.updatedTime,
    source: data.source,
    high: data.high,
    low: data.low,
    highTimeSummary: data.highTimeSummary,
    rainToday: data.rainToday,
    comfortSummary: data.comfortSummary,
    forecastText: outlook,
    alertsText: alerts,
    precipTimingSummary: data.precipTimingSummary,
    localEventsText: data.localEventsText,
    skyEventsText: data.skyEventsText,
    uvPeakSummary: data.current.uvPeak ? `, peak near ${data.current.uvPeak}${data.current.uvPeakTime ? ` around ${data.current.uvPeakTime}` : ''}` : '',
    'current.temperature': data.current.temperature,
    'current.condition': data.current.condition,
    'current.feelsLike': data.current.feelsLike,
    'current.windDirection': data.current.windDirection,
    'current.windSpeed': data.current.windSpeed,
    'current.windGust': data.current.windGust,
    'current.uvIndex': data.current.uvIndex,
    'current.humidity': data.current.humidity,
    'current.pressure': data.current.pressure,
    'today.precipChance': data.forecast[0]?.precipitationChance ?? 0,
    'today.precipAmount': Number(data.forecast[0]?.precipitationAmount || 0).toFixed(2),
    'airQuality.summary': aqiText,
    'groundCondition.label': data.groundCondition.label,
    'groundCondition.summary': data.groundCondition.summary,
    'waterCondition.waterTemp': data.waterCondition.waterTemp,
    'waterCondition.measuredOrEstimatedNote': data.waterCondition.measuredOrEstimatedNote,
    'waterCondition.surface': data.waterCondition.surface,
    'waterCondition.clarityNote': data.waterCondition.clarityNote,
    'sunMoon.sunrise': data.sunMoon.sunrise,
    'sunMoon.sunset': data.sunMoon.sunset,
    'moon.phase': data.moon.phase,
    'moon.illumination': data.moon.illumination,
    'moon.skyEvent': data.moon.skyEvent || '',
    'stationStatus.label': data.stationStatus.online ? 'online' : 'using public fallback',
    'stationStatus.dataQuality': data.stationStatus.dataQuality,
  };
  return String(template || DEFAULT_TEXT_TEMPLATE).replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = replacements[String(key).trim()];
    return value == null ? '' : String(value);
  });
}

export function renderTextAsHtml(text, subject = 'Staley Street Weather Daily Brief') {
  const sections = String(text).split(/\n{2,}/).filter(Boolean);
  const intro = sections.slice(0, 4).map((section) => `<p style="margin:0 0 10px;line-height:1.5">${escapeHtml(section)}</p>`).join('');
  const cards = sections.slice(4).map((section) => {
    const [title, ...rest] = section.split('\n');
    return `<td style="padding:6px;vertical-align:top"><table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0;background:#0b1f33;border:1px solid #0ea5e9;border-radius:12px"><tr><td style="padding:12px"><h3 style="margin:0 0 8px;color:#67e8f9;font-size:13px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(title)}</h3><p style="margin:0;white-space:pre-wrap;line-height:1.45">${escapeHtml(rest.join('\n'))}</p></td></tr></table></td>`;
  });
  const rows = [];
  for (let index = 0; index < cards.length; index += 2) rows.push(`<tr>${cards.slice(index, index + 2).join('')}</tr>`);
  return `<!doctype html><html><body style="margin:0;background:#06111e;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:760px;margin:auto;padding:24px"><h1 style="color:#67e8f9;margin:0 0 16px">${escapeHtml(subject)}</h1><section style="background:#071827;border:1px solid #0ea5e9;border-radius:14px;padding:18px;margin:0 0 12px">${intro}</section><table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0">${rows.join('')}</table></main></body></html>`;
}

export function renderDailyBriefHtml(data, contact) {
  const forecastRows = data.forecast.map((day) => `<tr><td>${escapeHtml(day.day)}</td><td>${escapeHtml(day.condition)}</td><td>${day.high}F / ${day.low}F</td><td>${day.precipitationChance}%</td><td>${Number(day.precipitationAmount || 0).toFixed(2)} in</td></tr>`).join('');
  const alerts = data.alerts.length ? data.alerts.map((alert) => `<li>${escapeHtml(alert.title)}</li>`).join('') : '<li>No active alerts at generation time.</li>';
  return `<!doctype html><html><body style="margin:0;background:#06111e;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:760px;margin:auto;padding:24px"><h1 style="color:#67e8f9;margin:0 0 8px">Staley Street Weather Daily Brief</h1><p style="font-size:18px">${escapeHtml(greetingFor(contact))}</p><section style="background:#0b1f33;border:1px solid #0ea5e9;border-radius:14px;padding:18px;margin:14px 0"><h2 style="margin:0 0 10px">${data.current.temperature}F ${escapeHtml(data.current.condition)}</h2><p>Feels like ${data.current.feelsLike}F in ${escapeHtml(data.location)}. High ${data.high}F, low ${data.low}F.</p><p>Wind ${escapeHtml(data.current.windDirection)} ${data.current.windSpeed} mph, gust ${data.current.windGust} mph. Rain ${data.forecast[0]?.precipitationChance ?? 0}% / ${Number(data.forecast[0]?.precipitationAmount || 0).toFixed(2)} in.</p></section><table role="presentation" style="width:100%;border-collapse:collapse;background:#081827;border:1px solid #0ea5e9"><thead><tr style="color:#67e8f9"><th align="left">Day</th><th align="left">Condition</th><th align="left">Temp</th><th align="left">Rain</th><th align="left">Amount</th></tr></thead><tbody>${forecastRows}</tbody></table><section style="background:#0b1f33;border:1px solid #0ea5e9;border-radius:14px;padding:18px;margin:14px 0"><p>AQI: ${data.airQuality?.aqi ?? 'Unavailable'} ${escapeHtml(data.airQuality?.label || '')}</p><p>UV: ${data.current.uvIndex}${data.current.uvPeak ? `, peak ${data.current.uvPeak}` : ''}</p><p>Moon: ${escapeHtml(data.moon.phase)} ${data.moon.illumination}%</p><p>${escapeHtml(data.waterCondition.waterTemp)} - ${escapeHtml(data.waterCondition.measuredOrEstimatedNote)}</p></section><h3>Alerts And Notes</h3><ul>${alerts}</ul><p style="color:#94a3b8">Generated ${escapeHtml(data.updatedTime)} from ${escapeHtml(data.source)}.</p></main></body></html>`;
}

export function renderDailyBriefSms(data, contact) {
  const alertText = data.alerts.length ? data.alerts[0].title : 'No active alerts';
  const aqiText = data.airQuality?.aqi == null ? 'AQI unavailable' : `AQI ${data.airQuality.aqi}`;
  const opening = contact?.display_name ? `Good Morning, ${contact.display_name}: ` : 'Good Morning: ';
  return `${opening}Staley Street Weather: ${data.current.temperature}F, ${data.current.condition}, feels ${data.current.feelsLike}. High/Low ${data.high}/${data.low}. Wind ${data.current.windSpeed}/${data.current.windGust} mph. Rain ${data.forecast[0]?.precipitationChance ?? 0}% / ${Number(data.forecast[0]?.precipitationAmount || 0).toFixed(2)} in. ${aqiText}. UV ${data.current.uvIndex}. Alerts: ${alertText}.`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

export async function sendEmail(contact, payload) {
  if (!cfg.resendApiKey) return { contactId: contact.id, email: contact.email, ok: false, error: 'Resend is not configured' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.resendFromEmail, to: [contact.email], subject: payload.subject, html: payload.html, text: payload.text }),
  });
  const body = await response.json().catch(() => ({}));
  const result = { contactId: contact.id, email: contact.email, ok: response.ok, resendMessageId: body.id, error: response.ok ? undefined : body.message || response.statusText };
  await logDelivery({ generated_at: payload.generatedAt, sent_at: new Date().toISOString(), status: result.ok ? 'sent' : 'failed', channel: 'email', recipient_contact_id: contact.id, recipient_value: contact.email, subject: payload.subject, error_message: result.error, resend_message_id: result.resendMessageId });
  return result;
}
