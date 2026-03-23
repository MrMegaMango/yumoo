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
  buildSignInCallbackUrl,
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
  creditsRemaining: number | null;
  guestId: string | null;
  syncError: string | null;
  syncState: DiarySyncState;
  upgradeError: string | null;
  upgradePending: boolean;
  pendingEmailUpgrade: string | null;
  signInError: string | null;
  signInPending: boolean;
  pendingEmailSignIn: string | null;
  entries: MealEntry[];
  getEntry: (id: string) => MealEntry | undefined;
  saveEntry: (input: SaveEntryInput, existingId?: string) => Promise<MealEntry>;
  deleteEntry: (id: string) => void;
  retryArt: (id: string) => void;
  clearAll: () => void;
  upgradeWithEmail: (email: string) => Promise<void>;
  verifyEmailUpgradeCode: (code: string) => Promise<void>;
  resendEmailUpgradeCode: () => Promise<void>;
  cancelEmailUpgrade: () => void;
  upgradeWithGoogle: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  verifySignInCode: (code: string) => Promise<void>;
  resendSignInCode: () => Promise<void>;
  cancelEmailSignIn: () => void;
};

type ArtGenerationError = {
  error?: string;
};

const REMOTE_PERSIST_DELAY_MS = 450;
const PENDING_EMAIL_UPGRADE_KEY = "yumoo.pending-email-upgrade.v1";
const PENDING_EMAIL_SIGNIN_KEY = "yumoo.pending-email-signin.v1";
const REFERRAL_CODE_KEY = "yumoo.referral-code.v1";

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

/**
 * Persist the diary store to localStorage. If the write fails due to quota,
 * retries with progressively stripped versions (drop art images, then photos
 * from older entries). Never throws — a failed write is better than a crash.
 */
