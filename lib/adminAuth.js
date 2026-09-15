import { timingSafeEqual } from 'crypto';
import { adminToken } from './env';

const COOKIE_NAME = 'scout_admin';

function parseCookies(header) {
  const jar = {};
  if (!header) return jar;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    jar[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return jar;
}

function matches(candidate, expected) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, so compare lengths first —
  // the length of the token is not the secret.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Gate an admin page. The token arrives once as ?token=... (the form of the
 * link in the notification email) and is then kept in an httpOnly cookie so
 * ordinary navigation works without the secret riding in every URL.
 */
export function requireAdmin({ req, res, query }) {
  const expected = adminToken();
  if (!expected) {
    return { ok: false, reason: 'ADMIN_TOKEN is not set on this deployment.' };
  }

  const fromQuery = typeof query?.token === 'string' ? query.token : '';
  if (matches(fromQuery, expected)) {
    res.setHeader(
      'Set-Cookie',
      [
        `${COOKIE_NAME}=${encodeURIComponent(fromQuery)}`,
        'Path=/admin',
        'HttpOnly',
        'SameSite=Lax',
        'Secure',
        'Max-Age=604800'
      ].join('; ')
    );
    return { ok: true };
  }

  const fromCookie = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (matches(fromCookie, expected)) return { ok: true };

  return { ok: false, reason: 'This link needs a valid admin token.' };
}

// Admin pages read personal data, so they must never be cached or indexed.
export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}
