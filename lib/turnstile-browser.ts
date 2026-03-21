"use client";

import {
  type MutableRefObject,
  useEffect,
  useRef,
  useState
} from "react";

const TURNSTILE_SCRIPT_ID = "yumoo-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

type TurnstileWidgetId = string;

type TurnstileRenderOptions = {
  action?: string;
  appearance?: "always" | "execute" | "interaction-only";
  callback?: (token: string) => void;
  "error-callback"?: (code?: string) => void;
  execution?: "execute" | "render";
  "expired-callback"?: () => void;
  sitekey: string;
  size?: "compact" | "flexible" | "invisible" | "normal";
};

type TurnstileApi = {
  execute: (widgetId: TurnstileWidgetId) => void;
  remove?: (widgetId: TurnstileWidgetId) => void;
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions
  ) => TurnstileWidgetId;
  reset?: (widgetId: TurnstileWidgetId) => void;
};

type PendingTokenRequest = {
  reject: (error: Error) => void;
  resolve: (token: string) => void;
  timeoutId: number;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile only runs in the browser."));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      TURNSTILE_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" || window.turnstile) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), {
        once: true
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Cloudflare Turnstile could not load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Cloudflare Turnstile could not load."));
    };

    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

function finishPendingRequest(
  pendingRef: MutableRefObject<PendingTokenRequest | null>,
  resolver: (request: PendingTokenRequest) => void
) {
  const pending = pendingRef.current;

  if (!pending) {
    return;
  }

  window.clearTimeout(pending.timeoutId);
  pendingRef.current = null;
  resolver(pending);
}

export function isTurnstileConfigured() {
  return Boolean(turnstileSiteKey);
}

export function useTurnstileToken(action = "guest_signin") {
  const configured = isTurnstileConfigured();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const pendingRef = useRef<PendingTokenRequest | null>(null);
  const [ready, setReady] = useState(!configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      setError(null);
      return;
    }

    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled) {
          return;
        }

        setReady(true);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setReady(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Cloudflare Turnstile could not load."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  useEffect(() => {
    if (
      !configured ||
      !ready ||
      !turnstileSiteKey ||
      !containerRef.current ||
      widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      action,
      appearance: "interaction-only",
      callback(token) {
        finishPendingRequest(pendingRef, (pending) => {
          pending.resolve(token);
        });
      },
      "error-callback": () => {
        finishPendingRequest(pendingRef, (pending) => {
          pending.reject(new Error("Turnstile verification failed."));
        });
      },
      execution: "execute",
      "expired-callback": () => {
        finishPendingRequest(pendingRef, (pending) => {
          pending.reject(new Error("Turnstile verification expired."));
        });
      },
      sitekey: turnstileSiteKey,
      size: "invisible"
    });

    return () => {
      finishPendingRequest(pendingRef, (pending) => {
        pending.reject(new Error("Turnstile was reset."));
      });

      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = null;
    };
  }, [action, configured, ready]);

  async function getToken() {
    if (!configured) {
      return null;
    }

    if (error) {
      throw new Error(error);
    }

    if (!ready || !window.turnstile || !widgetIdRef.current) {
      throw new Error("Turnstile is still loading. Try again in a moment.");
    }

    finishPendingRequest(pendingRef, (pending) => {
      pending.reject(new Error("Turnstile request was replaced."));
    });

    return new Promise<string>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        finishPendingRequest(pendingRef, (pending) => {
          pending.reject(
            new Error("Turnstile verification timed out. Try again.")
          );
        });
      }, 12000);

      pendingRef.current = {
        reject,
        resolve,
        timeoutId
      };

      try {
        const api = window.turnstile;

        if (!api) {
          throw new Error("Turnstile is no longer available.");
        }

        api.reset?.(widgetIdRef.current!);
        api.execute(widgetIdRef.current!);
      } catch (executeError) {
        finishPendingRequest(pendingRef, (pending) => {
          pending.reject(
            executeError instanceof Error
              ? executeError
              : new Error("Turnstile verification could not start.")
          );
        });
      }
    });
  }

  return {
    configured,
    containerRef,
    error,
    getToken,
    ready
  };
}
