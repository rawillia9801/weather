import { supabaseRest } from '../_supabase.js';

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const allowed = new Set(['station_settings', 'daily_brief_schedules', 'alert_thresholds', 'display_preferences']);
  const table = req.query?.table;
  if (!allowed.has(table)) return res.status(404).json({ error: 'Unknown settings table' });
  if (!['PATCH', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'PATCH, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const existing = await supabaseRest(table, { query: { select: 'id', limit: 1 } });
    const body = { ...parseBody(req), updated_at: new Date().toISOString() };
    if (existing?.[0]?.id) {
      const result = await supabaseRest(table, { method: 'PATCH', query: { id: `eq.${existing[0].id}` }, body });
      return res.status(200).json(result?.[0] || body);
    }
    const result = await supabaseRest(table, { method: 'POST', body });
    return res.status(200).json(result?.[0] || body);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to persist settings' });
  }
}
