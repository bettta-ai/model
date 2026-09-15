import { MAX_PHOTOS, PHOTO_BUCKET } from '../../lib/env';
import { notifyNewSubmission } from '../../lib/notify';
import { clientIp, rateLimit } from '../../lib/rateLimit';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { validateSubmission } from '../../lib/validate';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A submission may only claim photos sitting in its own upload folder. The
// folder id is an unguessable uuid minted by /api/upload-url, so this is what
// stops one submission pointing at another applicant's photos.
function photoPathsAreWellFormed(uploadId, photoPaths) {
  if (!UUID_RE.test(uploadId || '')) return false;
  return photoPaths.every(
    (path) => typeof path === 'string' && path.startsWith(`${uploadId}/`) && !path.includes('..')
  );
}

// Keep only the paths that really landed in storage, so a half-finished upload
// cannot leave a row pointing at objects that do not exist.
async function keepUploadedPhotos(storage, uploadId, photoPaths) {
  const { data, error } = await storage.list(uploadId, { limit: MAX_PHOTOS + 1 });
  if (error) throw error;

  const uploaded = new Set((data || []).map((entry) => `${uploadId}/${entry.name}`));
  return photoPaths.filter((path) => uploaded.has(path));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const limit = rateLimit(`submit:${clientIp(req)}`, 10);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
  }

  const body = req.body || {};

  // Honeypot: real people never fill in a field they cannot see. Answer as if
  // the submission worked so a bot has nothing to tune against.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const { fields, errors } = validateSubmission(body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Please check the highlighted fields.', fields: errors });
  }

  const requestedPhotos = Array.isArray(body.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];
  if (requestedPhotos.length > 0 && !photoPathsAreWellFormed(body.uploadId, requestedPhotos)) {
    return res.status(400).json({ error: 'Those photos could not be matched to this submission.' });
  }

  try {
    const supabase = supabaseAdmin();

    const photoPaths =
      requestedPhotos.length > 0
        ? await keepUploadedPhotos(
            supabase.storage.from(PHOTO_BUCKET),
            body.uploadId,
            requestedPhotos
          )
        : [];

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        name: fields.name,
        email: fields.email,
        country: fields.country,
        city: fields.city || null,
        phone: fields.phone || null,
        height: fields.height || null,
        measurements: fields.measurements || null,
        shoe_size: fields.shoesize || null,
        hair_color: fields.haircolor || null,
        date_of_birth: fields.dob,
        about: fields.about || null,
        contact_preferences: fields.contact_preferences,
        photo_paths: photoPaths
      })
      .select('id')
      .single();

    if (error) throw error;

    // The applicant is already saved at this point. Notifying is best-effort:
    // if the mail provider is down we log it and still report success.
    await notifyNewSubmission({ id: data.id, name: fields.name, country: fields.country });

    return res.status(201).json({ ok: true, id: data.id, photosSaved: photoPaths.length });
  } catch (error) {
    console.error('Submission failed:', error);
    return res
      .status(500)
      .json({ error: 'We could not save your submission. Please try again in a moment.' });
  }
}

export const config = {
  api: {
    // Photos travel directly to storage, so this body is only text fields.
    bodyParser: { sizeLimit: '64kb' }
  }
};
