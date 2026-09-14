'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
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
    prefSMS: false,
    photos: []
  });
  const [mounted, setMounted] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('scoutFormData');
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading form data:', e);
      }
    }
  }, []);

  // Save to localStorage whenever formData changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('scoutFormData', JSON.stringify(formData));
    }
  }, [formData, mounted]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      alert('Camera access denied. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, dataUrl]
      }));
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const downloadMeasurements = () => {
    const text = `SCOUT - Model Portfolio Measurements
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

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `scout-measurements-${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadPackage = async () => {
    try {
      // Load jszip from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      document.head.appendChild(script);
      
      script.onload = async () => {
        const JSZip = window.JSZip;
        const zip = new JSZip();

        // Add measurements file
        const measurements = `SCOUT - Model Portfolio Package
===================================

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

        zip.file('measurements.txt', measurements);

        // Add photos
        formData.photos.forEach((photo, idx) => {
          const base64Data = photo.split(',')[1];
          zip.folder('photos').file(`photo-${idx + 1}.jpg`, base64Data, { base64: true });
        });

        // Generate and download zip
        const content = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(content);
        const element = document.createElement('a');
        element.setAttribute('href', url);
        element.setAttribute('download', `scout-portfolio-${Date.now()}.zip`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        window.URL.revokeObjectURL(url);
      };
    } catch (err) {
      alert('Error creating zip file. Please try again.');
    }
  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const progressWidth = (step / 5) * 100;

  if (!mounted) return <div>Loading...</div>;

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
            {step === 5 && 'Review & Download'}
          </h1>
          <p className={styles.stepSubtitle}>
            {step === 1 && 'Let us know how to reach you'}
            {step === 2 && 'Upload your photos or use your camera'}
            {step === 3 && 'Physical attributes'}
            {step === 4 && 'Tell us about yourself'}
            {step === 5 && 'Download your portfolio package'}
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
                required
              />
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
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="country">Country *</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map(country => (
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
              <>
                <div className={styles.uploadArea}>
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
                </div>
              </>
            ) : (
              <div className={styles.cameraContainer}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={styles.cameraVideo}
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  style={{ display: 'none' }}
                />
                <div className={styles.cameraButtons}>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className={styles.btnCapture}
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className={styles.btnCancel}
                  >
                    ✕ Close Camera
                  </button>
                </div>
              </div>
            )}
            {formData.photos.length > 0 && (
              <div className={styles.photoGrid}>
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className={styles.photoItem}>
                    <img src={photo} alt={`Photo ${idx + 1}`} />
                    <button
                      type="button"
                      className={styles.photoRemove}
                      onClick={() => removePhoto(idx)}
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
              />
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

        {/* Step 5: Review & Download */}
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

            {formData.photos.length > 0 && (
              <div className={styles.reviewSection}>
                <h3>Photos ({formData.photos.length})</h3>
                <div className={styles.photoGrid}>
                  {formData.photos.map((photo, idx) => (
                    <img key={idx} src={photo} alt={`Review ${idx + 1}`} />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.reviewSection}>
              <h3>About</h3>
              <p>{formData.about || '-'}</p>
            </div>

            <div className={styles.downloadSection}>
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
            <button onClick={prevStep} className={styles.btnBack}>
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
