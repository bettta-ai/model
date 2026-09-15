import { useState, useEffect, useRef, useCallback } from 'react';
import { AGENCIES } from '../content/agencies';
import { SHOTS, SHOT_BASICS } from '../content/shots';
import { downloadMeasurements, downloadPackage } from '../lib/buildPackage';
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
const TOTAL_STEPS = 6;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const SELF_TIMER_SECONDS = 10;

// Read once at module scope, with the full literal name, so Next.js can inline
// the value at build time. Empty or non-https means the button never renders.
const COFFEE_URL = process.env.NEXT_PUBLIC_COFFEE_URL || '';
const coffeeLink = /^https:\/\//.test(COFFEE_URL) ? COFFEE_URL : '';

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

const STEP_TITLES = [
  'Contact Information',
  'How to shoot your polaroids',
  'Your six photos',
  'Measurements',
  'About You',
  'Review & Download'
];

const STEP_SUBTITLES = [
  'These details go in your package, not to us',
  'Six shots, taken exactly like this',
  'One pose at a time — the camera is optional',
  'Physical attributes',
  'Tell us about yourself',
  'Download your package, then send it out yourself'
];

export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  // One File per shot slot, kept in memory only. Images are far too big for
  // localStorage, and nothing about them leaves this browser.
  const [photos, setPhotos] = useState({});
  const [mounted, setMounted] = useState(false);
  // The guided shoot walks the six shots one screen at a time.
  const [poseIndex, setPoseIndex] = useState(0);
  const [cameraStream, setCameraStream] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [photoError, setPhotoError] = useState('');
  // Browsers differ on what they can decode — Chrome and Firefox cannot show
  // HEIC, which iPhones still produce. The file is fine and goes into the ZIP
  // untouched; only the on-screen preview is unavailable.
  const [previewFailed, setPreviewFailed] = useState({});
  const [downloadError, setDownloadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const photosRef = useRef(photos);

  photosRef.current = photos;

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFormData({ ...EMPTY_FORM, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Could not restore saved form data:', error);
    }
  }, []);

  // Auto-save the text fields only. Photos are excluded on purpose: base64
  // images overflow the ~5MB localStorage quota and kill auto-save outright.
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn('Could not auto-save form data:', error);
    }
  }, [formData, mounted]);

  useEffect(
    () => () => {
      Object.values(photosRef.current).forEach((photo) => URL.revokeObjectURL(photo.url));
    },
    []
  );

  // Keep refs alongside the state so cleanup can always reach the live stream
  // and the running timer, whatever re-render order React chooses.
  streamRef.current = cameraStream;

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const setSlotPhoto = useCallback((slotId, file) => {
    const type = file.type || (/\.hei[cf]$/i.test(file.name || '') ? 'image/heic' : '');
    if (!ALLOWED_PHOTO_TYPES.includes(type)) {
      setPhotoError('That file is not a supported image (JPEG, PNG, WebP or HEIC).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(`That photo is larger than ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`);
      return;
    }

    setPhotoError('');
    setPreviewFailed((prev) => {
      if (!prev[slotId]) return prev;
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    const typed = file.type ? file : new File([file], file.name, { type });
    setPhotos((prev) => {
      if (prev[slotId]) URL.revokeObjectURL(prev[slotId].url);
      return { ...prev, [slotId]: { file: typed, url: URL.createObjectURL(typed) } };
    });
  }, []);

  const markPreviewFailed = (slotId) =>
    setPreviewFailed((prev) => ({ ...prev, [slotId]: true }));

  const removeSlotPhoto = (slotId) => {
    setPreviewFailed((prev) => {
      if (!prev[slotId]) return prev;
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setPhotos((prev) => {
      if (!prev[slotId]) return prev;
      URL.revokeObjectURL(prev[slotId].url);
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const releaseCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
  }, []);

  const startCamera = async () => {
    setPhotoError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false
      });
      setCameraStream(stream);
    } catch (err) {
      // Denied, unavailable, or no camera at all — the upload and skip routes
      // below mean this is never a dead end.
      setPhotoError('The camera is not available. You can upload a photo instead, or skip this shot.');
    }
  };

  const capturePhoto = useCallback(
    (slotId) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !video.videoWidth) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) setSlotPhoto(slotId, new File([blob], `${slotId}.jpg`, { type: 'image/jpeg' }));
          releaseCamera();
        },
        'image/jpeg',
        0.92
      );
    },
    [releaseCamera, setSlotPhoto]
  );

  // Ten seconds is enough to walk back into frame for the full-body shots.
  const startTimer = (slotId) => {
    if (timerRef.current) return;
    let remaining = SELF_TIMER_SECONDS;
    setCountdown(remaining);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCountdown(null);
        capturePhoto(slotId);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
  };

  const retake = (slotId) => {
    removeSlotPhoto(slotId);
    setPhotoError('');
    startCamera();
  };

  // Used by "Use this" and by "Skip" alike: move to the next pose, or out of
  // the shoot entirely once the last one is done.
  const leavePose = (delta) => {
    releaseCamera();
    setPhotoError('');
    const next = poseIndex + delta;
    if (next < 0) {
      setStep(2);
      setPoseIndex(0);
    } else if (next >= SHOTS.length) {
      setStep(4);
    } else {
      setPoseIndex(next);
    }
  };

  const handleDownloadZip = async () => {
    setBusy(true);
    setDownloadError('');
    try {
      await downloadPackage(formData, photos);
    } catch (error) {
      setDownloadError(error.message || 'Could not build the zip file. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadTxt = () => {
    setDownloadError('');
    try {
      downloadMeasurements(formData);
    } catch (error) {
      setDownloadError('Could not build the text file. Please try again.');
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const filledCount = SHOTS.filter((shot) => photos[shot.id]).length;

  if (!mounted) return <div className={styles.container}>Loading…</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          ></div>
        </div>

        <div className={styles.header}>
          <div className={styles.stepLabel}>
            Step {step} of {TOTAL_STEPS}
          </div>
          <h1 className={styles.stepTitle}>{STEP_TITLES[step - 1]}</h1>
          <p className={styles.stepSubtitle}>{STEP_SUBTITLES[step - 1]}</p>
        </div>

        {/* Step 1: Contact */}
        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="country">Country</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
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
                {[
                  ['prefEmail', 'Email'],
                  ['prefPhone', 'Phone'],
                  ['prefSMS', 'SMS']
                ].map(([key, label]) => (
                  <div key={key} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={key}
                      name={key}
                      checked={formData[key]}
                      onChange={handleInputChange}
                    />
                    <label htmlFor={key}>{label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Polaroid guide */}
        {step === 2 && (
          <div className={styles.step}>
            <ul className={styles.basics}>
              {SHOT_BASICS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <div className={styles.guideGrid}>
              {SHOTS.map((shot, index) => (
                <figure key={shot.id} className={styles.guideCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.image} alt={`Example: ${shot.name}`} />
                  <figcaption>
                    <span className={styles.guideNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{shot.name}</strong>
                    <span className={styles.guideInstruction}>{shot.instruction}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: the guided shoot — one pose per screen */}
        {step === 3 && (() => {
          const shot = SHOTS[poseIndex];
          const photo = photos[shot.id];
          const timerRunning = countdown !== null;

          return (
            <div className={styles.step}>
              <p className={styles.shotProgress}>
                Shot {poseIndex + 1} of {SHOTS.length} · {shot.name}
              </p>
              {/* Off-screen scratch surface the capture draws the video into. */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className={styles.poseLayout}>
                <figure className={styles.poseExample}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.image} alt={`Example: ${shot.name}`} />
                  <figcaption>Example</figcaption>
                </figure>

                <div className={styles.poseStage}>
                  {photo ? (
                    <div className={styles.poseShot}>
                      {previewFailed[shot.id] ? (
                        <span className={styles.noPreview}>Captured<br />(no preview)</span>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={photo.url}
                          alt={`Your ${shot.name} photo`}
                          onError={() => markPreviewFailed(shot.id)}
                        />
                      )}
                    </div>
                  ) : cameraStream ? (
                    <div className={styles.poseShot}>
                      <video ref={videoRef} autoPlay playsInline muted className={styles.poseVideo} />
                      {/* The pose, faint, over the live picture — line yourself
                          up with it before shooting. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shot.outline || shot.image}
                        alt=""
                        aria-hidden="true"
                        className={styles.poseOverlay}
                      />
                      {timerRunning && <span className={styles.countdown}>{countdown}</span>}
                    </div>
                  ) : (
                    <div className={styles.poseIdle}>
                      <p>{shot.instruction}</p>
                      <button type="button" className={styles.btnCapture} onClick={startCamera}>
                        📷 Open camera
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className={styles.poseInstruction}>{shot.instruction}</p>
              {photoError && <p className={styles.fieldError}>{photoError}</p>}

              <div className={styles.poseActions}>
                {photo ? (
                  <>
                    <button
                      type="button"
                      className={styles.btnCancel}
                      onClick={() => retake(shot.id)}
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      className={styles.btnCapture}
                      onClick={() => leavePose(1)}
                    >
                      Use this →
                    </button>
                  </>
                ) : cameraStream ? (
                  <>
                    {timerRunning ? (
                      <button type="button" className={styles.btnCancel} onClick={cancelTimer}>
                        Cancel timer ({countdown})
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.btnCapture}
                          onClick={() => capturePhoto(shot.id)}
                        >
                          📸 Capture
                        </button>
                        {shot.timer && (
                          <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={() => startTimer(shot.id)}
                          >
                            ⏱ {SELF_TIMER_SECONDS}s timer
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : null}
              </div>

              {/* Always available, on every screen, so the camera is never a
                  dead end. */}
              <div className={styles.poseEscapes}>
                <input
                  type="file"
                  id="poseUpload"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      releaseCamera();
                      setSlotPhoto(shot.id, file);
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => document.getElementById('poseUpload').click()}
                >
                  Upload a photo instead
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => leavePose(1)}>
                  Skip
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 4: Measurements */}
        {step === 4 && (
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
              />
            </div>
          </div>
        )}

        {/* Step 5: About */}
        {step === 5 && (
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

        {/* Step 6: Review & Download */}
        {step === 6 && (
          <div className={styles.step}>
            <div className={styles.reviewSection}>
              <h3>Contact Information</h3>
              {[
                ['Name', formData.name],
                ['Email', formData.email],
                ['Phone', formData.phone],
                ['Country', formData.country],
                ['City', formData.city]
              ].map(([label, value]) => (
                <div key={label} className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>{label}:</span>
                  <span>{value || '-'}</span>
                </div>
              ))}
            </div>

            <div className={styles.reviewSection}>
              <h3>Measurements</h3>
              {[
                ['Height', formData.height],
                ['Measurements', formData.measurements],
                ['Shoe Size', formData.shoesize],
                ['Hair Color', formData.haircolor],
                ['DOB', formData.dob]
              ].map(([label, value]) => (
                <div key={label} className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>{label}:</span>
                  <span>{value || '-'}</span>
                </div>
              ))}
            </div>

            <div className={styles.reviewSection}>
              <h3>
                Photos ({filledCount} of {SHOTS.length})
              </h3>
              <div className={styles.thumbGrid}>
                {SHOTS.map((shot, index) => (
                  <div key={shot.id} className={styles.thumb} title={shot.name}>
                    {photos[shot.id] && !previewFailed[shot.id] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photos[shot.id].url}
                        alt={shot.name}
                        onError={() => markPreviewFailed(shot.id)}
                      />
                    ) : (
                      <span
                        className={
                          photos[shot.id] ? styles.thumbNoPreview : styles.thumbMissing
                        }
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {SHOTS.some((shot) => photos[shot.id] && previewFailed[shot.id]) && (
                <p className={styles.hint}>
                  Some photos cannot be previewed in this browser (usually iPhone HEIC files).
                  They are still included in your ZIP exactly as you added them.
                </p>
              )}
              {filledCount < SHOTS.length && (
                <p className={styles.hint}>
                  {SHOTS.length - filledCount} shot
                  {SHOTS.length - filledCount === 1 ? ' is' : 's are'} still missing. You can
                  download anyway, but agencies expect all six.
                </p>
              )}
            </div>

            <div className={styles.reviewSection}>
              <h3>About</h3>
              <p className={styles.aboutText}>{formData.about || '-'}</p>
            </div>

            <div className={styles.downloadSection}>
              <h3>Download your package</h3>
              <p className={styles.hint}>
                The ZIP holds your six shots, named so agencies can read them at a glance, plus
                your measurements. It is built here in your browser — nothing is sent to us.
              </p>
              {downloadError && <p className={styles.fieldError}>{downloadError}</p>}
              <button onClick={handleDownloadZip} className={styles.btnDownloadZip} disabled={busy}>
                {busy ? 'Building…' : '📦 Download Full Package (.zip)'}
              </button>
              <button onClick={handleDownloadTxt} className={styles.btnDownloadTxt}>
                📄 Download Measurements only (.txt)
              </button>
            </div>

            <div className={styles.sendSection}>
              <h3>Where to send it</h3>
              <p className={styles.warningLine}>Real agencies never ask you to pay to apply.</p>
              <ul className={styles.agencyList}>
                {AGENCIES.map((agency) => (
                  <li key={agency.url}>
                    <a href={agency.url} target="_blank" rel="noopener noreferrer">
                      {agency.name}
                    </a>
                    <span className={styles.agencyPlace}>{agency.place}</span>
                    {agency.note && <span className={styles.agencyNote}>{agency.note}</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Optional and last on the page: never before the download, never
                in the way of it. */}
            {coffeeLink && !tipDismissed && (
              <div className={styles.tipCard}>
                <p className={styles.tipQuestion}>Did this help?</p>
                <p className={styles.tipAsk}>Tip bettta CHF 1</p>
                <div className={styles.tipActions}>
                  <a
                    href={coffeeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnTip}
                  >
                    Tip
                  </a>
                  <button
                    type="button"
                    className={styles.btnNoThanks}
                    onClick={() => setTipDismissed(true)}
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.buttonGroup}>
          {step > 1 && (
            <button
              onClick={step === 3 ? () => leavePose(-1) : prevStep}
              className={styles.btnBack}
            >
              ← Back
            </button>
          )}
          {/* Step 3 advances through "Use this" and "Skip", so it has no
              generic Next of its own. */}
          {step < TOTAL_STEPS && step !== 3 && (
            <button onClick={nextStep} className={styles.btnNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
