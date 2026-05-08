# Hostinger Deployment

This app is not a static-only Vite site. It needs the Node/Express server because the React dashboard calls `/api/weather`, `/api/app-config`, and `/api/daily-brief/*`.

If the live page looks unstyled or says every value is unavailable while localhost is correct, check two things:

1. The deployed `index.html` and `/assets/*` files must come from the same `npm run build` output. Upload the entire `dist` folder contents, not only `index.html`. The production build inlines the dashboard CSS into `index.html` to avoid stale CDN stylesheet mismatches.
2. `/api/health` on the public domain must return JSON. If it returns Hostinger HTML/404, the Node backend is not mounted behind that domain.

## Current domain mismatch checks

The production domain should look like this repo's Vite build:

```txt
<title>Staley Street Weather</title>
/assets/index-*.js
/assets/index-*.css
```

If `https://staleyclimate.info` returns a page with `/_next/static/*` assets, a title like `WStation Weather Intelligence Center`, or hardcoded demo-looking weather markup, the domain is pointed at a different Next.js app/build. Redeploy this repository's build output or repoint the domain to this app.

Quick checks:

```txt
https://staleyclimate.info/
```

should contain `Staley Street Weather` and Vite `/assets/index-*.js` files.

```txt
https://staleyclimate.info/api/health
```

should return JSON like:

```json
{"ok":true,"stationId":"KVAMARIO42","provider":"weather-underground-pws"}
```

If `/api/health` or `/api/weather` returns `404`, the frontend may load but live weather, settings, camera bridge, daily brief send, and Supabase-backed operations will not work from that domain. A Vite/static-only deployment cannot execute the JavaScript files in `/api`; those routes require Hostinger's Node.js Web App mode, Vercel-style functions, or the Express server.

## Hostinger Node app settings

- Node version: `20.x` or newer
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start`
- App entry file: `server/index.mjs`
- Public/output directory if requested: `dist`

`npm start` runs `server/ensure-dist.mjs` first. If `dist/index.html` is missing, it builds the frontend before starting the server.

## Required environment variables

Set these in Hostinger's environment variable panel. Do not commit `.env.local`.

Required for live weather:

- `WEATHER_API_KEY`
- `STATION_ID`
- `LATITUDE`
- `LONGITUDE`
- `REPORT_TIME_ZONE`

Required for Supabase-backed settings/contacts/logs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for daily brief email:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` or `ALERT_EMAIL`

Required for daily brief SMS:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_FROM_NUMBER`

Optional camera:

- `LOREX_CAMERA_SNAPSHOT_URL`
- `LOREX_CAMERA_FEED_URL`
- `LOREX_CAMERA_FEED_TYPE`
- `LOREX_CAMERA_NAME`

Optional radar context:

- `RADAR_CONTEXT_URL`
- `RADAR_PROVIDER_NAME`

## Static frontend + separate Node backend

This is optional and is not needed when same-domain `/api/*` routes are working. Only use it if Hostinger serves the React app as static files on `https://staleyclimate.info` and runs the Node backend on another URL. In that split setup, set this at build time:

```txt
VITE_API_BASE_URL=https://your-node-backend-host.example.com
VITE_API_ALLOWED_ORIGIN=https://staleyclimate.info
```

Then verify:

```txt
https://your-node-backend-host.example.com/api/health
```

returns JSON.

## Supabase schema

Create the required tables with:

```sql
-- supabase/schema.sql
```

The app will still load if the tables are missing, but Settings contacts, daily schedules, thresholds, send logs, and notification history require those tables.
