// Server-only configuration. Every value comes from Vercel environment
// variables — nothing secret is ever hard-coded, because this repo is public.

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        'Set it in Vercel → Project → Settings → Environment Variables.'
    );
  }
  return value;
}

export const PHOTO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'submissions';

// Keep these in sync with the bucket limits configured in supabase/schema.sql.
export const MAX_PHOTOS = 12;
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB per photo
export const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

export function supabaseConfig() {
  return {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY')
  };
}

// Notification settings are optional: a missing mailer must never stop a
// submission from being saved.
export function notifyConfig() {
  const to = process.env.NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) return null;
  return {
    to,
    apiKey,
    from: process.env.NOTIFY_FROM || 'SCOUT <onboarding@resend.dev>'
  };
}

export function adminToken() {
  return process.env.ADMIN_TOKEN || '';
}

// Used to build the "view this entry" link in the notification email.
export function appBaseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}
