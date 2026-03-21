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
  mergeStores,
  normalizeStoreForGuest,
  parseStore,
  sortEntries,
  STORAGE_KEY
} from "@/lib/diary";
import {
  ensureAnonymousGuestId,
  fetchGuestDiaryStore,
  upsertGuestDiaryStore
} from "@/lib/guest-diary-db";
import { compressImageFile } from "@/lib/image";
import {
  buildAuthCallbackUrl,
  getSupabaseBrowserClient
} from "@/lib/supabase-browser";
import { useTurnstileToken } from "@/lib/turnstile-browser";
import { toLocalDateString } from "@/lib/date";
import type {
  ArtJobInput,
  ArtJobResult,
  DiaryStore,
  DiarySyncState,
  MealEntry,
  SaveEntryInput
} from "@/lib/types";

type AccountStatus = "local" | "guest" | "user";

type DiaryContextValue = {
  ready: boolean;
  accountEmail: string | null;
  accountProviders: string[];
  accountStatus: AccountStatus;
  cloudEnabled: boolean;
  guestId: string | null;
  syncError: string | null;
  syncState: DiarySyncState;
  upgradeError: string | null;
  upgradePending: boolean;
  entries: MealEntry[];
  getEntry: (id: string) => MealEntry | undefined;
  saveEntry: (input: SaveEntryInput, existingId?: string) => Promise<MealEntry>;
  deleteEntry: (id: string) => void;
  retryArt: (id: string) => void;
  clearAll: () => void;
  upgradeWithEmail: (email: string) => Promise<void>;
  upgradeWithGoogle: () => Promise<void>;
};

type ArtGenerationError = {
  error?: string;
};

const REMOTE_PERSIST_DELAY_MS = 450;

