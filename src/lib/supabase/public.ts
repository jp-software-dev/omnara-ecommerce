import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase client for PUBLIC catalog data. It never reads cookies, so it can run inside a
 * cached function (cookies() is not allowed there) and it sees exactly what a signed-out
 * visitor sees: row-level security still applies with the anon key.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
