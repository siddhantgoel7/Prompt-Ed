// Creates a browser-side Supabase client for use in Client Components.
// Reads public env vars; safe to call multiple times (singleton managed by @supabase/ssr).
import { createBrowserClient } from '@supabase/ssr';

/** Returns a browser Supabase client configured with the public project URL and anon key. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}