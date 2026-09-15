// The six polaroid shots, in order.
//
// EDIT THIS FILE to change the shot list, the instructions, or the guide
// images. Everything else — the guide step, the upload slots and the names
// inside the ZIP — is generated from here.
//
// `file` becomes the filename inside the ZIP (the applicant's own extension is
// appended, so 01-face-front.jpg for a JPEG).
// `image` is the guide picture, served from the public/ folder. Replace the
// placeholder SVGs with real reference photos and update the path here.
// `outline` is the faint shape laid over the live camera to line the pose up.
// It defaults to `image`; once `image` is a real photo, point this at a
// dedicated silhouette so the overlay stays readable.
// `timer` offers the 10-second self-timer — on for the shots nobody can reach
// the shutter for.

export const SHOTS = [
  {
    id: 'face-front',
    file: '01-face-front',
    name: 'Face, front',
    instruction: 'Look straight into the camera, neutral expression, hair back off your face.',
    image: '/polaroid-guide/01-face-front.svg',
    outline: '/polaroid-guide/outline-01-face-front.svg'
  },
  {
    id: 'face-side',
    file: '02-face-side',
    name: 'Face, side',
    instruction: 'Turn your head a full 90° to one side, chin level, still looking ahead.',
    image: '/polaroid-guide/02-face-side.svg',
    outline: '/polaroid-guide/outline-02-face-side.svg'
  },
  {
    id: 'face-smile',
    file: '03-face-smile',
    name: 'Face, smiling',
    instruction: 'Straight to camera again, this time with a natural smile showing your teeth.',
    image: '/polaroid-guide/03-face-smile.svg',
    outline: '/polaroid-guide/outline-03-face-smile.svg'
  },
  {
    id: 'full-body-front',
    file: '04-full-body-front',
    name: 'Full body, front',
    instruction: 'Head to toe, facing the camera, arms relaxed at your sides, feet together.',
    image: '/polaroid-guide/04-full-body-front.svg',
    outline: '/polaroid-guide/outline-04-full-body-front.svg',
    timer: true
  },
  {
    id: 'full-body-side',
    file: '05-full-body-side',
    name: 'Full body, side',
    instruction: 'Head to toe, turned 90° to one side, arms hanging naturally.',
    image: '/polaroid-guide/05-full-body-side.svg',
    outline: '/polaroid-guide/outline-05-full-body-side.svg',
    timer: true
  },
  {
    id: 'full-body-back',
    file: '06-full-body-back',
    name: 'Full body, back',
    instruction: 'Head to toe with your back to the camera, standing straight, arms at your sides.',
    image: '/polaroid-guide/06-full-body-back.svg',
    outline: '/polaroid-guide/outline-06-full-body-back.svg',
    timer: true
  }
];

// Shooting advice shown once at the top of the guide.
export const SHOT_BASICS = [
  'Daylight, facing a window. No filters, no flash, no editing.',
  'Plain wall behind you. Tidy, uncluttered background.',
  'Fitted plain clothes — jeans and a plain top, or swimwear. No heavy makeup.',
  'Ask someone to take them, phone held at your chest height, portrait orientation.'
];