const DiaryContext = createContext<DiaryContextValue | null>(null);

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    status?: number;
  };
  const message = candidate.message?.trim();

  if (message) {
    return message;
  }

  const details = [
    candidate.code ? `code ${candidate.code}` : null,
    typeof candidate.status === "number" ? `status ${candidate.status}` : null
  ].filter(Boolean);

  return details.length > 0
    ? `${fallback} (${details.join(", ")}).`
    : fallback;
}

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountProviders, setAccountProviders] = useState<string[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(
    getSupabaseBrowserClient() ? "guest" : "local"
  );
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<DiaryStore | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<DiarySyncState>(
    getSupabaseBrowserClient() ? "connecting" : "local"
  );
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradePending, setUpgradePending] = useState(false);
  const requests = useRef(new Map<string, AbortController>());
  const supabase = useRef(getSupabaseBrowserClient());
  const turnstile = useTurnstileToken();
  const mounted = useRef(true);
  const initialSyncStarted = useRef(false);
  const syncMeta = useRef({
    guestId: null as string | null,
    lastPersistedSnapshot: "",
    persistTimerId: null as number | null,
    readyForRemoteWrite: false
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      if (syncMeta.current.persistTimerId) {
        window.clearTimeout(syncMeta.current.persistTimerId);
      }

      for (const controller of requests.current.values()) {
        controller.abort();
      }

      requests.current.clear();
    };
  }, []);

  useEffect(() => {
    const client = supabase.current;

    if (!client) {
      setAccountStatus("local");
      setAccountEmail(null);
      setAccountProviders([]);
      return;
    }

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void refreshAccountProfile();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const localStore = parseStore(window.localStorage.getItem(STORAGE_KEY)) ?? createEmptyStore();
    const client = supabase.current;

    if (!client) {
      setStore(localStore);
      setReady(true);
      setSyncState("local");
      return;
    }

    if (initialSyncStarted.current) {
      return;
    }

    void (async () => {
      let guestId: string | null = null;

      try {
        setSyncState("connecting");
        const {
          data: { session }
        } = await client.auth.getSession();

        if (!session?.user?.id && turnstile.configured && !turnstile.ready && !turnstile.error) {
          return;
        }

        if (initialSyncStarted.current) {
          return;
        }

        initialSyncStarted.current = true;
        guestId =
          session?.user?.id ??
          (await ensureAnonymousGuestId(
            client,
            turnstile.configured ? turnstile.getToken : undefined
          ));
        const remoteStore = await fetchGuestDiaryStore(client, guestId);
        const mergedStore = mergeStores(localStore, remoteStore, guestId);
        const remoteSnapshot = remoteStore ? serializeStore(remoteStore) : "";
        const mergedSnapshot = serializeStore(mergedStore);

        syncMeta.current.guestId = guestId;
        syncMeta.current.lastPersistedSnapshot = remoteSnapshot;
        syncMeta.current.readyForRemoteWrite = true;

        if (!mounted.current) {
          return;
        }

        setStore(mergedStore);
        setReady(true);
        setSyncError(null);
        setSyncState(remoteSnapshot === mergedSnapshot ? "synced" : "syncing");
        await refreshAccountProfile();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Guest diary sync could not start.";
        const fallbackStore = guestId
          ? normalizeStoreForGuest(localStore, guestId)
          : localStore;

        syncMeta.current.guestId = guestId;
        syncMeta.current.readyForRemoteWrite = false;
        syncMeta.current.lastPersistedSnapshot = "";

        if (!mounted.current) {
          return;
        }

        setStore(fallbackStore);
        setReady(true);
        setSyncState("error");
        setSyncError(message);
        await refreshAccountProfile();
      }
    })();
  }, [turnstile.configured, turnstile.error, turnstile.ready]);

  useEffect(() => {
    if (!store) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

    const client = supabase.current;
    const guestId = syncMeta.current.guestId;

    if (!client || !guestId || !syncMeta.current.readyForRemoteWrite) {
      return;
    }

    const normalizedStore = normalizeStoreForGuest(store, guestId);
    const snapshot = serializeStore(normalizedStore);

    if (snapshot === syncMeta.current.lastPersistedSnapshot) {
      if (syncState === "connecting" || syncState === "syncing") {
        setSyncState("synced");
      }
      return;
    }

    if (syncMeta.current.persistTimerId) {
      window.clearTimeout(syncMeta.current.persistTimerId);
    }

    setSyncState("syncing");

    syncMeta.current.persistTimerId = window.setTimeout(() => {
      syncMeta.current.persistTimerId = null;
      void persistRemoteStore(normalizedStore, snapshot);
    }, REMOTE_PERSIST_DELAY_MS);
  }, [store, syncState]);

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

  async function refreshAccountProfile() {
    const client = supabase.current;

    if (!client) {
      if (!mounted.current) {
        return;
      }

      setAccountStatus("local");
      setAccountEmail(null);
      setAccountProviders([]);
      setUpgradePending(false);
      return;
    }

    const { data, error } = await client.auth.getUser();

    if (!mounted.current) {
      return;
    }

    if (error) {
      setUpgradePending(false);
      setUpgradeError((currentError) => currentError ?? error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setAccountStatus("guest");
      setAccountEmail(null);
      setAccountProviders([]);
      setUpgradePending(false);
      return;
    }

    const providers = Array.from(
      new Set(
        [
          ...(user.identities ?? []).map((identity) => identity.provider),
          ...(Array.isArray(user.app_metadata?.providers)
            ? user.app_metadata.providers
            : [])
        ].filter((provider): provider is string => Boolean(provider))
      )
    ).sort();

    setAccountStatus(user.is_anonymous ? "guest" : "user");
    setAccountEmail(user.email ?? null);
    setAccountProviders(providers);
    setUpgradePending(false);

    if (!user.is_anonymous) {
      setUpgradeError(null);
    }
  }

  async function upgradeWithGoogle() {
    const client = supabase.current;

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    setUpgradePending(true);
    setUpgradeError(null);

    const { error } = await client.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: buildAuthCallbackUrl("google")
      }
    });

    if (error) {
      const message = getAuthErrorMessage(
        error,
        "Google linking could not start."
      );
      console.error("Supabase Google link failed:", error);

      if (mounted.current) {
        setUpgradePending(false);
        setUpgradeError(message);
      }

      throw new Error(message);
    }
  }

  async function upgradeWithEmail(email: string) {
    const client = supabase.current;
    const normalizedEmail = email.trim().toLowerCase();

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address first.");
    }

    setUpgradePending(true);
    setUpgradeError(null);

    try {
      const { error } = await client.auth.updateUser(
        { email: normalizedEmail },
        {
          emailRedirectTo: buildAuthCallbackUrl("email")
        }
      );

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "Email delivery failed. Check Supabase SMTP settings and auth logs."
      );
      console.error("Supabase email upgrade failed:", error);

      if (mounted.current) {
        setUpgradeError(message);
      }

      throw new Error(message);
    } finally {
      if (mounted.current) {
        setUpgradePending(false);
      }
    }
  }

  async function persistRemoteStore(nextStore: DiaryStore, snapshot: string) {
    const client = supabase.current;
    const guestId = syncMeta.current.guestId;

    if (!client || !guestId) {
      return;
    }

    try {
      const persistedStore = await upsertGuestDiaryStore(client, nextStore, guestId);
      syncMeta.current.lastPersistedSnapshot = snapshot;

      if (!mounted.current) {
        return;
      }

      setSyncError(null);
      setSyncState("synced");

      setStore((current) => {
        if (!current) {
          return current;
        }

        const currentSnapshot = serializeStore(normalizeStoreForGuest(current, guestId));
        return currentSnapshot === snapshot ? persistedStore : current;
      });
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      setSyncState("error");
      setSyncError(
        error instanceof Error
          ? error.message
          : "Guest diary sync failed."
      );
    }
  }

  async function requestArtGeneration(
    entry: MealEntry,
    controller: AbortController
  ) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
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
      const client = supabase.current;

      if (client) {
        const {
          data: { session }
        } = await client.auth.getSession();

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch("/api/art/generate", {
        method: "POST",
        headers,
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
    const currentStore =
      store ??
      createEmptyStore(syncMeta.current.guestId ?? undefined);
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

    const nextGuestId = syncMeta.current.guestId ?? store?.guestId;

    window.localStorage.removeItem(STORAGE_KEY);
    setStore(createEmptyStore(nextGuestId ?? undefined));
  }

  function getEntry(id: string) {
    return store?.entries.find((entry) => entry.id === id);
  }

  return (
    <DiaryContext.Provider
      value={{
        ready,
        accountEmail,
        accountProviders,
        accountStatus,
        cloudEnabled: Boolean(syncMeta.current.readyForRemoteWrite),
        guestId: store?.guestId ?? null,
        syncError,
        syncState,
        upgradeError,
        upgradePending,
        entries: store?.entries ?? [],
        getEntry,
        saveEntry,
        deleteEntry,
        retryArt,
        clearAll,
        upgradeWithEmail,
        upgradeWithGoogle
      }}
    >
      {children}
      {turnstile.configured ? (
        <div
          ref={turnstile.containerRef}
          aria-hidden="true"
          className="pointer-events-none fixed bottom-0 right-0 h-0 w-0 opacity-0"
        />
      ) : null}
    </DiaryContext.Provider>
  );
}

function serializeStore(store: DiaryStore) {
  return JSON.stringify(store);
}

export function useDiary() {
  const context = useContext(DiaryContext);

  if (!context) {
    throw new Error("useDiary must be used inside DiaryProvider.");
  }

  return context;
}
