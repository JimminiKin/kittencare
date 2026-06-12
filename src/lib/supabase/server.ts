import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key.
// Import this ONLY in route handlers (app/api/**), never in client components.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
