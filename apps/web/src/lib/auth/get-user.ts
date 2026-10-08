import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the Supabase server client and the current user's id, or a null
 * userId when there is no valid session.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  return { supabase, userId };
}
