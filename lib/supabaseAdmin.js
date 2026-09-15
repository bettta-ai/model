import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './env';

let client = null;

// The service-role key bypasses row-level security, so this module must only
// ever be imported from API routes and getServerSideProps — never from a
// component that ships to the browser.
export function supabaseAdmin() {
  if (!client) {
    const { url, serviceRoleKey } = supabaseConfig();
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
