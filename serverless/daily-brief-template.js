import { DEFAULT_TEXT_TEMPLATE } from './_dailyBrief.js';
import { supabaseCanWrite } from './_env.js';
import { safeSelect, supabaseRest } from './_supabase.js';

async function readTemplate() {
  const rows = await safeSelect('daily_brief_templates', [], { select: '*', channel: 'eq.email_text', is_active: 'eq.true', limit: 1 });
  return rows[0] || {
    name: 'default',
    channel: 'email_text',
    template_body: DEFAULT_TEXT_TEMPLATE,
    is_active: true,
  };
}

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
  if (req.method === 'GET') {
    const template = await readTemplate();
    return res.status(200).json({
      ok: true,
      template,
      writable: supabaseCanWrite(),
      defaultTemplate: DEFAULT_TEXT_TEMPLATE,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!supabaseCanWrite()) {
    return res.status(403).json({
      ok: false,
      error: 'Supabase writes are blocked because the server service-role JWT is not configured.',
      writable: false,
    });
  }

  const body = parseBody(req);
  const templateBody = String(body.template_body || '').trim();
  if (!templateBody) return res.status(400).json({ ok: false, error: 'Template body is required' });

  const existing = await readTemplate();
  const row = {
    name: existing.name || 'default',
    channel: 'email_text',
    template_body: templateBody,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const result = existing.id
    ? await supabaseRest('daily_brief_templates', { method: 'PATCH', query: { id: `eq.${existing.id}` }, body: row })
    : await supabaseRest('daily_brief_templates', { method: 'POST', body: row });

  return res.status(200).json({
    ok: true,
    template: Array.isArray(result) ? result[0] : row,
    writable: true,
  });
}
