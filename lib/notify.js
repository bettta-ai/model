import { appBaseUrl, notifyConfig } from './env';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Tell the team a new submission arrived.
 *
 * By design this email carries ONLY the applicant's name, their country, and a
 * link to the full entry. Photos, phone number, date of birth and the rest of
 * the personal data stay in Supabase behind the admin login — email is not a
 * safe place to fan out personal data.
 *
 * Never throws: a mail failure must not lose a submission that is already saved.
 */
export async function notifyNewSubmission({ id, name, country }) {
  const config = notifyConfig();
  if (!config) {
    console.warn('Submission saved but no notification sent: NOTIFY_EMAIL or RESEND_API_KEY is unset.');
    return { sent: false, reason: 'not_configured' };
  }

  const base = appBaseUrl();
  const link = base ? `${base}/admin/${id}` : `(set APP_BASE_URL to get a direct link — entry id ${id})`;
  const safeName = escapeHtml(name);
  const safeCountry = escapeHtml(country);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: `New SCOUT submission — ${name} (${country})`,
        text: `${name}\n${country}\n\nView the entry: ${link}\n`,
        html:
          `<p><strong>${safeName}</strong><br>${safeCountry}</p>` +
          (base
            ? `<p><a href="${escapeHtml(link)}">View the entry</a></p>`
            : `<p>${escapeHtml(link)}</p>`)
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Notification email rejected:', response.status, detail);
      return { sent: false, reason: 'provider_error' };
    }
    return { sent: true };
  } catch (error) {
    console.error('Notification email failed:', error);
    return { sent: false, reason: 'network_error' };
  }
}
