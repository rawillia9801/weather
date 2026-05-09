import { briefSubject, buildDailyBriefData, loadBriefInputs, renderDailyBriefHtml, renderDailyBriefSms, renderDailyBriefText, sendEmail } from '../_dailyBrief.js';
import { cfg } from '../_env.js';

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { weather, contacts, schedule } = await loadBriefInputs(req);
    const data = buildDailyBriefData(weather, schedule);
    const body = parseBody(req);
    const subject = body.subject || (schedule.subject_template
      ? String(schedule.subject_template).replace('{{date}}', new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: schedule.timezone || cfg.timeZone }))
      : briefSubject(data));
    const payload = {
      stationId: data.stationId,
      stationName: data.stationName,
      location: data.location,
      generatedAt: data.generatedAt,
      subject,
      html: renderDailyBriefHtml(data),
      text: renderDailyBriefText(data),
      sms: renderDailyBriefSms(data),
      data,
    };
    const recipients = contacts.filter((contact) => contact.email_enabled && contact.email);
    if (!recipients.length) return res.status(400).json({ error: 'No email-enabled contacts are configured in Supabase' });
    const emailResults = [];
    for (const contact of recipients) {
      emailResults.push(await sendEmail(contact, payload));
    }
    return res.status(200).json({ ok: emailResults.every((result) => result.ok), emailResults, smsResults: [] });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to send daily brief' });
  }
}
