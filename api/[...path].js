import appConfig from '../serverless/app-config.js';
import cameraSnapshot from '../serverless/camera-snapshot.js';
import contacts from '../serverless/contacts.js';
import contactById from '../serverless/contacts-id.js';
import cronDailyBrief from '../serverless/cron-daily-brief.js';
import dailyBriefPreview from '../serverless/daily-brief-preview.js';
import dailyBriefSend from '../serverless/daily-brief-send.js';
import dailyBriefTemplate from '../serverless/daily-brief-template.js';
import health from '../serverless/health.js';
import history from '../serverless/history.js';
import settings from '../serverless/settings.js';
import settingsTable from '../serverless/settings-table.js';
import weather from '../serverless/weather.js';
import weatherDebug from '../serverless/weather-debug.js';

function pathFromRequest(req) {
  const host = req.headers.host || 'localhost';
  return new URL(req.url || '/api', `https://${host}`).pathname.replace(/\/+$/, '') || '/api';
}

function withQuery(req, query) {
  req.query = { ...(req.query || {}), ...query };
  return req;
}

export default async function handler(req, res) {
  const pathname = pathFromRequest(req);

  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      return res.status(204).end();
    }

    if (pathname === '/api/health') return health(req, res);
    if (pathname === '/api/weather') return weather(req, res);
    if (pathname === '/api/weather/debug') return weatherDebug(req, res);
    if (pathname === '/api/history') return history(req, res);
    if (pathname === '/api/app-config') return appConfig(req, res);
    if (pathname === '/api/camera-snapshot') return cameraSnapshot(req, res);
    if (pathname === '/api/contacts') return contacts(req, res);
    if (pathname.startsWith('/api/contacts/')) {
      const id = decodeURIComponent(pathname.slice('/api/contacts/'.length));
      return contactById(withQuery(req, { id }), res);
    }
    if (pathname === '/api/settings') return settings(req, res);
    if (pathname.startsWith('/api/settings/')) {
      const table = decodeURIComponent(pathname.slice('/api/settings/'.length));
      return settingsTable(withQuery(req, { table }), res);
    }
    if (pathname === '/api/daily-brief/preview') return dailyBriefPreview(req, res);
    if (pathname === '/api/daily-brief/send') return dailyBriefSend(req, res);
    if (pathname === '/api/daily-brief/template') return dailyBriefTemplate(req, res);
    if (pathname === '/api/cron/daily-brief') return cronDailyBrief(req, res);

    return res.status(404).json({ ok: false, error: 'API route not found' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected API error',
    });
  }
}
