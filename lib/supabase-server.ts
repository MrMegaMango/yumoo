import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

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

// Returns a privileged client using the service role key (bypasses RLS).
// Only use server-side for trusted operations like webhook credit grants.
export function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
}

// Adds credits to a user via the service role. Used by the Stripe webhook.
export async function addUserCredits(
  userId: string,
  amount: number
): Promise<void> {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const { error } = await client.rpc("add_user_credits", {
    target_user_id: userId,
    amount
  });

  if (error) {
    throw new Error(error.message);
  }
}

// Returns a one-off client that runs DB calls with the user's JWT in context.
// This makes auth.uid() available inside SECURITY DEFINER functions and for RLS.
export function getSupabaseServerClientForUser(accessToken: string) {
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
