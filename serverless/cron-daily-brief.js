import { buildDailyBriefData, loadBriefInputs, renderDailyBriefHtml, renderDailyBriefSms, renderDailyBriefText, sendEmail } from './_dailyBrief.js';
import { cfg } from './_env.js';

export default async function handler(req, res) {
  try {
    const { weather, contacts, schedule } = await loadBriefInputs(req);
    if (!schedule.enabled || !schedule.email_enabled) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Daily brief email schedule is disabled' });
    }

    const data = buildDailyBriefData(weather, schedule);
    const subject = schedule.subject_template
      ? String(schedule.subject_template).replace('{{date}}', new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: schedule.timezone || cfg.timeZone }))
      : `Staley Street Weather Daily Brief - Marion, VA - ${new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: schedule.timezone || cfg.timeZone })}`;
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
    if (!recipients.length) return res.status(200).json({ ok: true, skipped: true, reason: 'No email-enabled contacts configured' });

    const emailResults = [];
    for (const contact of recipients) {
      emailResults.push(await sendEmail(contact, payload));
    }

    return res.status(200).json({ ok: emailResults.every((result) => result.ok), emailResults });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to run scheduled daily brief' });
  }
}
