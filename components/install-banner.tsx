"use client";

import { useEffect, useRef, useState } from "react";

type InstallState = "hidden" | "android" | "ios";

export function InstallBanner() {
  const [state, setState] = useState<InstallState>("hidden");
  const deferredPrompt = useRef<Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }>(null);

  useEffect(() => {
    // Already installed as a PWA — don't show.
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true
    ) return;

    if (localStorage.getItem("yumoo.installDismissed")) return;

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    // Safari but not Chrome/Firefox/Edge on iOS
    const isSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);

    if (isSafari) {
      setState("ios");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deferredPrompt.current = e as any;
      setState("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("yumoo.installDismissed", "1");
    setState("hidden");
  }

  async function install() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setState("hidden");
    } else {
      dismiss();
    }
  }

  if (state === "hidden") return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-[18px] border border-[#ECD5C4] bg-white/90 px-4 py-3 shadow-sm">
      <span className="mt-0.5 text-xl leading-none" aria-hidden>📲</span>
      <div className="flex-1 min-w-0">
        {state === "android" ? (
          <>
            <p className="text-sm font-semibold text-ink">Add Yumoo to your home screen</p>
            <p className="mt-0.5 text-xs text-cocoa/70">One tap — works offline too.</p>
            <button
              onClick={install}
              className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white"
            >
              Add to Home Screen
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">Add Yumoo to your home screen</p>
            <p className="mt-0.5 text-xs text-cocoa/70">
              Tap <strong>Share</strong> <span aria-hidden>⎙</span> then <strong>Add to Home Screen</strong>.
            </p>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="mt-0.5 text-cocoa/40 hover:text-cocoa"
      >
        ✕
      </button>
    </div>
  );
}
