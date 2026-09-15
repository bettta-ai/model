import { ALLOWED_PHOTO_TYPES, MAX_PHOTOS, MAX_PHOTO_BYTES } from './env';

const LIMITS = {
  name: 120,
  email: 254,
  country: 80,
  city: 120,
  phone: 40,
  height: 40,
  measurements: 60,
  shoesize: 30,
  haircolor: 30,
  about: 4000
};

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

function clean(value, max) {
  if (typeof value !== 'string') return '';
  // Strip control characters, trim, then cap the length.
  return value.replace(CONTROL_CHARS, ' ').trim().slice(0, max);
}

// Deliberately permissive: this catches obvious typos, it does not try to
// police what a real address can look like.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PREF_KEYS = { email: 'prefEmail', phone: 'prefPhone', sms: 'prefSMS' };

export function validateSubmission(body) {
  const errors = {};
  const fields = {};

  for (const [key, max] of Object.entries(LIMITS)) {
    fields[key] = clean(body[key], max);
  }

  // "about" is the only free-text field, so keep its newlines.
  if (typeof body.about === 'string') {
    fields.about = body.about.replace(/\r\n/g, '\n').trim().slice(0, LIMITS.about);
  }

  if (!fields.name) errors.name = 'Name is required.';
  if (!fields.email) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(fields.email)) errors.email = 'That email address does not look right.';
  if (!fields.country) errors.country = 'Country is required.';

  const dob = clean(body.dob, 10);
  if (dob && !ISO_DATE_RE.test(dob)) {
    errors.dob = 'Date of birth must be a valid date.';
  } else if (dob) {
    const parsed = new Date(`${dob}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      errors.dob = 'Date of birth must be a valid date in the past.';
    }
  }
  fields.dob = dob && !errors.dob ? dob : null;

  fields.contact_preferences = Object.entries(PREF_KEYS)
    .filter(([, key]) => body[key] === true)
    .map(([pref]) => pref);

  return { fields, errors };
}

export function validatePhotoRequest(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { error: 'No files listed.' };
  }
  if (files.length > MAX_PHOTOS) {
    return { error: `You can upload at most ${MAX_PHOTOS} photos.` };
  }
  for (const file of files) {
    if (!file || typeof file !== 'object') return { error: 'Malformed file entry.' };
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: `${file.type || 'That file type'} is not a supported image format.` };
    }
    if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
      return { error: `Each photo must be under ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB.` };
    }
  }
  return { files };
}

export function extensionFor(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
}
