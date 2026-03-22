import {
  getCurrentYearMonth,
  getYearMonthKey,
  toLocalDateString
} from "@/lib/date";
import {
  ART_PROMPT_VERSION,
  ART_STYLE_VERSION,
  pickPalette
} from "@/lib/art";
import type { DiaryStore, MealEntry } from "@/lib/types";

export const STORAGE_KEY = "yumoo.v1";

export function createEmptyStore(guestId = crypto.randomUUID()): DiaryStore {
  return {
    version: 1,
    guestId,
    entries: []
  };
}

export function parseStore(rawValue: string | null): DiaryStore | null {
  if (!rawValue) {
    return null;
  }

  try {
    return parseStoreValue(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function parseStoreValue(rawValue: unknown): DiaryStore | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = rawValue as DiaryStore;
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries) || typeof parsed.guestId !== "string") {
      return null;
    }

    return {
      version: 1,
      guestId: parsed.guestId,
      entries: sortEntries(parsed.entries.map(normalizeEntry))
    };
  } catch {
    return null;
  }
}

function normalizeEntry(raw: MealEntry): MealEntry {
  // At runtime, legacy entries stored in localStorage may be missing required art
  // fields even though the TypeScript type marks them as required. Guard defensively.
  const art = raw.art as Partial<MealEntry["art"]> | undefined;
  if (art?.jobId && art.status && art.palette && art.updatedAt) {
    return raw;
  }
  const now = new Date().toISOString();
  return {
    ...raw,
    art: {
      jobId: art?.jobId ?? crypto.randomUUID(),
      status: art?.status ?? "failed",
      promptVersion: art?.promptVersion ?? ART_PROMPT_VERSION,
      styleVersion: art?.styleVersion ?? ART_STYLE_VERSION,
      palette: art?.palette ?? pickPalette(raw.id ?? ""),
      updatedAt: art?.updatedAt ?? raw.updatedAt ?? now,
      imageDataUrl: art?.imageDataUrl,
      provider: art?.provider,
      model: art?.model,
      metadata: art?.metadata,
      error: art?.error
    }
  };
}

export function normalizeStoreForGuest(store: DiaryStore, guestId: string): DiaryStore {
  return {
    version: 1,
    guestId,
    entries: sortEntries(
      store.entries.map((entry) => ({
        ...entry,
        userId: guestId
      }))
    )
  };
}

export function mergeStores(
  localStore: DiaryStore | null,
  remoteStore: DiaryStore | null,
  guestId: string
) {
  const mergedEntries = new Map<string, MealEntry>();

  for (const sourceStore of [remoteStore, localStore]) {
    for (const entry of sourceStore?.entries ?? []) {
      const current = mergedEntries.get(entry.id);

      if (!current || new Date(entry.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
        mergedEntries.set(entry.id, {
          ...entry,
          userId: guestId
        });
      }
    }
  }

  return normalizeStoreForGuest(
    {
      version: 1,
      guestId,
      entries: Array.from(mergedEntries.values())
    },
    guestId
  );
}

export function sortEntries(entries: MealEntry[]) {
  return [...entries].sort((left, right) => {
    return new Date(right.takenAt).getTime() - new Date(left.takenAt).getTime();
  });
}

export function getEntriesForDay(entries: MealEntry[], localDate: string) {
  return sortEntries(entries.filter((entry) => entry.localDate === localDate));
}

export function getEntriesForYearMonth(entries: MealEntry[], yearMonth: string) {
  return sortEntries(entries.filter((entry) => getYearMonthKey(entry.localDate) === yearMonth));
}

export function getDaysLoggedCount(entries: MealEntry[]) {
  return new Set(entries.map((entry) => entry.localDate)).size;
}

export function getDaysLoggedThisMonth(entries: MealEntry[]) {
  return getDaysLoggedCount(getEntriesForYearMonth(entries, getCurrentYearMonth()));
}

export function getCurrentStreak(entries: MealEntry[]) {
  const uniqueDates = [...new Set(entries.map((entry) => entry.localDate))].sort();
  if (uniqueDates.length === 0) {
    return 0;
  }

  const dateSet = new Set(uniqueDates);
  let cursor = new Date();

  if (!dateSet.has(toLocalDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (dateSet.has(toLocalDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
