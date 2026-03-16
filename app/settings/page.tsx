"use client";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Button, Card, Tag } from "@/components/ui";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SettingsPage() {
  const { guestId, entries, clearAll } = useDiary();

  function handleClear() {
    if (!window.confirm("Clear all locally saved diary entries?")) {
      return;
    }

    clearAll();
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Keep the account layer simple. Guest mode first, upgrades later."
    >
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Current mode</h2>
          <Tag active>Guest</Tag>
        </div>
        <p className="text-sm leading-6 text-cocoa">
          Entries are currently stored on this device. Guest id:{" "}
          <span className="font-medium text-ink">{guestId?.slice(0, 8)}</span>
        </p>
        <p className="text-sm leading-6 text-cocoa">
          When Supabase is configured, this page is the right place to add anonymous auth, Google
          sign-in, and email OTP upgrade prompts.
        </p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Sign-in options</h2>
          <Tag active={supabaseConfigured}>{supabaseConfigured ? "Configured" : "Pending"}</Tag>
        </div>
        <div className="grid gap-3">
          <Button disabled={!supabaseConfigured}>Continue with Google</Button>
          <Button variant="secondary" disabled={!supabaseConfigured}>
            Email me a magic link
          </Button>
        </div>
        <p className="text-sm leading-6 text-cocoa">
          Add your Supabase URL and anon key in `.env.local` to start wiring these actions.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Privacy and storage</h2>
        <p className="text-sm leading-6 text-cocoa">
          Original photos should live in private object storage for production. This scaffold uses
          compressed local data URLs so the diary loop works before backend setup.
        </p>
        <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
          {entries.length} saved meals currently live on this device.
        </div>
        <Button variant="danger" onClick={handleClear}>
          Clear local diary
        </Button>
      </Card>
    </AppShell>
  );
}

