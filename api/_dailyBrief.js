import { cfg } from './_env.js';
import { logDelivery, safeSelect } from './_supabase.js';

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

export async function loadBriefInputs(req) {
  const baseUrl = absoluteBaseUrl(req);
  const [weather, contacts, schedules, logs] = await Promise.all([
    fetchJson(`${baseUrl}/api/weather`),
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

export function renderDailyBriefText(data) {
  const alerts = data.alerts.length ? data.alerts.map((alert) => `- ${alert.title}`).join('\n') : 'No active alerts at generation time.';
  const outlook = data.forecast.map((day) => `${day.day}\nDay\n${day.condition}\nHigh ${day.high} | Rain ${day.precipitationChance}%\n\nNight\nLow ${day.low} | Rain ${day.precipitationChance}%`).join('\n\n');
  const aqiText = data.airQuality?.aqi == null ? 'Unavailable - AQI source is not configured' : `${data.airQuality.aqi} ${data.airQuality.label}`;
  return `Live personal weather station\nStaley Street Weather Daily Brief\n\nGood morning, my weather crew. Here is your daily weather brief:\n\n${data.current.temperature}F\n${data.current.condition}\nFeels like ${data.current.feelsLike} in ${data.location}.\n\nStation ${data.stationId}\nUpdated ${data.updatedTime}\nSource: ${data.source}\n\n${data.comfortSummary}\n\nHigh / Low\n${data.high} / ${data.low}\nThe daily temperature range from the station and forecast blend.\n\nWind\n${data.current.windSpeed} mph / ${data.current.windGust} mph\nSustained wind first, gust second. Good for porch-item decisions.\n\nAir Quality\n${aqiText}\nA quick read on outdoor comfort and breathing conditions.\n\nUV\n${data.current.uvIndex}\nLive station and forecast blend.\n\nComfort Dashboard\n\nHumidity ${data.current.humidity}%\nWind gust ${data.current.windGust} mph\nUV index ${data.current.uvIndex}\nPressure ${data.current.pressure} inHg\n\nFive-Day Day And Night Outlook\n\n${outlook}\n\nMonthly Weather Planning Graphs\n\nTemperature planning trend ${Math.min(...data.forecast.map((d) => d.low))} to ${Math.max(...data.forecast.map((d) => d.high))}\nWind planning trend based on current sustained/gust values.\nUV planning trend starts at ${data.current.uvIndex}.\nRain planning trend follows forecast precipitation chances.\n\nRain And Ground Conditions\n\nRain today: ${data.rainToday}. Current condition: ${data.current.condition}.\nGround condition estimate: ${data.groundCondition.label}. ${data.groundCondition.summary}\n\nHungry Mother State Park Water Conditions\n\nWater Temp\n${data.waterCondition.waterTemp}\n${data.waterCondition.measuredOrEstimatedNote}\n\nSurface\n${data.waterCondition.surface}\nRain/clarity: ${data.waterCondition.clarityNote}\n\nSun And Moon\n\nSunrise\n${data.sunMoon.sunrise}\n\nSunset\n${data.sunMoon.sunset}\n\nMoon\n${data.moon.phase} ${data.moon.illumination}%\n\nAlerts And Notes\n\n${alerts}\n\nStation Status\n\nStation is ${data.stationStatus.online ? 'online' : 'offline'} with data quality ${data.stationStatus.dataQuality}.`;
}

export function renderDailyBriefHtml(data) {
  const text = renderDailyBriefText(data).split('\n').map((line) => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br />').join('');
  return `<!doctype html><html><body style="margin:0;background:#06111e;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:720px;margin:auto;padding:24px"><h1 style="color:#67e8f9">Staley Street Weather Daily Brief</h1><section style="background:#0b1f33;border:1px solid #0ea5e9;border-radius:14px;padding:18px">${text}</section></main></body></html>`;
}

export function renderDailyBriefSms(data) {
  const alertText = data.alerts.length ? data.alerts[0].title : 'No active alerts';
  const aqiText = data.airQuality?.aqi == null ? 'AQI unavailable' : `AQI ${data.airQuality.aqi}`;
  return `Staley Street Weather Daily Brief: ${data.current.temperature}F, ${data.current.condition}, feels like ${data.current.feelsLike}. High/Low ${data.high}/${data.low}. Wind ${data.current.windSpeed}/${data.current.windGust} mph. Rain today ${data.rainToday}. ${aqiText}. UV ${data.current.uvIndex}. Alerts: ${alertText}.`;
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
