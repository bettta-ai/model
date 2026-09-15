import { randomUUID } from 'crypto';
import { PHOTO_BUCKET } from '../../lib/env';
import { clientIp, rateLimit } from '../../lib/rateLimit';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { extensionFor, validatePhotoRequest } from '../../lib/validate';

// Photos go straight from the browser to Supabase Storage using short-lived
// signed URLs minted here. They never pass through this function, which keeps
// us clear of the 4.5 MB serverless request limit that would otherwise reject
// any submission with real phone photos attached.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const limit = rateLimit(`upload:${clientIp(req)}`, 60);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Too many uploads. Please try again shortly.' });
  }

  const check = validatePhotoRequest(req.body?.files);
  if (check.error) {
    return res.status(400).json({ error: check.error });
  }

  try {
    const storage = supabaseAdmin().storage.from(PHOTO_BUCKET);
    // One folder per attempt. The ids are unguessable, which is what stops a
    // submission from claiming photos that belong to someone else.
    const uploadId = randomUUID();

    const uploads = [];
    for (const file of check.files) {
      const path = `${uploadId}/${randomUUID()}.${extensionFor(file.type)}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error) throw error;
      uploads.push({ path: data.path, signedUrl: data.signedUrl, token: data.token });
    }

    return res.status(200).json({ uploadId, uploads });
  } catch (error) {
    console.error('Could not create signed upload URLs:', error);
    return res.status(500).json({ error: 'Could not prepare the photo upload. Please try again.' });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '16kb' }
  }
};
