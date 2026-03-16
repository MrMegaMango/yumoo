import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Card, buttonClasses } from "@/components/ui";

export default function AuthCallbackPage() {
  return (
    <AppShell
      title="Auth callback"
      subtitle="This route is reserved for Google OAuth and email OTP redirects."
      showFab={false}
    >
      <Card className="space-y-4">
        <p className="text-sm leading-6 text-cocoa">
          The visual diary works already in guest mode. Once Supabase auth is wired, this screen can
          exchange auth tokens and send the user back to the calendar.
        </p>
        <Link href="/settings" className={buttonClasses("primary", "w-full")}>
          Back to settings
        </Link>
      </Card>
    </AppShell>
  );
}

