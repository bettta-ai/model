// Builds the files the applicant takes away. Everything happens in their
// browser — nothing is uploaded anywhere.

import { SHOTS } from '../content/shots';

export function measurementsText(formData, title = 'Model Portfolio Package') {
  const preferences =
    [formData.prefEmail && 'Email', formData.prefPhone && 'Phone', formData.prefSMS && 'SMS']
      .filter(Boolean)
      .join(', ') || 'None selected';

  return `SCOUT - ${title}
=====================================

CONTACT INFORMATION
Name: ${formData.name || 'N/A'}
Email: ${formData.email || 'N/A'}
Phone: ${formData.phone || 'N/A'}
Country: ${formData.country || 'N/A'}
City: ${formData.city || 'N/A'}
Contact Preferences: ${preferences}

MEASUREMENTS
Height: ${formData.height || 'N/A'}
Measurements (Bust-Waist-Hips): ${formData.measurements || 'N/A'}
Shoe Size: ${formData.shoesize || 'N/A'}
Hair Color: ${formData.haircolor || 'N/A'}
Date of Birth: ${formData.dob || 'N/A'}

ABOUT
${formData.about || 'N/A'}

Generated: ${new Date().toLocaleString()}
`;
}

function extensionFor(file) {
  const fromName = file.name?.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/heic' || file.type === 'image/heif') return 'heic';
  return 'jpg';
}

// JSZip ships with the app rather than loading from a CDN at click time. The
// ZIP is the whole point of this page, so it must not depend on a third-party
// host being reachable. The dynamic import keeps it in its own chunk, fetched
// from our own domain only when someone actually downloads.
async function loadJsZip() {
  const { default: JSZip } = await import('jszip');
  return JSZip;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a moment to start the download before dropping the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadMeasurements(formData) {
  const blob = new Blob([measurementsText(formData, 'Model Portfolio Measurements')], {
    type: 'text/plain;charset=utf-8'
  });
  saveBlob(blob, `scout-measurements-${Date.now()}.txt`);
}

/**
 * The ZIP holds the six shots, each named after its slot, plus the
 * measurements file. Slots the applicant left empty are simply absent.
 */
export async function downloadPackage(formData, photos) {
  const JSZip = await loadJsZip();
  const zip = new JSZip();

  zip.file('measurements.txt', measurementsText(formData));

  for (const shot of SHOTS) {
    const photo = photos[shot.id];
    if (!photo) continue;
    zip.file(`${shot.file}.${extensionFor(photo.file)}`, photo.file);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const safeName = (formData.name || 'portfolio')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  saveBlob(content, `scout-${safeName || 'portfolio'}-${Date.now()}.zip`);
}
