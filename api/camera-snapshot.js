const HOST = process.env.LOREX_DDNS_HOST || process.env.LOREX_CAMERA_HOST || 'staleystreet.lorexddns.net';
const USERNAME = process.env.LOREX_CAMERA_USERNAME || '';
const PASSWORD = process.env.LOREX_CAMERA_PASSWORD || '';
const CHANNEL = process.env.LOREX_CAMERA_CHANNEL || '5';
const SNAPSHOT_PATH = process.env.LOREX_CAMERA_SNAPSHOT_PATH || '/cgi-bin/snapshot.cgi';
const PROTOCOL = process.env.LOREX_CAMERA_PROTOCOL || 'http';
const PORT = process.env.LOREX_CAMERA_PORT || '';

function buildSnapshotUrl() {
  const host = PORT ? `${HOST}:${PORT}` : HOST;
  const url = new URL(`${PROTOCOL}://${host}${SNAPSHOT_PATH}`);
  if (!url.searchParams.has('channel')) url.searchParams.set('channel', CHANNEL);
  return url;
}

export default async function handler(req, res) {
  const url = buildSnapshotUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const headers = { Accept: 'image/jpeg,image/*,*/*' };
    if (USERNAME && PASSWORD) {
      headers.Authorization = `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`;
    }

    const upstream = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({
        error: `Camera snapshot request failed: ${upstream.status} ${upstream.statusText}`,
        detail: text.slice(0, 200),
        host: HOST,
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(buffer);
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? `Camera timed out connecting to ${HOST}. Check DDNS, port forwarding, camera/NVR web port, and ISP firewall/CGNAT.`
      : error instanceof Error ? error.message : 'Camera snapshot unavailable';
    res.status(504).json({ error: message, host: HOST });
  } finally {
    clearTimeout(timeout);
  }
}