function safeWriteStore(store: DiaryStore): void {
  const attempts: Array<() => string> = [
    // 1. Full fidelity
    () => JSON.stringify(store),
    // 2. Strip art images from all but the 5 newest entries
    () =>
      JSON.stringify({
        ...store,
        entries: store.entries.map((e, i) =>
          i < 5 ? e : { ...e, art: { ...e.art, imageDataUrl: undefined } }
        ),
      }),
    // 3. Strip all art images
    () =>
      JSON.stringify({
        ...store,
        entries: store.entries.map((e) => ({
          ...e,
          art: { ...e.art, imageDataUrl: undefined },
        })),
      }),
    // 4. Strip photos and art images from all but the 5 newest entries
    () =>
      JSON.stringify({
        ...store,
        entries: store.entries.map((e, i) =>
          i < 5
            ? e
            : {
                ...e,
                photoDataUrl: undefined as unknown as string,
                art: { ...e.art, imageDataUrl: undefined },
              }
        ),
      }),
  ];

  for (const serialize of attempts) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize());
      return;
    } catch (err) {
      if (
        !(err instanceof DOMException) ||
        (err.name !== "QuotaExceededError" && err.code !== 22)
      ) {
        // Unexpected error — rethrow
        throw err;
      }
      // Quota exceeded — try next stripped version
    }
  }

  // All attempts exhausted. Log and continue without persisting locally.
  console.warn(
    "[yumoo] localStorage quota exceeded — diary not persisted locally this cycle."
  );
}

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountProviders, setAccountProviders] = useState<string[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(
    getSupabaseBrowserClient() ? "guest" : "local"
  );
  const [pendingEmailUpgrade, setPendingEmailUpgrade] = useState<string | null>(
    null
  );
  const [pendingEmailSignIn, setPendingEmailSignIn] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInPending, setSignInPending] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
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
  const previousIsAnonymous = useRef<boolean | null>(null);
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
    const savedEmail = window.localStorage.getItem(PENDING_EMAIL_UPGRADE_KEY);
    setPendingEmailUpgrade(savedEmail?.trim().toLowerCase() || null);
    const savedSignInEmail = window.localStorage.getItem(PENDING_EMAIL_SIGNIN_KEY);
    setPendingEmailSignIn(savedSignInEmail?.trim().toLowerCase() || null);

    // Capture referral code from URL and store for later redemption on upgrade
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref?.trim()) {
      window.localStorage.setItem(REFERRAL_CODE_KEY, ref.trim());
    }
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
        await refreshCredits(guestId);
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
        if (guestId) await refreshCredits(guestId);
      }
    })();
  }, [turnstile.configured, turnstile.error, turnstile.ready]);

  useEffect(() => {
    if (!store) {
      return;
    }

    safeWriteStore(store);

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
      persistPendingEmailUpgrade(null);
      setUpgradeError(null);

      // Detect anonymous → real account transition and redeem any pending referral
      if (previousIsAnonymous.current === true) {
        void redeemReferralIfPresent(user.id);
      }
    }

    previousIsAnonymous.current = user.is_anonymous ?? true;
  }

  async function redeemReferralIfPresent(userId: string) {
    const code = window.localStorage.getItem(REFERRAL_CODE_KEY);

    if (!code) {
      return;
    }

    // Remove immediately so we don't retry on subsequent profile refreshes
    window.localStorage.removeItem(REFERRAL_CODE_KEY);

    const client = supabase.current;

    if (!client) {
      return;
    }

    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    try {
      await fetch("/api/referral/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ code, userId })
      });
    } catch {
      // Non-critical — referral reward is best-effort
    }
  }

  async function refreshCredits(userId: string) {
    const client = supabase.current;

    if (!client) {
      return;
    }

    const { data } = await client
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", userId)
      .maybeSingle<{ credits_remaining: number }>();

    if (!mounted.current) {
      return;
    }

    // If no row exists yet the user hasn't generated art; they start with 10.
    setCreditsRemaining(data?.credits_remaining ?? 10);
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
      const { error } = await client.auth.updateUser({
        email: normalizedEmail
      });

      if (error) {
        throw error;
      }

      persistPendingEmailUpgrade(normalizedEmail);
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

  async function verifyEmailUpgradeCode(code: string) {
    const client = supabase.current;
    const normalizedEmail = pendingEmailUpgrade?.trim().toLowerCase();
    const normalizedCode = code.replace(/\s+/g, "");

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    if (!normalizedEmail) {
      throw new Error("Send a code to your email first.");
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new Error("Enter the 6-digit code from your email.");
    }

    setUpgradePending(true);
    setUpgradeError(null);

    try {
      const { error } = await client.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "email_change"
      });

      if (error) {
        throw error;
      }

      persistPendingEmailUpgrade(null);
      await refreshAccountProfile();
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "That code could not be verified. Request a fresh one and try again."
      );
      console.error("Supabase email OTP verification failed:", error);

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

  async function resendEmailUpgradeCode() {
    const client = supabase.current;
    const normalizedEmail = pendingEmailUpgrade?.trim().toLowerCase();

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    if (!normalizedEmail) {
      throw new Error("Enter an email address first.");
    }

    setUpgradePending(true);
    setUpgradeError(null);

    try {
      const { error } = await client.auth.resend({
        type: "email_change",
        email: normalizedEmail
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "A fresh code could not be sent. Check Supabase auth logs and try again."
      );
      console.error("Supabase email OTP resend failed:", error);

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

  function cancelEmailUpgrade() {
    persistPendingEmailUpgrade(null);
    setUpgradeError(null);
  }

  async function signInWithGoogle() {
    const client = supabase.current;

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    setSignInPending(true);
    setSignInError(null);

    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildSignInCallbackUrl()
      }
    });

    if (error) {
      const message = getAuthErrorMessage(error, "Google sign-in could not start.");
      console.error("Supabase Google sign-in failed:", error);

      if (mounted.current) {
        setSignInPending(false);
        setSignInError(message);
      }

      throw new Error(message);
    }
  }

  async function signInWithEmail(email: string) {
    const client = supabase.current;
    const normalizedEmail = email.trim().toLowerCase();

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address first.");
    }

    setSignInPending(true);
    setSignInError(null);

    try {
      const captchaToken = turnstile.configured ? await turnstile.getToken() : null;
      const { error } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          ...(captchaToken ? { captchaToken } : {})
        }
      });

      if (error) {
        throw error;
      }

      persistPendingEmailSignIn(normalizedEmail);
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "Sign-in code could not be sent. Check that this email is registered."
      );
      console.error("Supabase email sign-in failed:", error);

      if (mounted.current) {
        setSignInError(message);
      }

      throw new Error(message);
    } finally {
      if (mounted.current) {
        setSignInPending(false);
      }
    }
  }

  async function verifySignInCode(code: string) {
    const client = supabase.current;
    const normalizedEmail = pendingEmailSignIn?.trim().toLowerCase();
    const normalizedCode = code.replace(/\s+/g, "");

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    if (!normalizedEmail) {
      throw new Error("Send a sign-in code to your email first.");
    }

    if (!/^\d{6,8}$/.test(normalizedCode)) {
      throw new Error("Enter the code from your email.");
    }

    setSignInPending(true);
    setSignInError(null);

    try {
      const { error } = await client.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "email"
      });

      if (error) {
        throw error;
      }

      persistPendingEmailSignIn(null);

      const { data: userData } = await client.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        await reloadDiaryForUser(userId);
      }

      await refreshAccountProfile();
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "That code could not be verified. Request a fresh one and try again."
      );
      console.error("Supabase sign-in OTP verification failed:", error);

      if (mounted.current) {
        setSignInError(message);
      }

      throw new Error(message);
    } finally {
      if (mounted.current) {
        setSignInPending(false);
      }
    }
  }

  async function resendSignInCode() {
    const client = supabase.current;
    const normalizedEmail = pendingEmailSignIn?.trim().toLowerCase();

    if (!client) {
      throw new Error("Supabase guest sync is not configured.");
    }

    if (!normalizedEmail) {
      throw new Error("Enter an email address first.");
    }

    setSignInPending(true);
    setSignInError(null);

    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: normalizedEmail
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "A fresh code could not be sent. Try again shortly."
      );
      console.error("Supabase sign-in OTP resend failed:", error);

      if (mounted.current) {
        setSignInError(message);
      }

      throw new Error(message);
    } finally {
      if (mounted.current) {
        setSignInPending(false);
      }
    }
  }

  function cancelEmailSignIn() {
    persistPendingEmailSignIn(null);
    setSignInError(null);
  }

  async function reloadDiaryForUser(userId: string) {
    const client = supabase.current;

    if (!client) {
      return;
    }

    try {
      const localStore = store ?? createEmptyStore();
      const remoteStore = await fetchGuestDiaryStore(client, userId);
      const merged = mergeStores(localStore, remoteStore, userId);

      syncMeta.current.guestId = userId;
      syncMeta.current.lastPersistedSnapshot = remoteStore
        ? serializeStore(normalizeStoreForGuest(remoteStore, userId))
        : "";
      syncMeta.current.readyForRemoteWrite = true;

      if (!mounted.current) {
        return;
      }

      setStore(merged);
      setSyncError(null);
      setSyncState(remoteStore ? "synced" : "syncing");
      await refreshCredits(userId);
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      setSyncState("error");
      setSyncError(
        error instanceof Error ? error.message : "Could not load your diary."
      );
    }
  }

  function persistPendingEmailSignIn(email: string | null) {
    const normalizedEmail = email?.trim().toLowerCase() || null;
    setPendingEmailSignIn(normalizedEmail);

    if (normalizedEmail) {
      window.localStorage.setItem(PENDING_EMAIL_SIGNIN_KEY, normalizedEmail);
      return;
    }

    window.localStorage.removeItem(PENDING_EMAIL_SIGNIN_KEY);
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

      if (result.creditsRemaining !== undefined) {
        setCreditsRemaining(result.creditsRemaining);
      }

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

  function persistPendingEmailUpgrade(email: string | null) {
    const normalizedEmail = email?.trim().toLowerCase() || null;

    setPendingEmailUpgrade(normalizedEmail);

    if (normalizedEmail) {
      window.localStorage.setItem(PENDING_EMAIL_UPGRADE_KEY, normalizedEmail);
      return;
    }

    window.localStorage.removeItem(PENDING_EMAIL_UPGRADE_KEY);
  }

  return (
    <DiaryContext.Provider
      value={{
        ready,
        accountEmail,
        accountProviders,
        accountStatus,
        cloudEnabled: Boolean(syncMeta.current.readyForRemoteWrite),
        creditsRemaining,
        guestId: store?.guestId ?? null,
        syncError,
        syncState,
        upgradeError,
        upgradePending,
        pendingEmailUpgrade,
        signInError,
        signInPending,
        pendingEmailSignIn,
        entries: store?.entries ?? [],
        getEntry,
        saveEntry,
        deleteEntry,
        retryArt,
        clearAll,
        upgradeWithEmail,
        verifyEmailUpgradeCode,
        resendEmailUpgradeCode,
        cancelEmailUpgrade,
        upgradeWithGoogle,
        signInWithGoogle,
        signInWithEmail,
        verifySignInCode,
        resendSignInCode,
        cancelEmailSignIn
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
