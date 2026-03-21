"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Button, Card, Tag } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase-browser";

function formatProvider(provider: string) {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "email") {
    return "Email";
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function SettingsPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<
    "account" | "email" | "google" | null
  >(null);
  const {
    accountEmail,
    accountProviders,
    accountStatus,
    clearAll,
    cloudEnabled,
    entries,
    guestId,
    ready,
    syncError,
    syncState,
    upgradeError,
    upgradePending,
    upgradeWithEmail,
    upgradeWithGoogle
  } = useDiary();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("upgrade") !== "success") {
      return;
    }

    const method = params.get("method");

    setUpgradeSuccess(
      method === "email" || method === "google" ? method : "account"
    );
  }, []);

  function handleClear() {
    let confirmationMessage = "Clear all meals saved on this device?";

    if (cloudEnabled && accountStatus === "user") {
      confirmationMessage =
        "Clear all meals from this device and the synced account diary?";
    } else if (cloudEnabled) {
      confirmationMessage =
        "Clear all meals from this device and the synced guest diary?";
    }

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    clearAll();
  }

  async function handleGoogleUpgrade() {
    setEmailNotice(null);

    try {
      await upgradeWithGoogle();
    } catch {
      return;
    }
  }

  async function handleEmailUpgrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailNotice(null);

    try {
      await upgradeWithEmail(email);
      setEmail("");
      setEmailNotice(
        "Check your inbox, confirm the email, and this same diary will come back as a saved account."
      );
    } catch {
      return;
    }
  }

  const accountTag =
    accountStatus === "user"
      ? "Saved"
      : supabaseConfigured
        ? "Guest"
        : "Soon";
  const successMessage =
    upgradeSuccess === "email"
      ? "Your email is now linked to this diary."
      : upgradeSuccess === "google"
        ? "Google is now linked to this diary."
        : upgradeSuccess === "account"
          ? "This diary is now attached to your saved account."
          : null;

  return (
    <AppShell
      title="Settings"
      subtitle="Keep your diary private, easy to revisit, and simple to manage."
    >
      {successMessage ? (
        <Card className="space-y-2 border-[#D9EAD4] bg-[#F7FFF4]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Account saved</h2>
            <Tag active>Ready</Tag>
          </div>
          <p className="text-sm leading-6 text-cocoa">{successMessage}</p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">This device</h2>
          <Tag active={!cloudEnabled}>Private</Tag>
        </div>
        <p className="text-sm leading-6 text-cocoa">
          {cloudEnabled
            ? "This browser keeps a local copy for speed, even while your diary syncs to Supabase."
            : "Your meals are currently saved only on this device."}
        </p>
        <p className="text-sm leading-6 text-cocoa">
          {cloudEnabled
            ? "If this device goes offline, your last synced diary is still waiting in the database."
            : "If you want to keep your diary across sessions more reliably, turn on guest cloud backup with Supabase."}
        </p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Cloud sync</h2>
          <Tag active={syncState === "synced"}>
            {syncState === "synced"
              ? "Synced"
              : syncState === "syncing"
                ? "Syncing"
                : syncState === "connecting"
                  ? "Connecting"
                  : syncState === "error"
                    ? "Issue"
                    : "Local only"}
          </Tag>
        </div>
        <p className="text-sm leading-6 text-cocoa">
          {supabaseConfigured
            ? accountStatus === "user"
              ? "This browser is signed in and syncing the same diary row that started as an anonymous guest."
              : "Yumoo signs this browser in anonymously and keeps one diary row in Postgres for the current guest."
            : "Add the Supabase URL, public key, and guest diary table to enable persistent guest storage."}
        </p>
        {ready && guestId && supabaseConfigured ? (
          <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
            {accountStatus === "user" ? "Account ID" : "Guest ID"}:{" "}
            <span className="font-semibold text-ink">{guestId.slice(0, 8)}…</span>
          </div>
        ) : null}
        {syncError ? (
          <div className="rounded-[24px] border border-[#E8BCB7] bg-[#FFF3F1] p-4 text-sm leading-6 text-[#8F403E]">
            {syncError}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Account</h2>
          <Tag active={accountStatus === "user"}>{accountTag}</Tag>
        </div>
        {!supabaseConfigured ? (
          <p className="text-sm leading-6 text-cocoa">
            Add Supabase auth first, then this guest diary can be upgraded into a saved account.
          </p>
        ) : accountStatus === "user" ? (
          <>
            <p className="text-sm leading-6 text-cocoa">
              This diary is already attached to a permanent account, so the same `user_id`
              keeps your synced meals.
            </p>
            <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
              <div>
                Email: <span className="font-semibold text-ink">{accountEmail ?? "Not exposed by provider"}</span>
              </div>
              {accountProviders.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {accountProviders.map((provider) => (
                    <Tag key={provider} active>
                      {formatProvider(provider)}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-cocoa">
              Upgrade this anonymous diary without losing its entries. The same synced row stays in
              place, but it becomes tied to Google or an email identity instead of a guest-only session.
            </p>
            <div className="grid gap-3">
              <Button onClick={handleGoogleUpgrade} disabled={upgradePending}>
                {upgradePending ? "Opening Google…" : "Link Google"}
              </Button>
              <form className="grid gap-3" onSubmit={handleEmailUpgrade}>
                <input
                  className="field"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={upgradePending}
                />
                <Button
                  variant="secondary"
                  type="submit"
                  disabled={upgradePending || !email.trim()}
                >
                  {upgradePending ? "Sending…" : "Link email"}
                </Button>
              </form>
            </div>
            {emailNotice ? (
              <div className="rounded-[24px] border border-[#D9EAD4] bg-[#F7FFF4] p-4 text-sm leading-6 text-[#40624C]">
                {emailNotice}
              </div>
            ) : null}
            {upgradeError ? (
              <div className="rounded-[24px] border border-[#E8BCB7] bg-[#FFF3F1] p-4 text-sm leading-6 text-[#8F403E]">
                {upgradeError}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Privacy</h2>
        <p className="text-sm leading-6 text-cocoa">
          Your food photos are meant to feel personal first. You can keep this diary quiet and just
          for you.
        </p>
        <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
          {entries.length} saved meals are currently{" "}
          {cloudEnabled
            ? accountStatus === "user"
              ? "cached on this device and mirrored to your account diary."
              : "cached on this device and mirrored to your guest diary."
            : "on this device."}
        </div>
        <Button variant="danger" onClick={handleClear}>
          {cloudEnabled
            ? accountStatus === "user"
              ? "Clear device + account diary"
              : "Clear device + guest diary"
            : "Clear local diary"}
        </Button>
      </Card>
    </AppShell>
  );
}
