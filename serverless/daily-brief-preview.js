import { briefSubject, buildDailyBriefData, loadBriefInputs, renderDailyBriefHtml, renderDailyBriefSms, renderDailyBriefText } from './_dailyBrief.js';
import { cfg } from './_env.js';

export default async function handler(req, res) {
  try {
    const { weather, contacts, schedule, logs } = await loadBriefInputs(req);
    const data = buildDailyBriefData(weather, schedule);
    const subject = schedule.subject_template
      ? String(schedule.subject_template).replace('{{date}}', new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: schedule.timezone || cfg.timeZone }))
      : briefSubject(data);
    const previewContact = contacts.find((contact) => contact.email_enabled || contact.sms_enabled) || contacts[0];
    return res.status(200).json({
      subject,
      generatedAt: data.generatedAt,
      data,
      text: renderDailyBriefText(data, previewContact),
      html: renderDailyBriefHtml(data, previewContact),
      sms: renderDailyBriefSms(data, previewContact),
      deliveryConfigured: {
        resend: Boolean(cfg.resendApiKey && cfg.resendFromEmail),
        twilio: Boolean(cfg.twilioAccountSid && cfg.twilioApiKeySid && cfg.twilioApiKeySecret && cfg.twilioFromNumber),
      },
      contacts,
      logs,
    });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to generate daily brief' });
  }
}
