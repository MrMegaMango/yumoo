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

// Returns a one-off client that runs DB calls with the user's JWT in context.
// This makes auth.uid() available inside SECURITY DEFINER functions and for RLS.
function getSupabaseServerClientForUser(accessToken: string) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

// Atomically deducts one art credit for userId.
// Returns the credits_remaining after deduction (>= 0), or -1 if the balance
// was already 0. Returns null when Supabase is not configured.
export async function consumeArtCredit(
  accessToken: string,
  userId: string
): Promise<number | null> {
  const client = getSupabaseServerClientForUser(accessToken);

  if (!client) {
    return null;
  }

  const { data, error } = await client.rpc("consume_art_credit", {
    target_user_id: userId
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as number;
}
