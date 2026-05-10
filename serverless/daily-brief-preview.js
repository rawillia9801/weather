import { briefSubject, buildDailyBriefData, DEFAULT_TEXT_TEMPLATE, loadBriefInputs, renderDailyBriefHtml, renderDailyBriefSms, renderTemplateText, renderTextAsHtml } from './_dailyBrief.js';
import { cfg } from './_env.js';
import { safeSelect } from './_supabase.js';

export default async function handler(req, res) {
  try {
    const { weather, contacts, schedule, logs } = await loadBriefInputs(req);
    const data = buildDailyBriefData(weather, schedule);
    const subject = schedule.subject_template
      ? String(schedule.subject_template).replace('{{date}}', new Date(data.generatedAt).toLocaleDateString('en-US', { timeZone: schedule.timezone || cfg.timeZone }))
      : briefSubject(data);
    const previewContact = contacts.find((contact) => contact.email_enabled || contact.sms_enabled) || contacts[0] || { display_name: 'Cristy' };
    const templates = await safeSelect('daily_brief_templates', [], { select: '*', channel: 'eq.email_text', is_active: 'eq.true', limit: 1 });
    const template = templates[0]?.template_body || DEFAULT_TEXT_TEMPLATE;
    const text = renderTemplateText(template, data, previewContact);
    return res.status(200).json({
      subject,
      generatedAt: data.generatedAt,
      data,
      template,
      text,
      html: renderTextAsHtml(text, subject) || renderDailyBriefHtml(data, previewContact),
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
