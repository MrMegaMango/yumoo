"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeStoreForGuest,
  parseStoreValue
} from "@/lib/diary";
import type { DiaryStore } from "@/lib/types";

const GUEST_DIARY_TABLE = "guest_diaries";

type GuestDiaryRow = {
  store: unknown;
};

export async function ensureAnonymousGuestId(client: SupabaseClient) {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (session?.user?.id) {
    return session.user.id;
  }

  const { data, error } = await client.auth.signInAnonymously();

  if (error) {
    throw new Error(error.message);
  }

  const guestId = data.user?.id;

  if (!guestId) {
    throw new Error("Supabase did not return an anonymous user.");
  }

  return guestId;
}

export async function fetchGuestDiaryStore(
  client: SupabaseClient,
  guestId: string
) {
  const { data, error } = await client
    .from(GUEST_DIARY_TABLE)
    .select("store")
    .eq("user_id", guestId)
    .maybeSingle<GuestDiaryRow>();

  if (error) {
    throw new Error(error.message);
  }

  const parsedStore = parseStoreValue(data?.store ?? null);

  if (!parsedStore) {
    return null;
  }

  return normalizeStoreForGuest(parsedStore, guestId);
}

export async function upsertGuestDiaryStore(
  client: SupabaseClient,
  store: DiaryStore,
  guestId: string
) {
  const normalizedStore = normalizeStoreForGuest(store, guestId);
  const { error } = await client.from(GUEST_DIARY_TABLE).upsert(
    {
      user_id: guestId,
      store: normalizedStore
    },
    {
      onConflict: "user_id"
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return normalizedStore;
}
