// Best-effort abuse brake for the two public endpoints.
//
// This counts per serverless instance, so it is a speed bump rather than a
// guarantee — a burst spread across cold starts can slip through. It is enough
// to stop a single client hammering the form, and it costs nothing to run. If
// this ever needs to be authoritative, move the counter to Supabase or a KV
// store.

const buckets = new Map();
const WINDOW_MS = 10 * 60 * 1000;

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function rateLimit(key, max) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistically drop expired buckets so the map cannot grow forever.
    if (buckets.size > 5000) {
      for (const [existing, value] of buckets) {
        if (now > value.resetAt) buckets.delete(existing);
      }
    }
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}
