const cfg = {
  supabaseUrl: supabaseProjectUrl(),
  supabaseServiceRoleKey: envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SERVICE_KEY') || envValue('SUPABASE_SECRET_KEY') || envValue('SUPABASE_SERVICE_ROLE'),
};

function envValue(name) {
  return process.env[name]?.trim();
}

function supabaseProjectUrl() {
  const raw =
    envValue('SUPABASE_URL') ||
    envValue('NEXT_PUBLIC_SUPABASE_URL') ||
    envValue('VITE_SUPABASE_URL') ||
    envValue('SUPABASE_API_URL') ||
    envValue('NEXT_PUBLIC_SUPABASE_API_URL') ||
    envValue('VITE_SUPABASE_API_URL');
  if (!raw) return '';
  return raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

function serviceRoleLooksUsable() {
  return Boolean(cfg.supabaseServiceRoleKey && cfg.supabaseServiceRoleKey.split('.').length === 3);
}

function configured() {
  return Boolean(cfg.supabaseUrl && serviceRoleLooksUsable());
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value) {
  return !value || /^\+[1-9]\d{7,14}$/.test(value);
}

function cleanContact(input = {}) {
  const contact = {
    display_name: String(input.display_name || '').trim(),
    email: input.email ? String(input.email).trim() : null,
    phone_e164: input.phone_e164 ? String(input.phone_e164).trim() : null,
    email_enabled: Boolean(input.email_enabled),
    sms_enabled: Boolean(input.sms_enabled),
    is_primary: Boolean(input.is_primary),
    notes: input.notes ? String(input.notes) : null,
  };
  if (!contact.display_name) throw new Error('Display name is required');
  if (!validEmail(contact.email)) throw new Error('Email format is invalid');
  if (!validPhone(contact.phone_e164)) throw new Error('Phone number must be E.164, for example +15405551212');
  if (contact.email_enabled && !contact.email) throw new Error('Email is required when email delivery is enabled');
  if (contact.sms_enabled && !contact.phone_e164) throw new Error('Phone number is required when SMS delivery is enabled');
  return contact;
}

async function supabaseRest(table, options = {}) {
  if (!cfg.supabaseUrl) throw new Error('Supabase project URL is not configured');
  if (!serviceRoleLooksUsable()) throw new Error('Supabase server write key is not usable. Contacts require a complete service-role JWT on the server.');
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: cfg.supabaseServiceRoleKey,
      Authorization: `Bearer ${cfg.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || response.statusText);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

function contactIdFromRequest(req) {
  return req.query?.id || req.url?.split('/').pop()?.split('?')[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const id = contactIdFromRequest(req);
    if (!id) return res.status(400).json({ error: 'Contact id is required' });

    if (req.method === 'DELETE') {
      await supabaseRest('contacts', { method: 'DELETE', query: { id: `eq.${id}` } });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const row = cleanContact(req.body);
      const result = await supabaseRest('contacts', { method: 'PATCH', query: { id: `eq.${id}` }, body: row });
      return res.status(200).json(result?.[0] || row);
    }

    res.setHeader('Allow', 'PUT, PATCH, DELETE, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update contact' });
  }
}
