"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

import {
  createQueuedArt,
  createReadyArt,
  MOCK_ART_DELAY_MS
} from "@/lib/art";
import {
  createEmptyStore,
  parseStore,
  sortEntries,
  STORAGE_KEY
} from "@/lib/diary";
import { compressImageFile } from "@/lib/image";
import { toLocalDateString } from "@/lib/date";
import type { DiaryStore, MealEntry, SaveEntryInput } from "@/lib/types";

type DiaryContextValue = {
  ready: boolean;
  guestId: string | null;
  entries: MealEntry[];
  getEntry: (id: string) => MealEntry | undefined;
  saveEntry: (input: SaveEntryInput, existingId?: string) => Promise<MealEntry>;
  deleteEntry: (id: string) => void;
  retryArt: (id: string) => void;
  clearAll: () => void;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DiaryStore | null>(null);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const saved = parseStore(window.localStorage.getItem(STORAGE_KEY));
    setStore(saved ?? createEmptyStore());
  }, []);

  useEffect(() => {
    if (!store) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    if (!store) {
      return;
    }

    for (const entry of store.entries) {
      if (entry.art.status !== "queued" || timers.current.has(entry.id)) {
        continue;
      }

      const timeoutId = window.setTimeout(() => {
        setStore((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            entries: current.entries.map((item) => {
              if (item.id !== entry.id || item.art.status !== "queued") {
                return item;
              }

              return {
                ...item,
                art: createReadyArt(item.art, new Date().toISOString())
              };
            })
          };
        });

        timers.current.delete(entry.id);
      }, MOCK_ART_DELAY_MS + Math.round(Math.random() * 900));

      timers.current.set(entry.id, timeoutId);
    }

    for (const [entryId, timeoutId] of timers.current.entries()) {
      const stillQueued = store.entries.some(
        (entry) => entry.id === entryId && entry.art.status === "queued"
      );

      if (!stillQueued) {
        window.clearTimeout(timeoutId);
        timers.current.delete(entryId);
      }
    }
  }, [store]);

  useEffect(() => {
    return () => {
      for (const timeoutId of timers.current.values()) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  async function saveEntry(input: SaveEntryInput, existingId?: string) {
    const currentStore = store ?? createEmptyStore();
    const existingEntry = existingId
      ? currentStore.entries.find((entry) => entry.id === existingId)
      : undefined;

    let photoDataUrl = input.photoDataUrl ?? existingEntry?.photoDataUrl ?? "";

    if (input.photoFile) {
      photoDataUrl = await compressImageFile(input.photoFile);
    }

    if (!photoDataUrl) {
      throw new Error("Add a meal photo first.");
    }

    const timestamp = new Date().toISOString();
    const artSeed = `${input.caption}-${input.takenAt}-${existingEntry?.id ?? timestamp}`;
    const nextEntry: MealEntry = existingEntry
      ? {
          ...existingEntry,
          caption: input.caption.trim(),
          mood: input.mood,
          mealType: input.mealType,
          takenAt: input.takenAt,
          localDate: toLocalDateString(input.takenAt),
          photoDataUrl,
          updatedAt: timestamp,
          art: input.photoFile
            ? createQueuedArt(artSeed, timestamp)
            : { ...existingEntry.art, updatedAt: timestamp }
        }
      : {
          id: crypto.randomUUID(),
          userId: currentStore.guestId,
          caption: input.caption.trim(),
          mood: input.mood,
          mealType: input.mealType,
          takenAt: input.takenAt,
          localDate: toLocalDateString(input.takenAt),
          photoDataUrl,
          createdAt: timestamp,
          updatedAt: timestamp,
          art: createQueuedArt(artSeed, timestamp)
        };

    setStore((current) => {
      const baseStore = current ?? currentStore;
      const nextEntries = existingEntry
        ? baseStore.entries.map((entry) => (entry.id === existingEntry.id ? nextEntry : entry))
        : [nextEntry, ...baseStore.entries];

      return {
        ...baseStore,
        entries: sortEntries(nextEntries)
      };
    });

    return nextEntry;
  }

  function deleteEntry(id: string) {
    setStore((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        entries: current.entries.filter((entry) => entry.id !== id)
      };
    });
  }

  function retryArt(id: string) {
    setStore((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        entries: current.entries.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          return {
            ...entry,
            art: createQueuedArt(`${entry.caption}-${Date.now()}`, new Date().toISOString())
          };
        })
      };
    });
  }

  function clearAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    setStore(createEmptyStore());
  }

  function getEntry(id: string) {
    return store?.entries.find((entry) => entry.id === id);
  }

  return (
    <DiaryContext.Provider
      value={{
        ready: Boolean(store),
        guestId: store?.guestId ?? null,
        entries: store?.entries ?? [],
        getEntry,
        saveEntry,
        deleteEntry,
        retryArt,
        clearAll
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const context = useContext(DiaryContext);

  if (!context) {
    throw new Error("useDiary must be used inside DiaryProvider.");
  }

  return context;
}
