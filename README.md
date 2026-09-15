# SCOUT — Model Portfolio Form

A 5-step portfolio application form. Submissions are saved to Supabase
(Postgres for the details, private Storage for the photos) and the team gets an
email when one arrives.

## How a submission travels

1. The applicant fills in steps 1–4. Text fields auto-save to `localStorage` so
   a refresh does not lose their work. **Photos are deliberately not saved
   there** — images are far too big for the ~5 MB browser quota.
2. On **Submit**, the browser asks `/api/upload-url` for one-time signed upload
   URLs and sends each photo **straight to Supabase Storage**. Photos never pass
   through the serverless function, which has a 4.5 MB request cap that a couple
   of phone photos would blow straight past.
3. The browser then posts the text fields plus the uploaded photo paths to
   `/api/submit`, which validates everything, writes one row to the
   `submissions` table, and emails a notification.
4. The team reads submissions at `/admin`.

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then open
**SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql)
and run it. That creates the `submissions` table with row-level security on, and
a **private** `submissions` storage bucket.

### 2. Resend (for the notification email)

Create an account at [resend.com](https://resend.com), verify the domain you
want to send from, and create an API key.

### 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in a
local `.env.local` for development — see [`.env.example`](.env.example)).

| Variable | Required | What it is |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Project URL, from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Service role** key, same page. Mark it Sensitive |
| `SUPABASE_STORAGE_BUCKET` | no | Defaults to `submissions` |
| `ADMIN_TOKEN` | yes | Long random string gating `/admin`. Generate with `openssl rand -hex 32` |
| `NOTIFY_EMAIL` | no | Where the alert goes, e.g. `hello@bettta.ai` |
| `RESEND_API_KEY` | no | Resend API key. Mark it Sensitive |
| `NOTIFY_FROM` | no | Sender address on a domain verified with Resend |
| `APP_BASE_URL` | no | e.g. `https://model.bettta.ai`, used for the link in the email |

**Never commit any of these values.** This repository is public. The service
role key bypasses row-level security — if it leaks, every submission is exposed.
It is only ever read server-side, and is never included in the browser bundle.

If `NOTIFY_EMAIL` or `RESEND_API_KEY` is missing, submissions still save
normally — the notification is simply skipped and a warning is logged.

## Reading submissions

Go to `https://model.bettta.ai/admin?token=YOUR_ADMIN_TOKEN`. The token is then
kept in an httpOnly cookie for a week, so you only need the full link once — the
one in each notification email already includes it.

- `/admin` — every submission, newest first
- `/admin/<id>` — one applicant's full details and photos

Photos live in a private bucket and are served through short-lived signed URLs,
so they are not publicly reachable.

## What the notification email contains

Only the applicant's **name**, their **country**, and a **link to the entry**.
Photos, phone number, date of birth and everything else stay in Supabase behind
the admin login — email is not a safe place to fan out personal data.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Open http://localhost:3000.

Note that `.env.local` is gitignored and must stay that way.

## Build

```bash
npm run build
npm start
npm run lint
```

## Data notes

Submissions contain personal data (contact details, date of birth, photos of
identifiable people). Keep the service role key and admin token secret, and
delete entries you no longer need — a row can be removed from the Supabase table
editor, and its photos from the `submissions` bucket.
