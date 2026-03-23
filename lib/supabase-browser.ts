"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!browserClient) {
    try {
      browserClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      });
    } catch {
      return null;
    }
  }

  return browserClient;
}

export function buildAuthCallbackUrl(upgrade?: "google" | "email") {
  if (typeof window === "undefined") {
    return "/auth/callback";
  }

  const url = new URL("/auth/callback", window.location.origin);

  if (upgrade) {
    url.searchParams.set("upgrade", upgrade);
  }

  return url.toString();
}

export function buildSignInCallbackUrl() {
  if (typeof window === "undefined") {
    return "/auth/callback";
  }

  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("signin", "google");
  return url.toString();
}
