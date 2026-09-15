// Browser-side submission pipeline.
//
// Photos are uploaded straight to Supabase Storage with one-time signed URLs,
// then only their paths are posted to /api/submit. That keeps multi-megabyte
// images out of the serverless request body, which is capped well below the
// size of a handful of phone photos.

async function readError(response, fallback) {
  try {
    const payload = await response.json();
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

async function uploadPhotos(photos, onProgress) {
  if (photos.length === 0) return { uploadId: null, paths: [] };

  const response = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      files: photos.map((photo) => ({
        type: photo.file.type,
        size: photo.file.size
      }))
    })
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Could not prepare the photo upload.'));
  }

  const { uploadId, uploads } = await response.json();
  const paths = [];

  for (let index = 0; index < uploads.length; index += 1) {
    const { signedUrl, path } = uploads[index];
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', photos[index].file, photos[index].file.name || `photo-${index + 1}`);

    const upload = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'x-upsert': 'false' },
      body
    });

    if (!upload.ok) {
      throw new Error(`Photo ${index + 1} could not be uploaded. Please try again.`);
    }
    paths.push(path);
    onProgress?.(index + 1, uploads.length);
  }

  return { uploadId, paths };
}

export async function submitApplication({ formData, photos, onProgress }) {
  const { uploadId, paths } = await uploadPhotos(photos, onProgress);

  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      country: formData.country,
      city: formData.city,
      phone: formData.phone,
      height: formData.height,
      measurements: formData.measurements,
      shoesize: formData.shoesize,
      haircolor: formData.haircolor,
      dob: formData.dob,
      about: formData.about,
      prefEmail: formData.prefEmail,
      prefPhone: formData.prefPhone,
      prefSMS: formData.prefSMS,
      website: formData.website || '',
      uploadId,
      photos: paths
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'We could not save your submission.');
    error.fields = payload.fields || null;
    throw error;
  }

  return response.json();
}
