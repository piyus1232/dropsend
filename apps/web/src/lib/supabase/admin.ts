import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client using the secret key. It BYPASSES Row Level Security, so
 * callers must check ownership themselves. Use only for writes users are not
 * allowed to make directly (e.g. receipt status changes) and for background
 * work that has no user session.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
