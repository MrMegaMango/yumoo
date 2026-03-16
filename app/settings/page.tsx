"use client";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Button, Card, Tag } from "@/components/ui";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SettingsPage() {
  const { entries, clearAll } = useDiary();

  function handleClear() {
    if (!window.confirm("Clear all meals saved on this device?")) {
      return;
    }

    clearAll();
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Keep your diary private, easy to revisit, and simple to manage."
    >
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">This device</h2>
          <Tag active>Private</Tag>
        </div>
        <p className="text-sm leading-6 text-cocoa">
          Your meals are currently saved only on this device.
        </p>
        <p className="text-sm leading-6 text-cocoa">
          If you want to keep your diary across devices later, this is where that option will live.
        </p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Save my diary</h2>
          <Tag active={supabaseConfigured}>{supabaseConfigured ? "Ready" : "Soon"}</Tag>
        </div>
        <div className="grid gap-3">
          <Button disabled={!supabaseConfigured}>Continue with Google</Button>
          <Button variant="secondary" disabled={!supabaseConfigured}>
            Email me a sign-in link
          </Button>
        </div>
        <p className="text-sm leading-6 text-cocoa">
          These options will let you keep your diary with you instead of leaving it on one device.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Privacy</h2>
        <p className="text-sm leading-6 text-cocoa">
          Your food photos are meant to feel personal first. You can keep this diary quiet and just
          for you.
        </p>
        <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
          {entries.length} saved meals are currently on this device.
        </div>
        <Button variant="danger" onClick={handleClear}>
          Clear local diary
        </Button>
      </Card>
    </AppShell>
  );
}
