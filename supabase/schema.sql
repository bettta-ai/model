-- SCOUT submissions schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  name                text not null,
  email               text not null,
  country             text not null,
  city                text,
  phone               text,
  height              text,
  measurements        text,
  shoe_size           text,
  hair_color          text,
  date_of_birth       date,
  about               text,
  contact_preferences text[] not null default '{}',
  -- Object paths inside the private storage bucket, not public URLs.
  photo_paths         text[] not null default '{}'
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

-- Lock the table down. The app talks to it only through API routes using the
-- service-role key, which bypasses RLS. With RLS on and no policies, the
-- public anon key can neither read nor write this table — so even if the anon
-- key leaks, applicant data stays private.
alter table public.submissions enable row level security;

-- Private bucket for the photos. Nothing in it is publicly readable; the admin
-- pages hand out short-lived signed URLs instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  12582912, -- 12 MB, matches MAX_PHOTO_BYTES in lib/env.js
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies are created on purpose: uploads happen through
-- server-minted signed upload URLs, and reads through server-minted signed
-- download URLs. Both are authorised by their token, not by a policy.
