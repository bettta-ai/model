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
3. **Your six photos** — one slot per shot
4. **Measurements**
5. **About you**
6. **Review & download** — the ZIP, then where to send it

Text fields auto-save to `localStorage` so a refresh does not lose progress.
Photos are held in memory only — images are far too big for the ~5 MB browser
quota, and persisting them there used to break auto-save entirely.

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
changes the guide, the upload slots and the ZIP filenames together.

**The guide images in `public/polaroid-guide/` are placeholders** — plain grey
figures marked PLACEHOLDER. Drop real reference photos into that folder and
point `image` at them:

```js
image: '/polaroid-guide/01-face-front.jpg'
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
| `NEXT_PUBLIC_COFFEE_URL` | A Stripe Payment Link. Unset or empty → the coffee button does not render at all. |

The button sits at the very bottom, after the download and after the agency
list. It never appears before the download and never blocks it. Only `https://`
URLs are accepted; anything else is ignored and the button stays hidden.

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
