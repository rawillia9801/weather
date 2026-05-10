import { cfg, supabaseCanWrite } from './_env.js';

export async function supabaseRest(table, options = {}) {
  if (!cfg.supabaseUrl) throw new Error('Supabase project URL is not configured');
  const mutating = options.method && options.method !== 'GET';
  const key = mutating || options.requireServiceRole ? cfg.supabaseServiceRoleKey : (supabaseCanWrite() ? cfg.supabaseServiceRoleKey : cfg.supabaseAnonKey);
  if (!key) throw new Error('Supabase API key is not configured');
  if (mutating && !supabaseCanWrite()) throw new Error('Supabase server write key is not configured');

  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(options.query || {}).forEach(([name, value]) => url.searchParams.set(name, String(value)));

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
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

export async function safeSelect(table, fallback, query = {}) {
  try {
    const rows = await supabaseRest(table, { query });
    return Array.isArray(rows) ? rows : fallback;
  } catch {
    return fallback;
  }
}

export async function logDelivery(row) {
  try {
    await supabaseRest('daily_brief_send_logs', { method: 'POST', body: row });
  } catch {
    // Delivery status should reflect provider acceptance even if log persistence is unavailable.
  }
}
