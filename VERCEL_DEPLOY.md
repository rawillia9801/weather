# Staley Street Weather — Production on Vercel

**Production project:** `weather`  
**Source:** `rawillia9801/weather`, `main` branch  
**Public domain:** `https://www.staleyclimate.info`  
**App:** React/Vite frontend and `api/index.js` Vercel function for `/api/*`.

## Deployments

GitHub pushes to `main` automatically build and deploy to the Vercel `weather` project. The existing `vercel.json` sets the frontend build and API rewrites. Production is **not hosted on Hostinger**; the obsolete `HOSTINGER_DEPLOY.md` remains only as a historical reference.

## Daily weather email

- **Sender mailbox:** `alerts@staleyclimate.info`
- **Mail hosting:** Hostinger Email; SMTP over SSL at `smtp.hostinger.com:465`.
- **Sending backend:** `serverless/_smtp.js`, called by `sendEmail` in `serverless/_dailyBrief.js`.
- **Recipients:** existing rows in Supabase `contacts` with `email_enabled = true` and a nonempty email address. Do not hard-code recipient addresses.
- **Schedule:** existing `daily_brief_schedules` Supabase row; the Vercel cron calls `/api/cron/daily-brief`. The currently configured cron runs at 11:00 UTC, equivalent to 7:00 AM Eastern during daylight-saving time and 6:00 AM Eastern during standard time. On Hobby, Vercel does not permit more than one invocation per day, so a timezone-aware scheduler is needed for exact 7:00 AM year-round.
- **Content:** the existing live station weather, alerts, forecast, and enriched local-event data.
- **Monitoring:** inspect rows in `daily_brief_send_logs`; a successful SMTP acceptance is logged as `sent`, and errors are logged as `failed`.

### Secret environment variables

Configure these in **Vercel > weather > Settings > Environment Variables > Production**:

| Variable | Purpose |
|---|---|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Complete sending mailbox email |
| `SMTP_PASSWORD` | Mailbox password — production secret, NEVER commit |
| `SMTP_FROM_EMAIL` | Sender address |
| `CRON_SECRET` | Authenticates the scheduled sender |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Existing contacts and schedules |

Keep existing weather, Supabase, and domain variables intact. A new Vercel deployment is required after changing environment variables.

### Mailbox verification

The sender must actually exist in Hostinger Email and be able to log in before SMTP authentication can work. Hostinger Email's documented SSL SMTP server is `smtp.hostinger.com`, port `465`. A successful Vercel build verifies code deployment but **does not** prove a real message was accepted by the SMTP server; inspect the next send log before declaring delivery operational.

### Security

The scheduled endpoint requires Vercel's automatically supplied `Authorization: Bearer <CRON_SECRET>` header. SMTP authentication occurs server-side only. Never place SMTP credentials in source files, browser JavaScript, troubleshooting screenshots, or version control.
