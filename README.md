# SCOUT — Model Portfolio Builder

A six-step tool that helps someone build a proper agency submission package and
then send it out **themselves**.

**Nothing is submitted to us.** There is no backend, no database, no API route
and no upload. The page runs entirely in the visitor's browser, builds a ZIP on
their own device, and points them at the agencies. Their photos and details
never leave their machine.

## The six steps

1. **Contact information** — goes into their package, not to us
2. **How to shoot your polaroids** — the six-shot guide
3. **Your six photos** — a guided shoot, one pose per screen
4. **Measurements**
5. **About you**
6. **Review & download** — the ZIP, then where to send it

Text fields auto-save to `localStorage` so a refresh does not lose progress.
Photos are held in memory only — images are far too big for the ~5 MB browser
quota, and persisting them there used to break auto-save entirely.

## The guided shoot

Step 3 walks the six shots in order, one screen each. Every screen shows the
example image, that shot's one-line instruction, and the live camera with a
faint outline of the pose laid over it to line yourself up.

- **Capture** takes the shot; then **Retake** or **Use this →**.
- Shots flagged `timer: true` in `content/shots.js` — the full-body ones — also
  offer a **10-second self-timer**, with a visible countdown you can cancel.
- **Upload a photo instead** and **Skip** are on *every* screen, so a refused
  camera permission, a device without a camera, or a pose someone would rather
  shoot later is never a dead end. The camera only opens when asked.
- **← Back** steps to the previous pose; photos already taken are still there.

Nothing here uploads. Captures are held as files in the tab's memory and go
straight into the ZIP.

## What the ZIP contains

```
01-face-front.jpg
02-face-side.jpg
03-face-smile.jpg
04-full-body-front.jpg
05-full-body-side.jpg
06-full-body-back.jpg
measurements.txt
```

Each photo keeps its own file extension. Slots left empty are simply absent —
the download still works, with a note on the review step saying what is missing.

The ZIP is built with JSZip, which ships with the app rather than loading from a
CDN: the download is the whole point of the page, so it must not depend on a
third-party host being reachable.

## Editing the content

Two files, both plain data, no React knowledge needed:

### `content/shots.js`

The six shots. Each entry has a `name`, a one-line `instruction`, the `file`
name used inside the ZIP, and an `image` for the guide card. Editing this file
changes the guide, the shoot and the ZIP filenames together.

Two images per shot, both in `public/polaroid-guide/`:

- `image` — the example card shown in the guide and beside the camera.
- `outline` — the faint shape laid over the live camera. A stroked figure on a
  transparent background, with no text or border, so it reads over any scene.

**Both sets are placeholders.** Drop real reference photos in and point `image`
at them; keep `outline` as a plain silhouette rather than reusing the photo:

```js
image: '/polaroid-guide/01-face-front.jpg',
outline: '/polaroid-guide/outline-01-face-front.svg'
```

### `content/agencies.js`

The "Where to send it" list: `name`, `place`, `url`, and an optional one-line
`note`, rendered in the order given.

⚠️ **It currently holds a starter list that nobody has verified.** Open every
link, confirm each agency is real and open to submissions, then replace the list
with the agencies you actually want to send people to.

The line *"Real agencies never ask you to pay to apply."* is fixed in the page
itself, not in this file, so an edit to the list cannot accidentally remove it.

## Environment variables

One, and it is optional. Set it in **Vercel → Settings → Environment Variables**.

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_COFFEE_URL` | A Stripe Payment Link. Unset or empty → the tip card does not render at all. |

The tip card — *"Did this help? Tip bettta CHF 1"*, with **Tip** and **No
thanks** — sits at the very bottom, after the download and after the agency
list. It never appears before the download and never blocks it. **No thanks**
dismisses it for that visit. Only `https://` URLs are accepted; anything else is
ignored and the card stays hidden.

`NEXT_PUBLIC_` values are baked into the public page, so this must be a Payment
Link URL — never a Stripe API key.

## Analytics

Vercel Web Analytics, via `@vercel/analytics`. It sets **no cookies** and stores
no identifier in the browser, so there is nothing to consent to. Enable it under
your project's Analytics tab in Vercel; locally the script 404s, which is normal.

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```
