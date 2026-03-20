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
  createFailedArt,
  createQueuedArt,
  createReadyArt
} from "@/lib/art";
import {
  createEmptyStore,
  parseStore,
  sortEntries,
  STORAGE_KEY
} from "@/lib/diary";
import { compressImageFile } from "@/lib/image";
import { toLocalDateString } from "@/lib/date";
import type {
  ArtJobInput,
  ArtJobResult,
  DiaryStore,
  MealEntry,
  SaveEntryInput
} from "@/lib/types";

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

type ArtGenerationError = {
  error?: string;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DiaryStore | null>(null);
  const requests = useRef(new Map<string, AbortController>());

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
      if (entry.art.status !== "queued" || requests.current.has(entry.id)) {
        continue;
      }

      const controller = new AbortController();
      requests.current.set(entry.id, controller);
      void requestArtGeneration(entry, controller);
    }

    for (const [entryId, controller] of requests.current.entries()) {
      const stillQueued = store.entries.some(
        (entry) => entry.id === entryId && entry.art.status === "queued"
      );

      if (!stillQueued) {
        controller.abort();
        requests.current.delete(entryId);
      }
    }
  }, [store]);

  useEffect(() => {
    return () => {
      for (const controller of requests.current.values()) {
        controller.abort();
      }

      requests.current.clear();
    };
  }, []);

  async function requestArtGeneration(
    entry: MealEntry,
    controller: AbortController
  ) {
    const payload: ArtJobInput = {
      entryId: entry.id,
      userId: entry.userId,
      photoDataUrl: entry.photoDataUrl,
      caption: entry.caption,
      mood: entry.mood,
      mealType: entry.mealType,
      promptVersion: entry.art.promptVersion,
      styleVersion: entry.art.styleVersion
    };
    const expectedJobId = entry.art.jobId;

    try {
      const response = await fetch("/api/art/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | ArtGenerationError
          | null;
        throw new Error(errorBody?.error ?? "Cute art generation did not finish.");
      }

      const result = (await response.json()) as ArtJobResult;
      const timestamp = new Date().toISOString();

      setStore((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          entries: current.entries.map((item) => {
            if (
              item.id !== entry.id ||
              item.art.status !== "queued" ||
              item.art.jobId !== expectedJobId
            ) {
              return item;
            }

            return {
              ...item,
              art: createReadyArt(item.art, timestamp, result)
            };
          })
        };
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Cute art generation did not finish.";
      const timestamp = new Date().toISOString();

      setStore((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          entries: current.entries.map((item) => {
            if (
              item.id !== entry.id ||
              item.art.status !== "queued" ||
              item.art.jobId !== expectedJobId
            ) {
              return item;
            }

            return {
              ...item,
              art: createFailedArt(item.art, timestamp, message)
            };
          })
        };
      });
    } finally {
      if (requests.current.get(entry.id) === controller) {
        requests.current.delete(entry.id);
      }
    }
  }

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

    const caption = input.caption.trim();
    const timestamp = new Date().toISOString();
    const artSeed = `${caption}-${input.takenAt}-${existingEntry?.id ?? timestamp}`;
    const shouldRefreshArt =
      !existingEntry ||
      Boolean(input.photoFile) ||
      caption !== existingEntry.caption ||
      input.mood !== existingEntry.mood ||
      input.mealType !== existingEntry.mealType;

    if (existingEntry && shouldRefreshArt) {
      abortArtRequest(existingEntry.id);
    }

    const nextEntry: MealEntry = existingEntry
      ? {
          ...existingEntry,
          caption,
          mood: input.mood,
          mealType: input.mealType,
          takenAt: input.takenAt,
          localDate: toLocalDateString(input.takenAt),
          photoDataUrl,
          updatedAt: timestamp,
          art: shouldRefreshArt
            ? createQueuedArt(artSeed, timestamp)
            : { ...existingEntry.art, updatedAt: timestamp }
        }
      : {
          id: crypto.randomUUID(),
          userId: currentStore.guestId,
          caption,
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

  function abortArtRequest(id: string) {
    const controller = requests.current.get(id);

    if (!controller) {
      return;
    }

    controller.abort();
    requests.current.delete(id);
  }

  function deleteEntry(id: string) {
    abortArtRequest(id);

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
    abortArtRequest(id);

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
    for (const entryId of Array.from(requests.current.keys())) {
      abortArtRequest(entryId);
    }

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
