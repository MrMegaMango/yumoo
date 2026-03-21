"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Card, Tag, buttonClasses } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CallbackStatus = "working" | "success" | "error";
type CallbackMode = "upgrade" | "signin";

const CALLBACK_TIMEOUT_MS = 5000;
const CALLBACK_POLL_MS = 250;

function getAuthErrorFromLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
  );

  return (
    hash.get("error_description") ??
    search.get("error_description") ??
    hash.get("error") ??
    search.get("error")
  );
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>("working");
  const [message, setMessage] = useState("Finishing up.");
  const [callbackMode, setCallbackMode] = useState<CallbackMode>("upgrade");
  const [upgradeMethod, setUpgradeMethod] = useState<"email" | "google" | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let cancelled = false;
    let redirectTimerId: number | null = null;

    async function finishAuthRedirect() {
      const params = new URLSearchParams(window.location.search);
      const upgradeParam = params.get("upgrade");
      const signinParam = params.get("signin");
      const mode: CallbackMode = signinParam ? "signin" : "upgrade";
      const parsedMethod =
        upgradeParam === "email" || upgradeParam === "google" ? upgradeParam
        : signinParam === "google" ? "google"
        : null;

      setCallbackMode(mode);
      setUpgradeMethod(parsedMethod);
      setMessage(
        mode === "signin"
          ? "Signing you in to your existing account."
          : "Finishing the account upgrade for this diary."
      );

      if (!client) {
        setStatus("error");
        setMessage("Supabase auth is not configured for this app.");
        return;
      }

      try {
        const locationError = getAuthErrorFromLocation();

        if (locationError) {
          throw new Error(locationError);
        }

        const { error: initializeError } = await client.auth.initialize();

        if (initializeError) {
          throw initializeError;
        }

        const startedAt = Date.now();

        while (!cancelled && Date.now() - startedAt < CALLBACK_TIMEOUT_MS) {
          const { data, error } = await client.auth.getUser();

          if (error) {
            throw error;
          }

          if (data.user && !data.user.is_anonymous) {
            if (cancelled) {
              return;
            }

            if (mode === "signin") {
              setStatus("success");
              setMessage("Welcome back. Sending you to settings.");

              redirectTimerId = window.setTimeout(() => {
                router.replace("/settings?signin=success&method=google");
              }, 900);
            } else {
              setStatus("success");
              setMessage(
                parsedMethod === "email"
                  ? "Email confirmed. This diary is now attached to your saved account."
                  : parsedMethod === "google"
                    ? "Google is now linked. Sending you back to settings."
                    : "This diary is now attached to your saved account."
              );

              const redirectParams = new URLSearchParams({ upgrade: "success" });

              if (parsedMethod === "email" || parsedMethod === "google") {
                redirectParams.set("method", parsedMethod);
              }

              redirectTimerId = window.setTimeout(() => {
                router.replace(`/settings?${redirectParams.toString()}`);
              }, 900);
            }

            return;
          }

          await new Promise((resolve) => {
            window.setTimeout(resolve, CALLBACK_POLL_MS);
          });
        }

        throw new Error(
          mode === "signin"
            ? "The redirect finished but sign-in could not be confirmed. Head back to settings and try again."
            : "The redirect finished, but this browser is still on an anonymous session. Head back to settings and try again."
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : mode === "signin"
              ? "Sign-in could not be completed."
              : "The account upgrade could not be completed."
        );
      }
    }

    void finishAuthRedirect();

    return () => {
      cancelled = true;

      if (redirectTimerId) {
        window.clearTimeout(redirectTimerId);
      }
    };
  }, [router]);

  const subtitle =
    callbackMode === "signin"
      ? "Loading your saved diary."
      : upgradeMethod === "email"
        ? "Confirming your email and attaching it to this same diary."
        : upgradeMethod === "google"
          ? "Finishing the Google link for this same diary."
          : "Finishing your account upgrade.";

  return (
    <AppShell
      title={callbackMode === "signin" ? "Signing in" : "Almost there"}
      subtitle={subtitle}
      showFab={false}
    >
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">
            {callbackMode === "signin" ? "Sign-in status" : "Upgrade status"}
          </h2>
          <Tag active={status !== "error"}>
            {status === "working"
              ? "Working"
              : status === "success"
                ? "Done"
                : "Issue"}
          </Tag>
        </div>
        <p className="text-sm leading-6 text-cocoa">{message}</p>
        {status === "working" ? (
          <p className="text-sm leading-6 text-cocoa">
            Keep this tab open for a moment. Yumoo will send you back to settings automatically.
          </p>
        ) : null}
        {status === "error" ? (
          <Link href="/settings" className={buttonClasses("primary", "w-full")}>
            Back to settings
          </Link>
        ) : null}
        {status === "success" ? (
          <Link href="/settings" className={buttonClasses("secondary", "w-full")}>
            Go now
          </Link>
        ) : null}
      </Card>
    </AppShell>
  );
}
