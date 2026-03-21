import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let serverClient: SupabaseClient | null = null;

export function isSupabaseServerConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return serverClient;
}
