"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Button, Card, Tag } from "@/components/ui";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

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
  const [emailCode, setEmailCode] = useState("");
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [upgradeAction, setUpgradeAction] = useState<
    "google" | "send-email" | "verify-email" | "resend-email" | null
  >(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<
    "account" | "email" | "google" | null
  >(null);
  const [accountMode, setAccountMode] = useState<"upgrade" | "signin">("upgrade");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInCode, setSignInCode] = useState("");
  const [signInNotice, setSignInNotice] = useState<string | null>(null);
  const [signInAction, setSignInAction] = useState<
    "google" | "send-email" | "verify-code" | "resend" | null
  >(null);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const [topupPending, setTopupPending] = useState<"10" | "50" | null>(null);
  const [topupSuccess, setTopupSuccess] = useState<number | null>(null);
  const [tipPending, setTipPending] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralPending, setReferralPending] = useState(false);
  const {
    accountEmail,
    accountProviders,
    accountStatus,
    clearAll,
    cloudEnabled,
    creditsRemaining,
    entries,
    guestId,
    pendingEmailUpgrade,
    pendingEmailSignIn,
    ready,
    syncError,
    syncState,
    cancelEmailUpgrade,
    resendEmailUpgradeCode,
    upgradeError,
    upgradePending,
    upgradeWithEmail,
    upgradeWithGoogle,
    verifyEmailUpgradeCode,
    signInError,
    signInPending,
    signInWithGoogle,
    signInWithEmail,
    verifySignInCode,
    resendSignInCode,
    cancelEmailSignIn
  } = useDiary();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("upgrade") === "success") {
      const method = params.get("method");
      setUpgradeSuccess(
        method === "email" || method === "google" ? method : "account"
      );
    }

    if (params.get("signin") === "success") {
      setSignInSuccess(true);
    }

    if (params.get("topup") === "success") {
      const credits = parseInt(params.get("credits") ?? "", 10);
      setTopupSuccess(Number.isFinite(credits) && credits > 0 ? credits : 0);
    }

    if (params.get("tip") === "success") {
      setTipSuccess(true);
    }
  }, []);

  useEffect(() => {
    if (!pendingEmailUpgrade) {
      setEmailCode("");
      return;
    }

    setEmail(pendingEmailUpgrade);
  }, [pendingEmailUpgrade]);

  useEffect(() => {
    if (!pendingEmailSignIn) {
      setSignInCode("");
      return;
    }

    setSignInEmail(pendingEmailSignIn);
    setAccountMode("signin");
  }, [pendingEmailSignIn]);

  useEffect(() => {
    if (accountStatus !== "user") {
      return;
    }

    setEmail("");
    setEmailCode("");
    setEmailNotice(null);
  }, [accountStatus]);

  async function handleGoogleSignIn() {
    setSignInNotice(null);
    setSignInAction("google");

    try {
      await signInWithGoogle();
    } catch {
      return;
    } finally {
      setSignInAction(null);
    }
  }

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignInNotice(null);
    setSignInAction("send-email");

    try {
      await signInWithEmail(signInEmail);
      setSignInNotice(
        `We sent a 6-digit code to ${signInEmail.trim().toLowerCase()}. Enter it below to sign in.`
      );
    } catch {
      return;
    } finally {
      setSignInAction(null);
    }
  }

  async function handleVerifySignInCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignInNotice(null);
    setSignInAction("verify-code");

    try {
      await verifySignInCode(signInCode);
      setSignInCode("");
    } catch {
      return;
    } finally {
      setSignInAction(null);
    }
  }

  async function handleResendSignInCode() {
    setSignInNotice(null);
    setSignInAction("resend");

    try {
      await resendSignInCode();
      if (pendingEmailSignIn) {
        setSignInNotice(`A fresh 6-digit code is on the way to ${pendingEmailSignIn}.`);
      }
    } catch {
      return;
    } finally {
      setSignInAction(null);
    }
  }

  async function handleTopUp(pkg: "10" | "50") {
    setTopupPending(pkg);

    try {
      const client = getSupabaseBrowserClient();
      const accessToken = client
        ? (await client.auth.getSession()).data.session?.access_token
        : null;

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ package: pkg })
      });

      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Could not start checkout.");
      }

      window.location.href = body.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setTopupPending(null);
    }
  }

  async function handleTip() {
    setTipPending(true);

    try {
      const response = await fetch("/api/stripe/tip", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Could not start checkout.");
      }

      window.location.href = body.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setTipPending(false);
    }
  }

  async function handleCopyReferralLink() {
    setReferralPending(true);

    try {
      let link = referralLink;

      if (!link) {
        const client = getSupabaseBrowserClient();
        const accessToken = client
          ? (await client.auth.getSession()).data.session?.access_token
          : null;

        const response = await fetch("/api/referral/code", {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}
        });

        if (!response.ok) {
          throw new Error("Could not fetch referral code.");
        }

        const body = (await response.json()) as { code?: string };

        if (!body.code) {
          throw new Error("No referral code returned.");
        }

        link = `${window.location.origin}/?ref=${body.code}`;
        setReferralLink(link);
      }

      await navigator.clipboard.writeText(link);
      setReferralCopied(true);
      window.setTimeout(() => setReferralCopied(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not copy link.");
    } finally {
      setReferralPending(false);
    }
  }

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
    setUpgradeAction("google");

    try {
      await upgradeWithGoogle();
    } catch {
      return;
    } finally {
      setUpgradeAction(null);
    }
  }

  async function handleEmailUpgrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailNotice(null);
    setUpgradeAction("send-email");

    try {
      await upgradeWithEmail(email);
      setEmailNotice(
        `We sent a 6-digit code to ${email.trim().toLowerCase()}. Enter it below to save this diary as an account.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("already been registered") || message.toLowerCase().includes("already registered")) {
        setAccountMode("signin");
        setUpgradeAction(null);
        setSignInAction("send-email");
        try {
          await signInWithEmail(email);
          setSignInNotice(`We sent a sign-in code to ${email.trim().toLowerCase()}.`);
        } catch {
          // signInError will show in sign-in panel
        } finally {
          setSignInAction(null);
        }
        return;
      }
      return;
    } finally {
      setUpgradeAction(null);
    }
  }

  async function handleVerifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailNotice(null);
    setUpgradeAction("verify-email");

    try {
      await verifyEmailUpgradeCode(emailCode);
      setUpgradeSuccess("email");
      setEmailCode("");
    } catch {
      return;
    } finally {
      setUpgradeAction(null);
    }
  }

  async function handleResendEmailCode() {
    setEmailNotice(null);
    setUpgradeAction("resend-email");

    try {
      await resendEmailUpgradeCode();
      if (pendingEmailUpgrade) {
        setEmailNotice(`A fresh 6-digit code is on the way to ${pendingEmailUpgrade}.`);
      }
    } catch {
      return;
    } finally {
      setUpgradeAction(null);
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
      showFab={false}
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

      {signInSuccess ? (
        <Card className="space-y-2 border-[#D9EAD4] bg-[#F7FFF4]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Welcome back</h2>
            <Tag active>Signed in</Tag>
          </div>
          <p className="text-sm leading-6 text-cocoa">Your saved diary is loading.</p>
        </Card>
      ) : null}

      {tipSuccess ? (
        <Card className="space-y-2 border-[#D9EAD4] bg-[#F7FFF4]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Thank you</h2>
            <Tag active>Received</Tag>
          </div>
          <p className="text-sm leading-6 text-cocoa">
            Your support means a lot. Enjoy Yumoo!
          </p>
        </Card>
      ) : null}

      {topupSuccess !== null ? (
        <Card className="space-y-2 border-[#D9EAD4] bg-[#F7FFF4]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Credits added</h2>
            <Tag active>Done</Tag>
          </div>
          <p className="text-sm leading-6 text-cocoa">
            {topupSuccess > 0
              ? `${topupSuccess} credits have been added to your account.`
              : "Your credits have been topped up."}
          </p>
        </Card>
      ) : null}

      {syncError ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Cloud sync</h2>
            <Tag>Issue</Tag>
          </div>
          <div className="rounded-[24px] border border-[#E8BCB7] bg-[#FFF3F1] p-4 text-sm leading-6 text-[#8F403E]">
            {syncError}
          </div>
        </Card>
      ) : null}

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
              <div>Email: <span className="font-semibold text-ink">{accountEmail ?? "Not exposed by provider"}</span></div>
              <div className="mt-2">
                Art credits:{" "}
                <span className="font-semibold text-ink">
                  {creditsRemaining === null ? "…" : creditsRemaining}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
              Art credits:{" "}
              <span className="font-semibold text-ink">
                {creditsRemaining === null ? "…" : creditsRemaining}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className={`text-sm font-semibold ${accountMode === "upgrade" ? "text-ink" : "text-cocoa"}`}
                onClick={() => setAccountMode("upgrade")}
              >
                New account
              </button>
              <span className="text-sm text-cocoa">/</span>
              <button
                className={`text-sm font-semibold ${accountMode === "signin" ? "text-ink" : "text-cocoa"}`}
                onClick={() => setAccountMode("signin")}
              >
                Sign in
              </button>
            </div>

            {accountMode === "upgrade" ? (
              <>
                <p className="text-sm leading-6 text-cocoa">
                  Upgrade this anonymous diary without losing its entries. The same synced row stays in
                  place, but it becomes tied to Google or a verified email code instead of a guest-only session.
                </p>
                <div className="grid gap-3">
                  <Button onClick={handleGoogleUpgrade} disabled={upgradePending}>
                    {upgradeAction === "google" ? "Opening Google…" : "Link Google"}
                  </Button>
                  {!pendingEmailUpgrade ? (
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
                        {upgradeAction === "send-email" ? "Sending code…" : "Send code"}
                      </Button>
                    </form>
                  ) : (
                    <div className="grid gap-3 rounded-[24px] bg-cream p-4">
                      <p className="text-sm leading-6 text-cocoa">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-semibold text-ink">{pendingEmailUpgrade}</span> to save
                        this diary as an account.
                      </p>
                      <form className="grid gap-3" onSubmit={handleVerifyEmailCode}>
                        <input
                          className="field"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="123456"
                          maxLength={6}
                          value={emailCode}
                          onChange={(event) =>
                            setEmailCode(event.target.value.replace(/\D+/g, "").slice(0, 6))
                          }
                          disabled={upgradePending}
                        />
                        <Button
                          variant="secondary"
                          type="submit"
                          disabled={upgradePending || emailCode.length !== 6}
                        >
                          {upgradeAction === "verify-email" ? "Verifying…" : "Verify code"}
                        </Button>
                      </form>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          variant="ghost"
                          onClick={handleResendEmailCode}
                          disabled={upgradePending}
                        >
                          {upgradeAction === "resend-email" ? "Sending again…" : "Resend code"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            cancelEmailUpgrade();
                            setEmailNotice(null);
                          }}
                          disabled={upgradePending}
                        >
                          Use another email
                        </Button>
                      </div>
                    </div>
                  )}
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
            ) : (
              <>
                <p className="text-sm leading-6 text-cocoa">
                  Already have a saved account? Sign in to load your diary on this device.
                </p>
                <div className="grid gap-3">
                  <Button onClick={handleGoogleSignIn} disabled={signInPending}>
                    {signInAction === "google" ? "Opening Google…" : "Sign in with Google"}
                  </Button>
                  {!pendingEmailSignIn ? (
                    <form className="grid gap-3" onSubmit={handleEmailSignIn}>
                      <input
                        className="field"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={signInEmail}
                        onChange={(event) => setSignInEmail(event.target.value)}
                        disabled={signInPending}
                      />
                      <Button
                        variant="secondary"
                        type="submit"
                        disabled={signInPending || !signInEmail.trim()}
                      >
                        {signInAction === "send-email" ? "Sending code…" : "Send code"}
                      </Button>
                    </form>
                  ) : (
                    <div className="grid gap-3 rounded-[24px] bg-cream p-4">
                      <p className="text-sm leading-6 text-cocoa">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-semibold text-ink">{pendingEmailSignIn}</span> to sign in.
                      </p>
                      <form className="grid gap-3" onSubmit={handleVerifySignInCode}>
                        <input
                          className="field"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="123456"
                          maxLength={8}
                          value={signInCode}
                          onChange={(event) =>
                            setSignInCode(event.target.value.replace(/\D+/g, "").slice(0, 8))
                          }
                          disabled={signInPending}
                        />
                        <Button
                          variant="secondary"
                          type="submit"
                          disabled={signInPending || signInCode.length < 6}
                        >
                          {signInAction === "verify-code" ? "Signing in…" : "Verify code"}
                        </Button>
                      </form>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          variant="ghost"
                          onClick={handleResendSignInCode}
                          disabled={signInPending}
                        >
                          {signInAction === "resend" ? "Sending again…" : "Resend code"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            cancelEmailSignIn();
                            setSignInNotice(null);
                          }}
                          disabled={signInPending}
                        >
                          Use another email
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {signInNotice ? (
                  <div className="rounded-[24px] border border-[#D9EAD4] bg-[#F7FFF4] p-4 text-sm leading-6 text-[#40624C]">
                    {signInNotice}
                  </div>
                ) : null}
                {signInError ? (
                  <div className="rounded-[24px] border border-[#E8BCB7] bg-[#FFF3F1] p-4 text-sm leading-6 text-[#8F403E]">
                    {signInError}
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </Card>

      {supabaseConfigured ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Get more credits</h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Top up</p>
            {accountStatus !== "user" ? (
              <p className="text-sm leading-6 text-cocoa">
                Save your account first to top up — anonymous sessions can expire and credits would be lost.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleTopUp("10")}
                  disabled={topupPending !== null}
                  variant="secondary"
                >
                  {topupPending === "10" ? "Opening…" : "10 credits — $1"}
                </Button>
                <Button
                  onClick={() => handleTopUp("50")}
                  disabled={topupPending !== null}
                  variant="secondary"
                >
                  {topupPending === "50" ? "Opening…" : "50 credits — $4"}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Tip jar</p>
            <p className="text-sm leading-6 text-cocoa">
              If Yumoo brings you joy, a tip goes a long way.
            </p>
            <Button variant="secondary" onClick={handleTip} disabled={tipPending}>
              {tipPending ? "Opening…" : "Send a tip"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Refer a friend</p>
            <p className="text-sm leading-6 text-cocoa">
              Share your link. When someone signs up using it, you get 10 credits.
            </p>
            <Button
              variant="secondary"
              onClick={handleCopyReferralLink}
              disabled={referralPending}
            >
              {referralPending ? "Fetching link…" : referralCopied ? "Copied!" : "Copy referral link"}
            </Button>
          </div>
        </Card>
      ) : null}

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

      <FeedbackCard prefillEmail={accountEmail} />
    </AppShell>
  );
}

function FeedbackCard({ prefillEmail }: { prefillEmail: string | null }) {
  const [feedbackEmail, setFeedbackEmail] = useState(prefillEmail ?? "");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (prefillEmail && !feedbackEmail) {
      setFeedbackEmail(prefillEmail);
    }
  }, [prefillEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: feedbackEmail, message: feedbackMessage }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }

      setFeedbackMessage("");
      setNotice({ type: "success", text: "Got it — check your inbox for a confirmation." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-ink">Feedback</h2>
      <p className="text-sm leading-6 text-cocoa">
        Found a bug or have a suggestion? Send it through and I'll confirm it landed.
      </p>
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <input
          className="field"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={feedbackEmail}
          onChange={(e) => setFeedbackEmail(e.target.value)}
          disabled={pending}
        />
        <textarea
          className="field min-h-[120px] resize-none"
          placeholder="What's on your mind?"
          maxLength={5000}
          value={feedbackMessage}
          onChange={(e) => setFeedbackMessage(e.target.value)}
          disabled={pending}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !feedbackEmail.trim() || !feedbackMessage.trim()}
        >
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </form>
      {notice ? (
        <div
          className={`rounded-[24px] border p-4 text-sm leading-6 ${
            notice.type === "success"
              ? "border-[#D9EAD4] bg-[#F7FFF4] text-[#40624C]"
              : "border-[#E8BCB7] bg-[#FFF3F1] text-[#8F403E]"
          }`}
        >
          {notice.text}
        </div>
      ) : null}
    </Card>
  );
}
