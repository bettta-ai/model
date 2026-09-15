import { useState, useEffect, useRef, useCallback } from 'react';
import { submitApplication } from '../lib/submitForm';
import styles from '../styles/form.module.css';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic',
  'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Macao', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const STORAGE_KEY = 'scoutFormData';
const MAX_PHOTOS = 12;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const EMPTY_FORM = {
  name: '',
  email: '',
  country: '',
  city: '',
  phone: '',
  height: '',
  measurements: '',
  shoesize: '',
  haircolor: '',
  dob: '',
  about: '',
  prefEmail: false,
  prefPhone: false,
  prefSMS: false
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  // Photos are kept as File objects in memory, deliberately outside formData.
  // They are far too large for localStorage and are uploaded straight to
  // storage on submit.
  const [photos, setPhotos] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const photosRef = useRef(photos);

  photosRef.current = photos;

  // Restore the text fields from a previous visit.
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge onto the defaults so an older saved shape cannot leave a
        // controlled input with an undefined value.
        setFormData({ ...EMPTY_FORM, ...parsed, photos: undefined });
      }
    } catch (error) {
      console.error('Could not restore saved form data:', error);
    }
  }, []);

  // Auto-save the text fields. Photos are excluded on purpose: base64 images
  // blow past the ~5MB localStorage quota and used to kill auto-save silently.
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn('Could not auto-save form data:', error);
    }
  }, [formData, mounted]);

  // Release the preview URLs when the page goes away.
  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    },
    []
  );

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const addPhotos = useCallback((files) => {
    setPhotoError('');
    setPhotos((prev) => {
      const accepted = [];
      let error = '';

      for (const file of files) {
        if (prev.length + accepted.length >= MAX_PHOTOS) {
          error = `You can upload at most ${MAX_PHOTOS} photos.`;
          break;
        }
        // Some phones report an empty type for HEIC; fall back to the extension.
        const type = file.type || (/\.hei[cf]$/i.test(file.name) ? 'image/heic' : '');
        if (!ALLOWED_PHOTO_TYPES.includes(type)) {
          error = `${file.name} is not a supported image (JPEG, PNG, WebP or HEIC).`;
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          error = `${file.name} is larger than ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`;
          continue;
        }
        const typed = file.type ? file : new File([file], file.name, { type });
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: typed,
          url: URL.createObjectURL(typed)
        });
      }

      if (error) setPhotoError(error);
      return accepted.length ? [...prev, ...accepted] : prev;
    });
  }, []);

  const handlePhotoUpload = (e) => {
    addPhotos(Array.from(e.target.files));
    // Let the same file be picked again after it is removed.
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addPhotos(Array.from(e.dataTransfer.files));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setPhotoError('Camera access was denied. Please check your browser permissions.');
    }
  };

  // Attach the stream once the <video> element has actually rendered.
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        addPhotos([new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((photo) => photo.id !== id);
    });
  };

  const summaryText = (title) => `SCOUT - ${title}
=====================================

CONTACT INFORMATION
Name: ${formData.name || 'N/A'}
Email: ${formData.email || 'N/A'}
Phone: ${formData.phone || 'N/A'}
Country: ${formData.country || 'N/A'}
City: ${formData.city || 'N/A'}
Contact Preferences: ${[formData.prefEmail && 'Email', formData.prefPhone && 'Phone', formData.prefSMS && 'SMS'].filter(Boolean).join(', ') || 'None selected'}

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

  const triggerDownload = (href, filename) => {
    const element = document.createElement('a');
    element.setAttribute('href', href);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadMeasurements = () => {
    const blob = new Blob([summaryText('Model Portfolio Measurements')], {
      type: 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `scout-measurements-${Date.now()}.txt`);
    URL.revokeObjectURL(url);
  };

  const loadJsZip = () =>
    new Promise((resolve, reject) => {
      if (window.JSZip) return resolve(window.JSZip);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error('Could not load the zip library.'));
      document.head.appendChild(script);
    });

  const downloadPackage = async () => {
    try {
      const JSZip = await loadJsZip();
      const zip = new JSZip();
      zip.file('measurements.txt', summaryText('Model Portfolio Package'));

      photos.forEach((photo, index) => {
        const extension = photo.file.name?.split('.').pop() || 'jpg';
        zip.folder('photos').file(`photo-${index + 1}.${extension}`, photo.file);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      triggerDownload(url, `scout-portfolio-${Date.now()}.zip`);
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus({ state: 'error', message: 'Could not build the zip file. Please try again.' });
    }
  };

  const validateRequired = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Please enter your name.';
    if (!formData.email.trim()) errors.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(formData.email.trim())) errors.email = 'That email does not look right.';
    if (!formData.country) errors.country = 'Please choose your country.';
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateRequired();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus({ state: 'error', message: 'Some required details are missing on step 1.' });
      setStep(1);
      return;
    }

    setFieldErrors({});
    setStatus({ state: 'submitting', message: 'Sending your application…' });

    try {
      await submitApplication({
        formData,
        photos,
        onProgress: (done, total) =>
          setStatus({ state: 'submitting', message: `Uploading photo ${done} of ${total}…` })
      });

      setStatus({ state: 'success', message: '' });
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPhotos([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Could not clear saved form data:', error);
      }
    } catch (error) {
      if (error.fields) setFieldErrors(error.fields);
      setStatus({ state: 'error', message: error.message });
    }
  };

  const startOver = () => {
    setFormData(EMPTY_FORM);
    setStatus({ state: 'idle', message: '' });
    setStep(1);
  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const progressWidth = (step / 5) * 100;
  const submitting = status.state === 'submitting';

  if (!mounted) return <div className={styles.container}>Loading…</div>;

  if (status.state === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successBox}>
            <h1>Application received</h1>
            <p>
              Thank you. Your details and photos have been sent to the SCOUT team. We will be in
              touch at the contact details you provided.
            </p>
            <button type="button" onClick={startOver} className={styles.btnNext}>
              Submit another application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressWidth}%` }}></div>
        </div>

        <div className={styles.header}>
          <div className={styles.stepLabel}>Step {step} of 5</div>
          <h1 className={styles.stepTitle}>
            {step === 1 && 'Contact Information'}
            {step === 2 && 'Photos'}
            {step === 3 && 'Measurements'}
            {step === 4 && 'About You'}
            {step === 5 && 'Review & Submit'}
          </h1>
          <p className={styles.stepSubtitle}>
            {step === 1 && 'Let us know how to reach you'}
            {step === 2 && 'Upload your photos or use your camera'}
            {step === 3 && 'Physical attributes'}
            {step === 4 && 'Tell us about yourself'}
            {step === 5 && 'Check your details, then send them to us'}
          </p>
        </div>

        {/* Step 1: Contact */}
        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              {fieldErrors.name && <p className={styles.fieldError}>{fieldErrors.name}</p>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.email)}
                required
              />
              {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="country">Country *</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.country)}
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {fieldErrors.country && <p className={styles.fieldError}>{fieldErrors.country}</p>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                placeholder="Your city"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone</label>
              <input
                type="text"
                id="phone"
                name="phone"
                placeholder="Your phone number"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Contact Preference</label>
              <div className={styles.checkboxGroup}>
                <div className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id="prefEmail"
                    name="prefEmail"
                    checked={formData.prefEmail}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="prefEmail">Email</label>
                </div>
                <div className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id="prefPhone"
                    name="prefPhone"
                    checked={formData.prefPhone}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="prefPhone">Phone</label>
                </div>
                <div className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id="prefSMS"
                    name="prefSMS"
                    checked={formData.prefSMS}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="prefSMS">SMS</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <div className={styles.step}>
            {!showCamera ? (
              <div
                className={styles.uploadArea}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <p>📸 Drag photos here or click to browse</p>
                <input
                  type="file"
                  id="photoInput"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('photoInput').click()}
                  className={styles.uploadBtn}
                >
                  Choose Photos
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className={styles.uploadBtn}
                  style={{ marginTop: '12px' }}
                >
                  📷 Use Camera
                </button>
                <p className={styles.hint}>
                  Up to {MAX_PHOTOS} photos, {MAX_PHOTO_BYTES / 1024 / 1024} MB each.
                </p>
              </div>
            ) : (
              <div className={styles.cameraContainer}>
                <video ref={videoRef} autoPlay playsInline muted className={styles.cameraVideo} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className={styles.cameraButtons}>
                  <button type="button" onClick={capturePhoto} className={styles.btnCapture}>
                    📸 Capture Photo
                  </button>
                  <button type="button" onClick={stopCamera} className={styles.btnCancel}>
                    ✕ Close Camera
                  </button>
                </div>
              </div>
            )}

            {photoError && <p className={styles.fieldError}>{photoError}</p>}

            {photos.length > 0 && (
              <div className={styles.photoGrid}>
                {photos.map((photo, idx) => (
                  <div key={photo.id} className={styles.photoItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={`Photo ${idx + 1}`} />
                    <button
                      type="button"
                      className={styles.photoRemove}
                      onClick={() => removePhoto(photo.id)}
                      aria-label={`Remove photo ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Measurements */}
        {step === 3 && (
          <div className={styles.step}>
            <div className={styles.formGroup}>
              <label htmlFor="height">Height</label>
              <input
                type="text"
                id="height"
                name="height"
                placeholder={'e.g., 5\'10"'}
                value={formData.height}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="measurements">Measurements</label>
              <input
                type="text"
                id="measurements"
                name="measurements"
                placeholder="e.g., 36-28-36"
                value={formData.measurements}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="shoesize">Shoe Size</label>
              <input
                type="text"
                id="shoesize"
                name="shoesize"
                placeholder="e.g., US 10"
                value={formData.shoesize}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="haircolor">Hair Color</label>
              <select
                id="haircolor"
                name="haircolor"
                value={formData.haircolor}
                onChange={handleInputChange}
              >
                <option value="">Select hair color</option>
                <option value="Black">Black</option>
                <option value="Brown">Brown</option>
                <option value="Blonde">Blonde</option>
                <option value="Red">Red</option>
                <option value="Grey">Grey</option>
                <option value="Any">Any</option>
                <option value="Pattern">Pattern</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="dob">Date of Birth</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.dob)}
              />
              {fieldErrors.dob && <p className={styles.fieldError}>{fieldErrors.dob}</p>}
            </div>
          </div>
        )}

        {/* Step 4: About */}
        {step === 4 && (
          <div className={styles.step}>
            <div className={styles.formGroup}>
              <label htmlFor="about">About You</label>
              <textarea
                id="about"
                name="about"
                placeholder="Tell us about yourself..."
                value={formData.about}
                onChange={handleInputChange}
                rows={6}
              />
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div className={styles.step}>
            <div className={styles.reviewSection}>
              <h3>Contact Information</h3>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Name:</span>
                <span>{formData.name || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Email:</span>
                <span>{formData.email || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Phone:</span>
                <span>{formData.phone || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Country:</span>
                <span>{formData.country || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>City:</span>
                <span>{formData.city || '-'}</span>
              </div>
            </div>

            <div className={styles.reviewSection}>
              <h3>Measurements</h3>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Height:</span>
                <span>{formData.height || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Measurements:</span>
                <span>{formData.measurements || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Shoe Size:</span>
                <span>{formData.shoesize || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Hair Color:</span>
                <span>{formData.haircolor || '-'}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>DOB:</span>
                <span>{formData.dob || '-'}</span>
              </div>
            </div>

            {photos.length > 0 && (
              <div className={styles.reviewSection}>
                <h3>Photos ({photos.length})</h3>
                <div className={styles.photoGrid}>
                  {photos.map((photo, idx) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={photo.id} src={photo.url} alt={`Review ${idx + 1}`} />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.reviewSection}>
              <h3>About</h3>
              <p>{formData.about || '-'}</p>
            </div>

            {/* Honeypot: hidden from people, tempting to bots. */}
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={formData.website || ''}
                onChange={handleInputChange}
              />
            </div>

            {status.state === 'error' && <p className={styles.formError}>{status.message}</p>}
            {submitting && <p className={styles.formStatus}>{status.message}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              className={styles.btnSubmit}
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Submit application'}
            </button>

            <div className={styles.downloadSection}>
              <p className={styles.hint}>Optional: keep a copy for yourself.</p>
              <button onClick={downloadMeasurements} className={styles.btnDownloadTxt}>
                📄 Download Measurements (.txt)
              </button>
              <button onClick={downloadPackage} className={styles.btnDownloadZip}>
                📦 Download Full Package (.zip)
              </button>
            </div>
          </div>
        )}

        <div className={styles.buttonGroup}>
          {step > 1 && (
            <button onClick={prevStep} className={styles.btnBack} disabled={submitting}>
              ← Back
            </button>
          )}
          {step < 5 && (
            <button onClick={nextStep} className={styles.btnNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
